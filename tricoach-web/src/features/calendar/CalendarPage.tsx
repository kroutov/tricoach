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
const monthYearFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable: `
    Pour saisir une séance, appuyez sur la barre d'espace.
    Utilisez les flèches pour la déplacer vers un autre jour du calendrier —
    gauche/droite pour un jour, haut/bas pour changer de semaine.
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
 * where the coordinate getter above already jumps to a day cell's exact rect.
 */
const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
};

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function mondayOnOrBefore(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const d = new Date(date);
  d.setDate(date.getDate() + diff);
  return d;
}

function sundayOnOrAfter(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const d = new Date(date);
  d.setDate(date.getDate() + diff);
  return d;
}

/** Full weeks (Monday-first) spanning the whole calendar month — 4 to 6 rows of 7 depending on the month. */
function monthGridFor(month: Date): Date[] {
  const start = mondayOnOrBefore(startOfMonth(month));
  const end = sundayOnOrAfter(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const days: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

/** Grid cell — also the drop target for drag & drop rescheduling. */
function MonthDayCell({
  date,
  isSelected,
  isToday,
  isCurrentMonth,
  hasWorkout,
  onSelect,
}: {
  date: Date;
  isSelected: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
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
      className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-control ${
        isOver
          ? 'bg-brand/30 text-brand'
          : isSelected
            ? 'bg-brand/15 text-brand'
            : isCurrentMonth
              ? 'text-primary-text'
              : 'text-secondary-text/40'
      } ${isToday && !isSelected ? 'ring-1 ring-inset ring-brand/50' : ''}`}
    >
      <span aria-hidden="true" className="text-sm font-medium">
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
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [displayedMonth, setDisplayedMonth] = useState(() => startOfMonth(today));
  const { data: plan, isLoading } = useQuery({ queryKey: ['plans', 'active'], queryFn: getActivePlan });
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Jumps to the exact position of the target grid cell instead of the
   * default fixed-pixel nudge — with fixed drop targets in a grid, a
   * fixed-distance step would need a variable, hard-to-predict number of
   * presses to land on a given day, and could stop between two cells.
   * Left/Right move by one day, Up/Down by one week (±7 cells), matching
   * the grid's row-major layout (rects sorted by row then column).
   *
   * `currentCoordinates` only matches a cell's own position from the
   * *second* keypress onward — the very first press still reflects the
   * dragged workout row's own position (a full-width card well below and
   * left of the grid), which isn't close to any cell. That first press
   * falls back to the workout's actual scheduled day instead of whichever
   * cell happens to be geometrically nearest an unrelated position.
   */
  const dayGridCoordinateGetter: KeyboardCoordinateGetter = (event, { context, currentCoordinates, active }) => {
    const delta = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[event.code];
    if (delta === undefined) return undefined;

    const rects = Array.from(context.droppableRects.entries())
      .map(([id, rect]) => ({ id: String(id), rect }))
      .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
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

    index = Math.min(rects.length - 1, Math.max(0, index + delta));

    event.preventDefault();
    return { x: rects[index].rect.left, y: rects[index].rect.top };
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: dayGridCoordinateGetter })
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

  const gridDays = monthGridFor(displayedMonth);
  const dayWorkouts = [...workoutsOnDay(plan, selectedDate)].sort((a, b) => a.date.localeCompare(b.date));
  const microcycle = currentMicrocycle(plan, selectedDate);
  const range = planDateRange(plan);
  const monthKey = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  const canGoPrevious = !range || monthKey(displayedMonth) > monthKey(range.start);
  const canGoNext = !range || monthKey(displayedMonth) < monthKey(range.end);

  const shiftMonth = (deltaMonths: number) => {
    setDisplayedMonth((current) => new Date(current.getFullYear(), current.getMonth() + deltaMonths, 1));
  };

  const goToToday = () => {
    setSelectedDate(today);
    setDisplayedMonth(startOfMonth(today));
  };

  const selectDay = (date: Date) => {
    setSelectedDate(date);
    if (monthKey(date) !== monthKey(displayedMonth)) {
      setDisplayedMonth(startOfMonth(date));
    }
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
            onClick={() => shiftMonth(-1)}
            disabled={!canGoPrevious}
            aria-label="Mois précédent"
            className="rounded-control px-3 py-1 text-primary-text disabled:opacity-30"
          >
            ‹
          </button>
          <div className="text-center">
            <p className="font-medium text-primary-text">{capitalize(monthYearFormatter.format(displayedMonth))}</p>
            <button type="button" onClick={goToToday} className="text-xs font-medium text-brand">
              Aujourd'hui
            </button>
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            disabled={!canGoNext}
            aria-label="Mois suivant"
            className="rounded-control px-3 py-1 text-primary-text disabled:opacity-30"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-secondary-text">
          {gridDays.slice(0, 7).map((date) => (
            <span key={date.toISOString()} aria-hidden="true">
              {narrowWeekdayFormatter.format(date)}
            </span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {gridDays.map((date) => (
            <MonthDayCell
              key={date.toISOString()}
              date={date}
              isSelected={isSameDay(date, selectedDate)}
              isToday={isSameDay(date, today)}
              isCurrentMonth={date.getMonth() === displayedMonth.getMonth()}
              hasWorkout={workoutsOnDay(plan, date).length > 0}
              onSelect={() => selectDay(date)}
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
