import { OnboardingField } from './OnboardingField';

interface NumberStepperFieldProps {
  fieldLabel: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format: (value: number) => string;
}

/** Port of a SwiftUI `Stepper` wrapped in `OnboardingField` — used across PersonalInfo/History/Availability steps. */
export function NumberStepperField({ fieldLabel, value, onChange, min, max, step = 1, format }: NumberStepperFieldProps) {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return (
    <OnboardingField label={fieldLabel}>
      <div className="flex items-center justify-between">
        <span className="text-primary-text font-medium">{format(value)}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(round(Math.max(min, value - step)))}
            aria-label={`Diminuer ${fieldLabel.toLowerCase()}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-separator text-primary-text"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => onChange(round(Math.min(max, value + step)))}
            aria-label={`Augmenter ${fieldLabel.toLowerCase()}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-separator text-primary-text"
          >
            +
          </button>
        </div>
      </div>
    </OnboardingField>
  );
}
