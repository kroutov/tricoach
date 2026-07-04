import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDashboardSummary } from '../../api/dashboard';
import { getAdaptationEvents } from '../../api/plans';
import { Card } from '../../components/Card';
import { ProgressRing } from '../../components/ProgressRing';
import { PillBadge } from '../../components/PillBadge';
import { adaptationTriggerLabel, macrocyclePhaseLabel, sportTypeLabel, workoutIntensityColorVar, workoutIntensityLabel } from '../../lib/enumLabels';

export function DashboardPage() {
  const { data: summary, isLoading } = useQuery({ queryKey: ['dashboard', 'summary'], queryFn: getDashboardSummary });
  const planId = summary?.hasActivePlan ? summary.planId : undefined;
  const { data: adaptationEvents } = useQuery({
    queryKey: ['adaptationEvents', planId],
    queryFn: () => getAdaptationEvents(planId!),
    enabled: !!planId,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-secondary-text">Chargement…</p>
      </div>
    );
  }

  if (!summary?.hasActivePlan) {
    return (
      <div className="mx-auto max-w-xl p-4 text-center">
        <p className="mt-12 text-lg font-semibold text-primary-text">Aucun plan actif</p>
        <p className="mt-2 text-sm text-secondary-text">Terminez l’onboarding pour générer votre plan.</p>
      </div>
    );
  }

  const weekProgress = summary.weekPlannedLoad ? (summary.weekCompletedLoad ?? 0) / summary.weekPlannedLoad : 0;
  const recentEvents = (adaptationEvents ?? []).slice(0, 5);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary-text">Tableau de bord</h1>
      <Card>
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <ProgressRing progress={weekProgress} />
            <span className="absolute font-mono text-sm font-bold text-primary-text">{Math.round(weekProgress * 100)}%</span>
          </div>
          <div>
            <p className="font-semibold text-primary-text">
              Semaine {summary.weekNumber} / {summary.durationWeeks}
            </p>
            <p className="text-sm text-secondary-text">{summary.currentPhase ? macrocyclePhaseLabel[summary.currentPhase] : '—'}</p>
            {summary.isRecoveryWeek && <PillBadge text="Semaine allégée" tint="var(--color-intensity-easy)" />}
          </div>
        </div>
      </Card>

      <Card>
        <p className="font-semibold text-primary-text">Charge de la semaine</p>
        <div className="mt-2 flex gap-6">
          <div>
            <p className="font-mono text-2xl font-bold text-primary-text">{Math.round(summary.weekCompletedLoad ?? 0)}</p>
            <p className="text-xs text-secondary-text">TSS réalisés</p>
          </div>
          <div>
            <p className="font-mono text-2xl font-bold text-primary-text">{Math.round(summary.weekPlannedLoad ?? 0)}</p>
            <p className="text-xs text-secondary-text">TSS planifiés</p>
          </div>
        </div>
      </Card>

      {summary.upcomingWorkouts && summary.upcomingWorkouts.length > 0 && (
        <Card>
          <p className="font-semibold text-primary-text">Prochaines séances</p>
          <div className="mt-2 space-y-2">
            {summary.upcomingWorkouts.map((workout) => (
              <Link
                key={workout.id}
                to={`/workouts/${workout.id}`}
                className="flex items-center justify-between rounded-control bg-secondary-background p-2"
              >
                <div>
                  <p className="font-medium text-primary-text">{workout.title}</p>
                  <p className="text-xs text-secondary-text">
                    {sportTypeLabel[workout.sport]} · {workout.plannedDurationMin} min
                    {workout.estimatedTSS ? ` · ${Math.round(workout.estimatedTSS)} TSS` : ''}
                  </p>
                </div>
                <PillBadge text={workoutIntensityLabel[workout.intensity]} tint={workoutIntensityColorVar[workout.intensity]} />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {recentEvents.length > 0 && (
        <Card>
          <p className="font-semibold text-primary-text">Dernières adaptations</p>
          <div className="mt-2 space-y-2">
            {recentEvents.map((event) => (
              <div key={event.id}>
                <p className="text-sm font-semibold text-primary-text">{adaptationTriggerLabel[event.triggeredBy]}</p>
                <p className="text-xs text-secondary-text">{event.actionTaken}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
