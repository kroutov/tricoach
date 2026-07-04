import { GoalEditorForm } from '../GoalEditorForm';
import { newDraftGoal, type DraftGoal } from '../onboardingTypes';

export function GoalsStep({ goals, onChange }: { goals: DraftGoal[]; onChange: (goals: DraftGoal[]) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary-text">Vos objectifs</h2>
      <p className="text-sm text-secondary-text">Vous pouvez viser plusieurs courses ; la priorité A détermine le plan généré.</p>

      {goals.map((goal, index) => (
        <GoalEditorForm
          key={goal.localId}
          goal={goal}
          onChange={(updated) => onChange(goals.map((g, i) => (i === index ? updated : g)))}
          onDelete={goals.length > 1 ? () => onChange(goals.filter((_, i) => i !== index)) : undefined}
        />
      ))}

      <button
        type="button"
        onClick={() => onChange([...goals, newDraftGoal()])}
        className="pt-1 text-sm font-semibold text-brand"
      >
        + Ajouter un objectif
      </button>
    </div>
  );
}
