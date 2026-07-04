import { useQuery } from '@tanstack/react-query';
import { getActivePlan, getAdaptationEvents } from '../../api/plans';
import { adaptationTriggerLabel } from '../../lib/enumLabels';
import { Card } from '../../components/Card';
import { PillBadge } from '../../components/PillBadge';

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

/** Port of TriCoachAI's AdaptationHistoryView — the full event list (vs. the dashboard's 5-event preview). */
export function AdaptationHistoryPage() {
  const { data: plan, isLoading: isLoadingPlan } = useQuery({ queryKey: ['plans', 'active'], queryFn: getActivePlan });
  const { data: events, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['adaptationEvents', plan?.id],
    queryFn: () => getAdaptationEvents(plan!.id),
    enabled: !!plan,
  });

  if (isLoadingPlan || (!!plan && isLoadingEvents)) {
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

  const sortedEvents = [...(events ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="mx-auto max-w-2xl space-y-2 p-4">
      <h1 className="mb-2 text-xl font-bold text-primary-text">Historique d'adaptation</h1>
      {sortedEvents.length === 0 && <p className="text-center text-secondary-text">Aucune adaptation pour le moment.</p>}
      {sortedEvents.map((event) => (
        <Card key={event.id}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-primary-text">{adaptationTriggerLabel[event.triggeredBy]}</p>
            {event.deltaLoadPercent !== null && (
              <PillBadge
                text={`${event.deltaLoadPercent >= 0 ? '+' : ''}${Math.round(event.deltaLoadPercent)}%`}
                tint={event.deltaLoadPercent >= 0 ? 'var(--color-intensity-easy)' : 'var(--color-intensity-hard)'}
              />
            )}
          </div>
          <p className="mt-1 text-sm text-secondary-text">{event.actionTaken}</p>
          <p className="mt-1 text-xs text-secondary-text">{dateTimeFormatter.format(new Date(event.createdAt))}</p>
        </Card>
      ))}
    </div>
  );
}
