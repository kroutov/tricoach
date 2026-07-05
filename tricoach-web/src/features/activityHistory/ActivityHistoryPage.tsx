import { useQuery } from '@tanstack/react-query';
import { getActivities } from '../../api/me';
import { activitySourceLabel, sportTypeColorVar, sportTypeLabel } from '../../lib/enumLabels';
import { Card } from '../../components/Card';
import { PillBadge } from '../../components/PillBadge';

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

function formatDuration(durationS: number): string {
  const totalMin = Math.round(durationS / 60);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  return hours > 0 ? `${hours}h${String(minutes).padStart(2, '0')}` : `${minutes} min`;
}

function formatDistance(distanceM: number): string {
  return `${(distanceM / 1000).toFixed(1)} km`;
}

/**
 * Real-world synced activities (Strava today, Garmin/HealthKit once viable
 * — see tricoach-web/README.md for the Garmin MFA limitation). Cross-source
 * duplicates are already filtered out server-side at ingestion time (same
 * sport within a 5-minute window), so every row here is a distinct session.
 */
export function ActivityHistoryPage() {
  const { data: activities, isLoading } = useQuery({ queryKey: ['activities'], queryFn: getActivities });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-secondary-text">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-2 p-4">
      <h1 className="mb-2 text-xl font-bold text-primary-text">Activités</h1>
      {(!activities || activities.length === 0) && (
        <p className="text-center text-secondary-text">Aucune activité synchronisée pour le moment.</p>
      )}
      {activities?.map((activity) => (
        <Card key={activity.id}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-primary-text">{activity.sport ? sportTypeLabel[activity.sport] : 'Activité'}</p>
            {activity.sport && <PillBadge text={sportTypeLabel[activity.sport]} tint={sportTypeColorVar[activity.sport]} />}
          </div>
          <p className="mt-1 text-sm text-secondary-text">
            {formatDuration(activity.durationS)}
            {activity.distanceM ? ` · ${formatDistance(activity.distanceM)}` : ''}
            {activity.avgHr ? ` · ${activity.avgHr} bpm moy.` : ''}
          </p>
          <p className="mt-1 text-xs text-secondary-text">
            {dateTimeFormatter.format(new Date(activity.startTime))} · {activitySourceLabel[activity.source]}
          </p>
        </Card>
      ))}
    </div>
  );
}
