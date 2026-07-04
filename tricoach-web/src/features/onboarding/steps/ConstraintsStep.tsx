import { useState } from 'react';
import { OnboardingField } from '../OnboardingField';
import { NumberStepperField } from '../NumberStepperField';
import type { DraftCheckIn } from '../onboardingTypes';

export function ConstraintsStep({ checkIn, onChange }: { checkIn: DraftCheckIn; onChange: (checkIn: DraftCheckIn) => void }) {
  const [newInjury, setNewInjury] = useState('');

  const addInjury = () => {
    const trimmed = newInjury.trim();
    if (!trimmed) return;
    onChange({ ...checkIn, injuries: [...checkIn.injuries, trimmed] });
    setNewInjury('');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-primary-text">Contraintes actuelles</h2>
      <p className="text-sm text-secondary-text">Ces informations permettent au moteur d’adaptation de rester prudent dès la première semaine.</p>

      <OnboardingField label="Blessures éventuelles">
        <div className="space-y-2">
          {checkIn.injuries.map((injury) => (
            <div key={injury} className="flex items-center justify-between">
              <span className="text-primary-text">{injury}</span>
              <button
                type="button"
                onClick={() => onChange({ ...checkIn, injuries: checkIn.injuries.filter((i) => i !== injury) })}
                aria-label={`Supprimer cette blessure : ${injury}`}
                className="text-secondary-text"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newInjury}
              onChange={(e) => setNewInjury(e.target.value)}
              placeholder="Ex : douleur genou droit"
              className="flex-1 rounded-control border border-separator bg-background px-2 py-1.5 text-primary-text"
            />
            <button type="button" onClick={addInjury} className="rounded-control bg-secondary-background px-3 py-1.5 text-sm font-medium text-primary-text">
              Ajouter
            </button>
          </div>
        </div>
      </OnboardingField>

      <NumberStepperField
        fieldLabel="Niveau de fatigue (1 = très frais, 5 = épuisé)"
        value={checkIn.fatigueLevel}
        onChange={(fatigueLevel) => onChange({ ...checkIn, fatigueLevel })}
        min={1}
        max={5}
        format={(v) => `${v} / 5`}
      />

      <NumberStepperField
        fieldLabel="Niveau de stress (1 = détendu, 5 = très stressé)"
        value={checkIn.stressLevel}
        onChange={(stressLevel) => onChange({ ...checkIn, stressLevel })}
        min={1}
        max={5}
        format={(v) => `${v} / 5`}
      />

      <NumberStepperField
        fieldLabel="Sommeil moyen"
        value={checkIn.sleepHours}
        onChange={(sleepHours) => onChange({ ...checkIn, sleepHours })}
        min={3}
        max={11}
        step={0.5}
        format={(v) => `${v.toFixed(1)} h / nuit`}
      />
    </div>
  );
}
