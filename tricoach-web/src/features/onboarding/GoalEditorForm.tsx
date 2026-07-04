import { GOAL_PRIORITY_OPTIONS, GOAL_TYPE_OPTIONS, goalPriorityLabel, goalTypeLabel, type GoalType } from '../../lib/enumLabels';
import { toDayString } from '../../lib/dateOnly';
import type { DraftGoal } from './onboardingTypes';

function InlineStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix: string;
}) {
  return (
    <div className="flex flex-1 items-center justify-between rounded-control bg-secondary-background px-2 py-1.5">
      <span className="text-sm text-primary-text">
        {value} {suffix}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label={`Diminuer ${suffix}`}
          className="h-6 w-6 rounded-full bg-card-background text-sm text-primary-text"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          aria-label={`Augmenter ${suffix}`}
          className="h-6 w-6 rounded-full bg-card-background text-sm text-primary-text"
        >
          +
        </button>
      </div>
    </div>
  );
}

/** Shared goal-editing form — port of TriCoachAI's `GoalEditorCard`, reused by onboarding and (Web Phase 3) goals management. */
export function GoalEditorForm({
  goal,
  onChange,
  onDelete,
}: {
  goal: DraftGoal;
  onChange: (goal: DraftGoal) => void;
  onDelete?: () => void;
}) {
  const hasTargetTime = goal.targetTimeSeconds !== null;
  const hours = goal.targetTimeSeconds !== null ? Math.floor(goal.targetTimeSeconds / 3600) : 0;
  const minutes = goal.targetTimeSeconds !== null ? Math.floor((goal.targetTimeSeconds % 3600) / 60) : 0;
  const todayStr = toDayString(new Date());

  const setTargetTime = (h: number, m: number) => onChange({ ...goal, targetTimeSeconds: h * 3600 + m * 60 });

  return (
    <div className="space-y-2 rounded-control bg-card-background p-2">
      <div className="flex items-center gap-2">
        <select
          aria-label="Type d’objectif"
          value={goal.type}
          onChange={(e) => onChange({ ...goal, type: e.target.value as GoalType })}
          className="flex-1 rounded-control border border-separator bg-background px-2 py-2 text-primary-text"
        >
          {GOAL_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {goalTypeLabel[type]}
            </option>
          ))}
        </select>
        {onDelete && (
          <button type="button" onClick={onDelete} className="px-2 py-1 text-sm font-medium text-intensity-hard">
            Supprimer
          </button>
        )}
      </div>

      <label className="block">
        <span className="text-sm text-secondary-text">Date cible</span>
        <input
          type="date"
          value={goal.targetDate}
          min={todayStr}
          onChange={(e) => onChange({ ...goal, targetDate: e.target.value })}
          className="mt-1 w-full rounded-control border border-separator bg-background px-2 py-2 text-primary-text"
        />
      </label>

      <div className="flex gap-1">
        {GOAL_PRIORITY_OPTIONS.map((priority) => (
          <button
            key={priority}
            type="button"
            onClick={() => onChange({ ...goal, priority })}
            aria-pressed={goal.priority === priority}
            className={`flex-1 rounded-control py-1.5 text-sm font-medium ${
              goal.priority === priority ? 'bg-brand text-white' : 'bg-secondary-background text-primary-text'
            }`}
          >
            {goalPriorityLabel[priority]}
          </button>
        ))}
      </div>

      <label className="flex items-center justify-between py-1">
        <span className="text-sm text-primary-text">Temps visé</span>
        <input
          type="checkbox"
          checked={hasTargetTime}
          onChange={(e) => onChange({ ...goal, targetTimeSeconds: e.target.checked ? hours * 3600 + minutes * 60 || 3600 : null })}
          className="h-5 w-5"
        />
      </label>

      {hasTargetTime && (
        <div className="flex gap-2">
          <InlineStepper value={hours} onChange={(h) => setTargetTime(h, minutes)} min={0} max={15} suffix="h" />
          <InlineStepper value={minutes} onChange={(m) => setTargetTime(hours, m)} min={0} max={59} step={5} suffix="min" />
        </div>
      )}
    </div>
  );
}
