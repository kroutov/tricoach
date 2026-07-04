import { ATHLETE_LEVEL_OPTIONS, athleteLevelDescription, athleteLevelLabel } from '../../../lib/enumLabels';
import type { DraftProfile } from '../onboardingTypes';

export function SportLevelStep({ profile, onChange }: { profile: DraftProfile; onChange: (profile: DraftProfile) => void }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-primary-text">Quel est votre niveau ?</h2>

      <div className="space-y-2">
        {ATHLETE_LEVEL_OPTIONS.map((level) => {
          const isSelected = profile.level === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange({ ...profile, level })}
              aria-pressed={isSelected}
              className={`flex w-full items-center justify-between rounded-control p-2 text-left ${
                isSelected ? 'bg-brand/10' : 'bg-card-background'
              }`}
            >
              <div>
                <p className="font-semibold text-primary-text">{athleteLevelLabel[level]}</p>
                <p className="text-sm text-secondary-text">{athleteLevelDescription[level]}</p>
              </div>
              {isSelected && (
                <span className="text-brand" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
