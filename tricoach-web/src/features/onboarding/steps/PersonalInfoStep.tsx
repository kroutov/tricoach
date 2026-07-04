import { OnboardingField } from '../OnboardingField';
import { NumberStepperField } from '../NumberStepperField';
import { SEX_OPTIONS, sexLabel } from '../../../lib/enumLabels';
import type { DraftProfile } from '../onboardingTypes';

export function PersonalInfoStep({ profile, onChange }: { profile: DraftProfile; onChange: (profile: DraftProfile) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-primary-text">Parlez-nous de vous</h2>

      <NumberStepperField
        fieldLabel="Âge"
        value={profile.age ?? 30}
        onChange={(age) => onChange({ ...profile, age })}
        min={12}
        max={100}
        format={(v) => `${v} ans`}
      />

      <OnboardingField label="Sexe">
        <div className="flex gap-2">
          {SEX_OPTIONS.map((sex) => (
            <button
              key={sex}
              type="button"
              onClick={() => onChange({ ...profile, sex })}
              aria-pressed={(profile.sex ?? 'other') === sex}
              className={`flex-1 rounded-control px-2 py-2 text-sm font-medium ${
                (profile.sex ?? 'other') === sex ? 'bg-brand text-white' : 'bg-secondary-background text-primary-text'
              }`}
            >
              {sexLabel[sex]}
            </button>
          ))}
        </div>
      </OnboardingField>

      <NumberStepperField
        fieldLabel="Taille (cm)"
        value={profile.heightCm ?? 175}
        onChange={(heightCm) => onChange({ ...profile, heightCm })}
        min={120}
        max={230}
        format={(v) => `${Math.round(v)} cm`}
      />

      <NumberStepperField
        fieldLabel="Poids (kg)"
        value={profile.weightKg ?? 70}
        onChange={(weightKg) => onChange({ ...profile, weightKg })}
        min={30}
        max={200}
        step={0.5}
        format={(v) => `${v.toFixed(1)} kg`}
      />
    </div>
  );
}
