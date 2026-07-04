import { Card } from '../../../components/Card';
import { athleteLevelLabel, goalPriorityLabel, goalTypeLabel, weekdayLabel, ORDERED_WEEKDAYS } from '../../../lib/enumLabels';
import { fromDayString } from '../../../lib/dateOnly';
import type { DraftAvailability, DraftCheckIn, DraftGoal, DraftProfile } from '../onboardingTypes';

function formatDate(dayString: string): string {
  return fromDayString(dayString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function SummaryStep({
  profile,
  goals,
  availability,
  checkIn,
}: {
  profile: DraftProfile;
  goals: DraftGoal[];
  availability: DraftAvailability;
  checkIn: DraftCheckIn;
}) {
  const sortedDays = [...availability.availableDays].sort((a, b) => ORDERED_WEEKDAYS.indexOf(a) - ORDERED_WEEKDAYS.indexOf(b));

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary-text">Résumé</h2>
      <p className="text-sm text-secondary-text">Vérifiez vos informations avant de générer votre plan personnalisé.</p>

      <Card>
        <div className="space-y-1 text-sm text-primary-text">
          <p>
            {athleteLevelLabel[profile.level]} • {profile.age ? `${profile.age} ans` : 'âge non renseigné'}
          </p>
          {profile.weeklyVolumeAvgMin && <p>{profile.weeklyVolumeAvgMin} min/semaine en moyenne actuellement</p>}
        </div>
      </Card>

      <Card>
        <div className="space-y-1">
          <p className="font-semibold text-primary-text">Objectifs</p>
          {goals.map((goal) => (
            <p key={goal.localId} className="text-sm text-primary-text">
              {goalTypeLabel[goal.type]} — {goalPriorityLabel[goal.priority]} — {formatDate(goal.targetDate)}
            </p>
          ))}
        </div>
      </Card>

      <Card>
        <div className="space-y-1">
          <p className="font-semibold text-primary-text">Disponibilités</p>
          <p className="text-sm text-primary-text">
            {availability.sessionsPerWeek} séances/semaine, {availability.maxSessionDurationMin} min max
          </p>
          <p className="text-sm text-primary-text">{sortedDays.map((d) => weekdayLabel[d]).join(', ')}</p>
        </div>
      </Card>

      <Card>
        <div className="space-y-1">
          <p className="font-semibold text-primary-text">Contraintes</p>
          <p className="text-sm text-primary-text">
            Fatigue {checkIn.fatigueLevel}/5 · Stress {checkIn.stressLevel}/5 · Sommeil {checkIn.sleepHours.toFixed(1)}h
          </p>
          {checkIn.injuries.length > 0 && <p className="text-sm text-intensity-moderate">{checkIn.injuries.join(', ')}</p>}
        </div>
      </Card>

      <p className="text-sm text-secondary-text">Appuyez sur « Générer mon plan » pour construire votre programme périodisé.</p>
    </div>
  );
}
