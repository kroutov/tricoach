import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getDashboardAnalytics } from '../../api/dashboard';
import { workoutIntensityColorVar, workoutIntensityLabel } from '../../lib/enumLabels';
import type { LoadFormPoint, Vo2maxPoint, WeeklyLoadPoint, ZoneDistributionPoint } from '../../api/types';
import { Card } from '../../components/Card';

const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const longDateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

function weeklyLoadSummary(points: WeeklyLoadPoint[]): string {
  if (points.length === 0) return 'Aucune donnée de charge hebdomadaire pour le moment.';
  const last = points[points.length - 1];
  return `${points.length} semaine${points.length > 1 ? 's' : ''} de charge suivies. Dernière semaine (S${last.weekNumber}) : ${Math.round(last.completedLoad)} TSS réalisés sur ${Math.round(last.plannedLoad)} TSS planifiés.`;
}

function loadFormSummary(points: LoadFormPoint[]): string {
  if (points.length === 0) return 'Aucune donnée de forme pour le moment.';
  const last = points[points.length - 1];
  const tsb = Math.round(last.tsb);
  const status = tsb > 5 ? 'en fraîcheur' : tsb < -10 ? 'fatigué' : 'équilibré';
  return `Forme actuelle : CTL ${Math.round(last.ctl)} (fond), ATL ${Math.round(last.atl)} (fatigue), TSB ${tsb} — ${status}.`;
}

function zoneDistributionSummary(points: ZoneDistributionPoint[]): string {
  if (points.every((p) => p.count === 0)) return 'Aucune séance réalisée pour le moment.';
  return points
    .map((p) => `${workoutIntensityLabel[p.intensity]} : ${Math.round(p.totalLoad)} TSS sur ${p.count} séance${p.count > 1 ? 's' : ''}`)
    .join(' · ');
}

function vo2maxSummary(points: Vo2maxPoint[]): string {
  if (points.length === 0) return '';
  const last = points[points.length - 1];
  const first = points[0];
  const trend = last.vo2max > first.vo2max ? 'en hausse' : last.vo2max < first.vo2max ? 'en baisse' : 'stable';
  return `Dernière valeur : ${last.vo2max.toFixed(1)} ml/kg/min le ${longDateFormatter.format(new Date(last.date))} — tendance ${trend} depuis la première mesure.`;
}

export function AnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dashboard', 'analytics'], queryFn: getDashboardAnalytics });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-secondary-text">Chargement…</p>
      </div>
    );
  }

  if (!data?.hasActivePlan) {
    return (
      <div className="mx-auto max-w-xl p-4 text-center">
        <p className="mt-12 text-lg font-semibold text-primary-text">Aucun plan actif</p>
      </div>
    );
  }

  const weeklyLoad = data.weeklyLoad ?? [];
  const loadForm = data.loadForm ?? [];
  const zoneDistribution = data.zoneDistribution ?? [];
  const vo2maxTrend = data.vo2maxTrend ?? [];

  const weeklyLoadData = weeklyLoad.map((p) => ({
    name: `S${p.weekNumber}`,
    Planifié: Math.round(p.plannedLoad),
    Réalisé: Math.round(p.completedLoad),
  }));

  const loadFormData = loadForm.map((p) => ({
    date: shortDateFormatter.format(new Date(p.date)),
    CTL: Math.round(p.ctl),
    ATL: Math.round(p.atl),
  }));

  const zoneData = zoneDistribution.map((p) => ({
    name: workoutIntensityLabel[p.intensity],
    TSS: Math.round(p.totalLoad),
    intensity: p.intensity,
  }));

  const vo2maxData = vo2maxTrend.map((p) => ({
    date: shortDateFormatter.format(new Date(p.date)),
    VO2max: p.vo2max,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary-text">Analytique</h1>

      <Card>
        <p className="font-semibold text-primary-text">Charge hebdomadaire</p>
        {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- composite SVG chart, no image src to point a real <img> at; role="img" is the documented WAI-ARIA pattern for this. */}
        <div role="img" aria-label={weeklyLoadSummary(weeklyLoad)} className="mt-2 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyLoadData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-separator)" />
              <XAxis dataKey="name" stroke="var(--color-secondary-text)" fontSize={12} />
              <YAxis stroke="var(--color-secondary-text)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-card-background)', border: 'none' }} />
              <Bar dataKey="Planifié" fill="var(--color-secondary-background)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="Réalisé" fill="var(--color-brand)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-secondary-text">{weeklyLoadSummary(weeklyLoad)}</p>
      </Card>

      <Card>
        <p className="font-semibold text-primary-text">Forme (CTL / ATL)</p>
        {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- see weekly-load chart above */}
        <div role="img" aria-label={loadFormSummary(loadForm)} className="mt-2 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={loadFormData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-separator)" />
              <XAxis dataKey="date" stroke="var(--color-secondary-text)" fontSize={12} minTickGap={24} />
              <YAxis stroke="var(--color-secondary-text)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-card-background)', border: 'none' }} />
              <Line type="monotone" dataKey="CTL" stroke="var(--color-brand)" dot={false} strokeWidth={2} isAnimationActive={false} />
              <Line type="monotone" dataKey="ATL" stroke="var(--color-intensity-hard)" dot={false} strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-secondary-text">{loadFormSummary(loadForm)}</p>
      </Card>

      <Card>
        <p className="font-semibold text-primary-text">Répartition par zone</p>
        {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- see weekly-load chart above */}
        <div role="img" aria-label={zoneDistributionSummary(zoneDistribution)} className="mt-2 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={zoneData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-separator)" />
              <XAxis dataKey="name" stroke="var(--color-secondary-text)" fontSize={12} />
              <YAxis stroke="var(--color-secondary-text)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--color-card-background)', border: 'none' }} />
              <Bar dataKey="TSS" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {zoneData.map((entry) => (
                  <Cell key={entry.intensity} fill={workoutIntensityColorVar[entry.intensity]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-secondary-text">{zoneDistributionSummary(zoneDistribution)}</p>
      </Card>

      {vo2maxTrend.length > 0 && (
        <Card>
          <p className="font-semibold text-primary-text">Tendance VO2max</p>
          {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- see weekly-load chart above */}
          <div role="img" aria-label={vo2maxSummary(vo2maxTrend)} className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={vo2maxData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-separator)" />
                <XAxis dataKey="date" stroke="var(--color-secondary-text)" fontSize={12} minTickGap={24} />
                <YAxis stroke="var(--color-secondary-text)" fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--color-card-background)', border: 'none' }} />
                <Line type="monotone" dataKey="VO2max" stroke="var(--color-brand)" dot={false} strokeWidth={2} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-secondary-text">{vo2maxSummary(vo2maxTrend)}</p>
        </Card>
      )}
    </div>
  );
}
