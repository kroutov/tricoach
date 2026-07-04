import { OnboardingField } from '../OnboardingField';
import { NumberStepperField } from '../NumberStepperField';
import { ChipGrid } from '../ChipGrid';
import { ORDERED_WEEKDAYS, TIME_SLOT_OPTIONS, timeSlotLabel, weekdayLabel } from '../../../lib/enumLabels';
import type { DraftAvailability } from '../onboardingTypes';

export function AvailabilityStep({
  availability,
  onChange,
}: {
  availability: DraftAvailability;
  onChange: (availability: DraftAvailability) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-primary-text">Vos disponibilités</h2>

      <NumberStepperField
        fieldLabel="Séances par semaine"
        value={availability.sessionsPerWeek}
        onChange={(sessionsPerWeek) => onChange({ ...availability, sessionsPerWeek })}
        min={1}
        max={14}
        format={(v) => `${v} séances`}
      />

      <NumberStepperField
        fieldLabel="Durée maximale par séance"
        value={availability.maxSessionDurationMin}
        onChange={(maxSessionDurationMin) => onChange({ ...availability, maxSessionDurationMin })}
        min={20}
        max={240}
        step={5}
        format={(v) => `${v} min`}
      />

      <OnboardingField label="Jours disponibles">
        <ChipGrid
          items={ORDERED_WEEKDAYS}
          selection={availability.availableDays}
          onChange={(availableDays) => onChange({ ...availability, availableDays })}
          label={(day) => weekdayLabel[day]}
        />
      </OnboardingField>

      <OnboardingField label="Créneaux horaires préférés">
        <ChipGrid
          items={TIME_SLOT_OPTIONS}
          selection={availability.preferredTimeSlots}
          onChange={(preferredTimeSlots) => onChange({ ...availability, preferredTimeSlots })}
          label={(slot) => timeSlotLabel[slot]}
        />
      </OnboardingField>

      <OnboardingField label="Jours de repos obligatoires">
        <ChipGrid
          items={ORDERED_WEEKDAYS}
          selection={availability.mandatoryRestDays}
          onChange={(mandatoryRestDays) => onChange({ ...availability, mandatoryRestDays })}
          label={(day) => weekdayLabel[day]}
        />
      </OnboardingField>
    </div>
  );
}
