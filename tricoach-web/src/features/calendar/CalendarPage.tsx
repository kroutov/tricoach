import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
  type ScreenReaderInstructions,
} from '@dnd-kit/core';
import { getActivePlan } from '../../api/plans';
import { rescheduleWorkout } from '../../api/workouts';
import { currentMicrocycle, findWorkoutWithMicrocycle, planDateRange, workoutsOnDay } from '../../lib/plan';
import { isSameDay, parseApiDate, toDayString } from '../../lib/dateOnly';
import { sportTypeLabel, workoutIntensityColorVar, workoutIntensityLabel } from '../../lib/enumLabels';
import { PillBadge } from '../../components/PillBadge';
import { Modal } from '../../components/Modal';
import type { Workout } from '../../api/types';

const narrowWeekdayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'narrow' });
const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable: `
    Pour saisir une séance, appuyez sur la barre d'espace.
    Utilisez les flèches gauche et droite pour la déplacer vers un autre jour de la semaine.
    Appuyez de nouveau sur espace pour la déposer, ou sur Échap pour annuler.
    Un chemin sans glisser-déposer existe aussi : ouvrez la séance puis "Déplacer cette séance".
  `,
};

const dragAnnouncements: Announcements = {
  onDragStart: ({ active }) => `Séance ${active.id} saisie.`,
  onDragOver: ({ over }) => (over ? `Séance déplacée au-dessus du ${over.id}.` : ''),
  onDragEnd: ({ active, over }) => (over ? `Séance ${active.id} déposée sur le ${over.id}.` : `Déplacement annulé.`),
  onDragCancel: () => 'Déplacement annulé.',
};

/**
 * `pointerWithin` alone (chosen to fix a wide-row-overlaps-several-days bug
 * for pointer drags) has no pointer coordinates to check during a
 * *keyboard*-driven drag, so it never reports a collision there and the
 * drop silently no-ops. Falling back to `rectIntersection` — dnd-kit's own
 * documented pattern for combining strategies — covers the keyboard case,
 * where the coordinate getter above already jumps to a day pill's exact rect.
 */
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
};

/** Monday-first week (matches the "jours disponibles" ordering used throughout onboarding). */
function weekDatesFor(date: Date): Date[] {
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** Drop target for drag & drop rescheduling — also the existing day-select button. */
function DayPill({
  date,
  isSelected,
  hasWorkout,
  onSelect,
}: {
  date: Date;
  isSelected: boolean;
  hasWorkout: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: toDayString(date) });
  const label = `${fullDateFormatter.format(date)}${hasWorkout ? ', séance planifiée' : ', journée de repos'}`;
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      aria-current={isSelected ? 'date' : undefined}
      aria-label={label}
      className={`flex flex-1 flex-col items-center gap-1 rounded-control py-2 ${
        isOver ? 'bg-brand/30 text-brand' : isSelected ? 'bg-brand/15 text-brand' : 'text-primary-text'
      }`}
    >
      <span aria-hidden="true" className="text-xs">
        {narrowWeekdayFormatter.format(date)}
      </span>
      <span aria-hidden="true" className="font-semibold">
        {date.getDate()}
      </span>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${hasWorkout ? 'bg-brand' : 'bg-transparent'}`} />
    </button>
  );
}

/** Drag source — a plain click still navigates (PointerSensor's distance activation constraint lets clicks through). */
function DraggableWorkoutRow({ workout }: { workout: Workout }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: workout.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, position: 'relative' as const, zIndex: 10 } : undefined;

  return (
    <Link
      ref={setNodeRef}
      to={`/workouts/${workout.id}`}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center justify-between rounded-control bg-card-background p-3 ${workout.status === 'skipped' ? 'opacity-50' : ''} ${isDragging ? 'opacity-70 shadow-lg' : ''}`}
    >
      <div>
        <p className={`font-medium text-primary-text ${workout.status === 'skipped' ? 'line-through' : ''}`}>
          {workout.title}
          {workout.status === 'completed' && <span className="sr-only"> (complétée)</span>}
          {workout.status === 'skipped' && <span className="sr-only"> (ratée)</span>}
        </p>
        <p className="text-xs text-secondary-text">
          {sportTypeLabel[workout.sport]} · {workout.plannedDurationMin} min
          {workout.estimatedTSS ? ` · ${Math.round(workout.estimatedTSS)} TSS` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <PillBadge text={workoutIntensityLabel[workout.intensity]} tint={workoutIntensityColorVar[workout.intensity]} />
        {workout.status === 'completed' && (
          <span aria-hidden="true" className="text-intensity-easy">
            ✓
          </span>
        )}
      </div>
    </Link>
  );
}

export function CalendarPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const { data: plan, isLoading } = useQuery({ queryKey: ['plans', 'active'], queryFn: getActivePlan });
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Jumps to the next/previous day pill's exact position instead of the
   * default fixed-pixel nudge — with only 7 fixed drop targets in a row, a
   * fixed-distance step would need a variable, hard-to-predict number of
   * presses to land on a given day, and could stop between two pills.
   *
   * `currentCoordinates` only matches a day pill's own position from the
   * *second* keypress onward — the very first press still reflects the
   * dragged workout row's own position (a full-width card well below and
   * left of the pill row), which isn't close to any pill. That first press
   * falls back to the workout's actual scheduled day instead of whichever
   * pill happens to be geometrically nearest an unrelated position.
   */
  const dayRowCoordinateGetter: KeyboardCoordinateGetter = (event, { context, currentCoordinates, active }) => {
    if (event.code !== 'ArrowRight' && event.code !== 'ArrowLeft') return undefined;

    const rects = Array.from(context.droppableRects.entries())
      .map(([id, rect]) => ({ id: String(id), rect }))
      .sort((a, b) => a.rect.left - b.rect.left);
    if (rects.length === 0) return undefined;

    let index = -1;
    let minDistance = Infinity;
    rects.forEach((r, i) => {
      const dx = r.rect.left - currentCoordinates.x;
      const dy = r.rect.top - currentCoordinates.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < minDistance) {
        minDistance = distance;
        index = i;
      }
    });

    if (minDistance > 40) {
      const found = plan ? findWorkoutWithMicrocycle(plan, String(active)) : undefined;
      const currentDayId = found ? toDayString(parseApiDate(found.workout.date)) : undefined;
      const matchIndex = currentDayId ? rects.findIndex((r) => r.id === currentDayId) : -1;
      if (matchIndex !== -1) index = matchIndex;
    }

    index = event.code === 'ArrowRight' ? Math.min(rects.length - 1, index + 1) : Math.max(0, index - 1);

    event.preventDefault();
    return { x: rects[index].rect.left, y: rects[index].rect.top };
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: dayRowCoordinateGetter })
  );

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => rescheduleWorkout(id, date),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['plans', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      if (response.conflicts.length > 0) {
        setConflictMessage(response.conflicts.join('\n'));
      }
    },
    onError: () => setErrorMessage('Impossible de déplacer la séance.'),
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !plan) return;
    const found = findWorkoutWithMicrocycle(plan, active.id as string);
    if (!found) return;
    const currentDay = toDayString(parseApiDate(found.workout.date));
    const targetDay = over.id as string;
    if (currentDay === targetDay) return;
    setErrorMessage(null);
    rescheduleMutation.mutate({ id: found.workout.id, date: targetDay });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-secondary-text">Chargement…</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="mx-auto max-w-xl p-4 text-center">
        <p className="mt-12 text-lg font-semibold text-primary-text">Aucun plan actif</p>
      </div>
    );
  }

  const dates = weekDatesFor(selectedDate);
  const dayWorkouts = [...workoutsOnDay(plan, selectedDate)].sort((a, b) => a.date.localeCompare(b.date));
  const microcycle = currentMicrocycle(plan, selectedDate);
  const range = planDateRange(plan);
  const canGoPrevious = !range || toDayString(dates[0]) > toDayString(range.start);
  const canGoNext = !range || toDayString(dates[6]) < toDayString(range.end);

  const shiftWeek = (deltaDays: number) => {
    setSelectedDate((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + deltaDays);
      return next;
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragEnd={handleDragEnd}
      accessibility={{ screenReaderInstructions, announcements: dragAnnouncements }}
    >
      <div className="mx-auto max-w-2xl p-4">
        <h1 className="mb-3 text-xl font-bold text-primary-text">Calendrier</h1>
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftWeek(-7)}
            disabled={!canGoPrevious}
            aria-label="Semaine précédente"
            className="rounded-control px-3 py-1 text-primary-text disabled:opacity-30"
          >
            ‹
          </button>
          <button type="button" onClick={() => setSelectedDate(new Date())} className="text-sm font-medium text-brand">
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(7)}
            disabled={!canGoNext}
            aria-label="Semaine suivante"
            className="rounded-control px-3 py-1 text-primary-text disabled:opacity-30"
          >
            ›
          </button>
        </div>
        <div className="flex gap-1.5">
          {dates.map((date) => (
            <DayPill
              key={date.toISOString()}
              date={date}
              isSelected={isSameDay(date, selectedDate)}
              hasWorkout={workoutsOnDay(plan, date).length > 0}
              onSelect={() => setSelectedDate(date)}
            />
          ))}
        </div>

        {microcycle && (
          <div className={`mt-3 flex items-center justify-between rounded-control px-3 py-2 text-sm ${microcycle.isRecoveryWeek ? 'bg-intensity-easy/10' : ''}`}>
            <span className="font-medium text-primary-text">
              Semaine {microcycle.weekNumber}
              {microcycle.isRecoveryWeek ? ' · allégée' : ''}
            </span>
            <span className="text-secondary-text">{Math.round(microcycle.plannedLoad ?? 0)} TSS planifiés</span>
          </div>
        )}

        {dayWorkouts.length === 0 ? (
          <p className="mt-12 text-center text-secondary-text">Journée de repos — aucune séance planifiée ce jour.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {dayWorkouts.map((workout) => (
              <DraggableWorkoutRow key={workout.id} workout={workout} />
            ))}
          </div>
        )}

        {errorMessage && <p className="mt-2 text-center text-xs text-intensity-hard">{errorMessage}</p>}
      </div>

      {conflictMessage && (
        <Modal title="Conflit détecté" onClose={() => setConflictMessage(null)}>
          <p className="whitespace-pre-line text-sm text-secondary-text">{conflictMessage}</p>
          <button
            type="button"
            onClick={() => setConflictMessage(null)}
            className="mt-4 w-full rounded-control bg-brand py-2 font-semibold text-white"
          >
            Compris
          </button>
        </Modal>
      )}
    </DndContext>
  );
}
