import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getActivePlan } from '../../api/plans';
import { completeWorkout, rescheduleWorkout } from '../../api/workouts';
import { findWorkoutWithMicrocycle } from '../../lib/plan';
import { parseApiDate, toDayString } from '../../lib/dateOnly';
import { workoutIntensityColorVar, workoutIntensityLabel } from '../../lib/enumLabels';
import type { IntervalBlock, TargetZone, WorkoutSection } from '../../api/types';
import { Card } from '../../components/Card';
import { PillBadge } from '../../components/PillBadge';
import { Modal } from '../../components/Modal';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

function paceLabel(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Port of iOS ZoneRow — target zone(s) for a section or interval block, joined into one line. */
function TargetZoneRow({ target }: { target: TargetZone }) {
  const parts: string[] = [];
  if (target.hrZone) parts.push(`Z${target.hrZone}`);
  if (target.hrRangeBpm) parts.push(`${target.hrRangeBpm.lowerBound}-${target.hrRangeBpm.upperBound} bpm`);
  if (target.paceSecPerKm) parts.push(`${paceLabel(target.paceSecPerKm.lowerBound)}-${paceLabel(target.paceSecPerKm.upperBound)}/km`);
  if (target.paceSecPer100m) parts.push(`${paceLabel(target.paceSecPer100m.lowerBound)}-${paceLabel(target.paceSecPer100m.upperBound)}/100m`);
  if (target.powerWatts) parts.push(`${target.powerWatts.lowerBound}-${target.powerWatts.upperBound} W`);
  if (parts.length === 0) return null;
  return <p className="mt-1 text-xs text-secondary-text">{parts.join(' · ')}</p>;
}

function SectionCard({ title, section }: { title: string; section: WorkoutSection }) {
  return (
    <Card>
      <p className="font-semibold text-primary-text">
        {title} · {section.durationMin} min
      </p>
      <p className="text-sm text-secondary-text">{section.description}</p>
      <TargetZoneRow target={section.target} />
    </Card>
  );
}

function blockLabel(block: IntervalBlock): string {
  if (block.repetitions <= 1) {
    return `${Math.floor(block.workDurationSec / 60)} min continu`;
  }
  const recovery = block.recoveryDurationSec > 0 ? `, récup ${block.recoveryDurationSec}s` : '';
  const workLabel = block.workDurationSec >= 60 ? `${Math.floor(block.workDurationSec / 60)} min` : `${block.workDurationSec}s`;
  return `${block.repetitions} x ${workLabel}${recovery}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 text-center">
      <p className="font-semibold text-primary-text">{value}</p>
      <p className="text-xs text-secondary-text">{label}</p>
    </div>
  );
}

const statusBadge: Record<string, { text: string; tint: string }> = {
  completed: { text: 'Complétée', tint: 'var(--color-intensity-easy)' },
  skipped: { text: 'Ratée', tint: 'var(--color-intensity-hard)' },
  modified: { text: 'Modifiée', tint: 'var(--color-secondary-text)' },
};

export function WorkoutDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: plan, isLoading } = useQuery({ queryKey: ['plans', 'active'], queryFn: getActivePlan });

  const [showFeedback, setShowFeedback] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [actualDurationMin, setActualDurationMin] = useState(0);
  const [actualRPE, setActualRPE] = useState(5);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [adaptationSummary, setAdaptationSummary] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['plans', 'active'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    queryClient.invalidateQueries({ queryKey: ['adaptationEvents'] });
  };

  const completeMutation = useMutation({
    mutationFn: (input: { status: 'completed' | 'skipped'; actualDurationMin?: number; rpe?: number }) =>
      completeWorkout(id!, input),
    onSuccess: (response) => {
      invalidateAll();
      setShowFeedback(false);
      if (response.adaptationEvents.length > 0) {
        setAdaptationSummary(response.adaptationEvents.map((e) => e.actionTaken).join('\n\n'));
      }
    },
    onError: () => setErrorMessage("Impossible d'enregistrer la séance."),
  });

  const rescheduleMutation = useMutation({
    mutationFn: (date: string) => rescheduleWorkout(id!, date),
    onSuccess: (response) => {
      invalidateAll();
      setShowReschedule(false);
      if (response.conflicts.length > 0) {
        setConflictMessage(response.conflicts.join('\n'));
      }
    },
    onError: () => setErrorMessage('Impossible de déplacer la séance.'),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-secondary-text">Chargement…</p>
      </div>
    );
  }

  const found = plan && id ? findWorkoutWithMicrocycle(plan, id) : undefined;

  if (!found) {
    return (
      <div className="mx-auto max-w-xl p-4 text-center">
        <p className="mt-12 text-lg font-semibold text-primary-text">Séance introuvable</p>
        <Link to="/calendar" className="mt-2 inline-block text-brand">
          Retour au calendrier
        </Link>
      </div>
    );
  }

  const { workout } = found;
  const status = statusBadge[workout.status];

  const openFeedback = () => {
    setActualDurationMin(workout.plannedDurationMin);
    setActualRPE(workout.rpeTarget ?? 5);
    setErrorMessage(null);
    setShowFeedback(true);
  };

  const openReschedule = () => {
    setRescheduleDate(toDayString(parseApiDate(workout.date)));
    setErrorMessage(null);
    setShowReschedule(true);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div>
        <div className="flex items-center gap-2">
          <PillBadge text={workoutIntensityLabel[workout.intensity]} tint={workoutIntensityColorVar[workout.intensity]} />
          {status && <PillBadge text={status.text} tint={status.tint} />}
          <span className="ml-auto text-xs text-secondary-text">{dateFormatter.format(parseApiDate(workout.date))}</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold text-primary-text">{workout.title}</h1>
        <p className="text-secondary-text">{workout.summary}</p>
      </div>

      <Card>
        <div className="flex">
          <Metric label="Durée" value={`${workout.plannedDurationMin} min`} />
          <Metric label="RPE cible" value={workout.rpeTarget ? `${workout.rpeTarget}/10` : '—'} />
          <Metric label="TSS estimé" value={workout.estimatedTSS ? `${Math.round(workout.estimatedTSS)}` : '—'} />
          <Metric label="TRIMP" value={workout.estimatedTRIMP ? `${Math.round(workout.estimatedTRIMP)}` : '—'} />
        </div>
      </Card>

      <SectionCard title="Échauffement" section={workout.structure.warmup} />

      <Card>
        <p className="font-semibold text-primary-text">Corps principal</p>
        <div className="mt-2 space-y-3">
          {workout.structure.mainSet.map((block, i) => (
            <div key={block.id} className={i > 0 ? 'border-t border-separator pt-3' : ''}>
              <p className="text-sm font-semibold text-primary-text">{blockLabel(block)}</p>
              {block.note && <p className="text-xs text-secondary-text">{block.note}</p>}
              <TargetZoneRow target={block.target} />
            </div>
          ))}
        </div>
      </Card>

      <SectionCard title="Retour au calme" section={workout.structure.cooldown} />

      {workout.status === 'planned' && (
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={openFeedback}
            className="w-full rounded-control bg-brand py-2 font-semibold text-white disabled:opacity-60"
          >
            Marquer comme complétée
          </button>
          <button
            type="button"
            onClick={openReschedule}
            className="w-full rounded-control bg-secondary-background py-2 font-semibold text-primary-text"
          >
            Déplacer cette séance
          </button>
          <button
            type="button"
            onClick={() => completeMutation.mutate({ status: 'skipped' })}
            disabled={completeMutation.isPending}
            className="w-full rounded-control py-2 font-semibold text-intensity-hard disabled:opacity-60"
          >
            Marquer comme ratée
          </button>
          {errorMessage && <p className="text-center text-xs text-intensity-hard">{errorMessage}</p>}
        </div>
      )}

      {showFeedback && (
        <Modal title="Feedback séance" onClose={() => setShowFeedback(false)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary-text">Durée réalisée : {actualDurationMin} min</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActualDurationMin((v) => Math.max(5, v - 5))}
                  aria-label="Diminuer la durée réalisée"
                  className="h-8 w-8 rounded-full bg-secondary-background text-primary-text"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setActualDurationMin((v) => Math.min(300, v + 5))}
                  aria-label="Augmenter la durée réalisée"
                  className="h-8 w-8 rounded-full bg-secondary-background text-primary-text"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary-text">RPE ressenti : {actualRPE}/10</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActualRPE((v) => Math.max(1, v - 1))}
                  aria-label="Diminuer le RPE ressenti"
                  className="h-8 w-8 rounded-full bg-secondary-background text-primary-text"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setActualRPE((v) => Math.min(10, v + 1))}
                  aria-label="Augmenter le RPE ressenti"
                  className="h-8 w-8 rounded-full bg-secondary-background text-primary-text"
                >
                  +
                </button>
              </div>
            </div>
            {errorMessage && <p className="text-xs text-intensity-hard">{errorMessage}</p>}
            <button
              type="button"
              onClick={() => completeMutation.mutate({ status: 'completed', actualDurationMin, rpe: actualRPE })}
              disabled={completeMutation.isPending}
              className="w-full rounded-control bg-brand py-2 font-semibold text-white disabled:opacity-60"
            >
              Valider
            </button>
          </div>
        </Modal>
      )}

      {showReschedule && (
        <Modal title="Déplacer la séance" onClose={() => setShowReschedule(false)}>
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm text-secondary-text">Nouvelle date</span>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="mt-1 w-full rounded-control border border-separator bg-background px-2 py-2 text-primary-text"
              />
            </label>
            {errorMessage && <p className="text-xs text-intensity-hard">{errorMessage}</p>}
            <button
              type="button"
              onClick={() => rescheduleMutation.mutate(rescheduleDate)}
              disabled={rescheduleMutation.isPending}
              className="w-full rounded-control bg-brand py-2 font-semibold text-white disabled:opacity-60"
            >
              Déplacer
            </button>
          </div>
        </Modal>
      )}

      {adaptationSummary && (
        <Modal title="Votre plan a été ajusté" onClose={() => setAdaptationSummary(null)}>
          <p className="whitespace-pre-line text-sm text-secondary-text">{adaptationSummary}</p>
          <button
            type="button"
            onClick={() => setAdaptationSummary(null)}
            className="mt-4 w-full rounded-control bg-brand py-2 font-semibold text-white"
          >
            Compris
          </button>
        </Modal>
      )}

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
    </div>
  );
}
