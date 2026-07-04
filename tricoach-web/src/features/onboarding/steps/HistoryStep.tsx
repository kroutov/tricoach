import { NumberStepperField } from '../NumberStepperField';
import type { DraftProfile } from '../onboardingTypes';

function paceLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = String(Math.round(seconds % 60)).padStart(2, '0');
  return `${m}:${s} /km`;
}

export function HistoryStep({ profile, onChange }: { profile: DraftProfile; onChange: (profile: DraftProfile) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-primary-text">Votre historique</h2>
      <p className="text-sm text-secondary-text">
        Ces données personnalisent vos zones d’entraînement. Laissez la valeur par défaut si inconnue — vous pourrez les compléter plus tard.
      </p>

      <NumberStepperField
        fieldLabel="Années de pratique"
        value={profile.yearsPractice ?? 1}
        onChange={(yearsPractice) => onChange({ ...profile, yearsPractice })}
        min={0}
        max={40}
        step={0.5}
        format={(v) => `${v.toFixed(1)} ans`}
      />

      <NumberStepperField
        fieldLabel="Volume hebdomadaire moyen"
        value={profile.weeklyVolumeAvgMin ?? 180}
        onChange={(weeklyVolumeAvgMin) => onChange({ ...profile, weeklyVolumeAvgMin })}
        min={0}
        max={1200}
        step={15}
        format={(v) => `${v} min / semaine`}
      />

      <NumberStepperField
        fieldLabel="Fréquence cardiaque max (bpm)"
        value={profile.hrMax ?? 185}
        onChange={(hrMax) => onChange({ ...profile, hrMax })}
        min={120}
        max={230}
        format={(v) => `${v} bpm`}
      />

      <NumberStepperField
        fieldLabel="Fréquence cardiaque au repos (bpm)"
        value={profile.hrRest ?? 55}
        onChange={(hrRest) => onChange({ ...profile, hrRest })}
        min={30}
        max={100}
        format={(v) => `${v} bpm`}
      />

      <NumberStepperField
        fieldLabel="FTP vélo (watts, si connu)"
        value={profile.ftpWatts ?? 200}
        onChange={(ftpWatts) => onChange({ ...profile, ftpWatts })}
        min={0}
        max={500}
        step={5}
        format={(v) => `${v} W`}
      />

      <NumberStepperField
        fieldLabel="Allure seuil course (min/km, si connue)"
        value={profile.thresholdPaceSecPerKm ?? 300}
        onChange={(thresholdPaceSecPerKm) => onChange({ ...profile, thresholdPaceSecPerKm })}
        min={150}
        max={600}
        step={5}
        format={paceLabel}
      />

      <NumberStepperField
        fieldLabel="CSS natation (min/100m, si connue)"
        value={profile.cssPaceSecPer100m ?? 100}
        onChange={(cssPaceSecPer100m) => onChange({ ...profile, cssPaceSecPer100m })}
        min={50}
        max={240}
        format={(v) => `${paceLabel(v).replace('/km', '/100m')}`}
      />
    </div>
  );
}
