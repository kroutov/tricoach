import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createGoal, deleteGoal, getGoals, updateGoal, type GoalInput } from '../../api/me';
import { generatePlan } from '../../api/plans';
import { parseApiDate } from '../../lib/dateOnly';
import { goalPriorityLabel, goalTypeLabel } from '../../lib/enumLabels';
import type { Goal } from '../../api/types';
import { newDraftGoal, type DraftGoal } from '../onboarding/onboardingTypes';
import { GoalEditorForm } from '../onboarding/GoalEditorForm';
import { Card } from '../../components/Card';
import { PillBadge } from '../../components/PillBadge';
import { Modal } from '../../components/Modal';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

function goalToDraft(goal: Goal): DraftGoal {
  return {
    localId: goal.id,
    type: goal.type,
    targetDate: goal.targetDate.slice(0, 10),
    priority: goal.priority,
    targetTimeSeconds: goal.targetTimeSeconds,
  };
}

function draftToInput(draft: DraftGoal): GoalInput {
  return { type: draft.type, targetDate: draft.targetDate, priority: draft.priority, targetTimeSeconds: draft.targetTimeSeconds };
}

/** Port of TriCoachAI's GoalsManagementView — regeneration is a separate, explicit action (never automatic on goal save). */
export function GoalsPage() {
  const queryClient = useQueryClient();
  const { data: goals, isLoading } = useQuery({ queryKey: ['goals'], queryFn: getGoals });

  const [editing, setEditing] = useState<{ id: string | null; draft: DraftGoal } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [regenerateMessage, setRegenerateMessage] = useState<string | null>(null);

  const invalidateGoals = () => queryClient.invalidateQueries({ queryKey: ['goals'] });

  const saveMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string | null; draft: DraftGoal }) =>
      id ? updateGoal(id, draftToInput(draft)) : createGoal(draftToInput(draft)),
    onSuccess: () => {
      invalidateGoals();
      setEditing(null);
    },
    onError: () => setErrorMessage("Impossible d'enregistrer l'objectif."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => {
      invalidateGoals();
      setEditing(null);
    },
    onError: () => setErrorMessage("Impossible de supprimer l'objectif."),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => {
      const primary = goals?.find((g) => g.priority === 'a') ?? goals?.[0];
      if (!primary) throw new Error('no_goal');
      return generatePlan({ goalId: primary.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['adaptationEvents'] });
      setRegenerateMessage('Votre plan a été régénéré à partir de cet objectif. Le plan précédent est archivé, pas supprimé.');
    },
    onError: () => setErrorMessage('Impossible de régénérer le plan.'),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-secondary-text">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary-text">Objectifs</h1>
        <button
          type="button"
          onClick={() => {
            setErrorMessage(null);
            setEditing({ id: null, draft: newDraftGoal() });
          }}
          className="rounded-control bg-brand px-3 py-1.5 text-sm font-semibold text-white"
        >
          Ajouter
        </button>
      </div>

      <div className="space-y-2">
        {(goals ?? []).length === 0 && <p className="text-center text-secondary-text">Aucun objectif pour le moment.</p>}
        {(goals ?? []).map((goal) => (
          <button
            key={goal.id}
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setEditing({ id: goal.id, draft: goalToDraft(goal) });
            }}
            className="flex w-full items-center justify-between rounded-control bg-card-background p-3 text-left"
          >
            <div>
              <p className="font-medium text-primary-text">{goalTypeLabel[goal.type]}</p>
              <p className="text-xs text-secondary-text">{dateFormatter.format(parseApiDate(goal.targetDate))}</p>
            </div>
            <PillBadge text={goalPriorityLabel[goal.priority]} tint="var(--color-brand)" />
          </button>
        ))}
      </div>

      <Card>
        <button
          type="button"
          onClick={() => regenerateMutation.mutate()}
          disabled={(goals ?? []).length === 0 || regenerateMutation.isPending}
          className="w-full rounded-control bg-brand py-2 font-semibold text-white disabled:opacity-60"
        >
          Régénérer mon plan
        </button>
        <p className="mt-2 text-xs text-secondary-text">
          Le plan est régénéré à partir de l'objectif de priorité A (ou du premier objectif à défaut). Le plan actuel est archivé,
          pas supprimé.
        </p>
        {errorMessage && <p className="mt-2 text-xs text-intensity-hard">{errorMessage}</p>}
      </Card>

      {editing && (
        <Modal title={editing.id ? 'Modifier l’objectif' : 'Nouvel objectif'} onClose={() => setEditing(null)}>
          <GoalEditorForm
            goal={editing.draft}
            onChange={(draft) => setEditing({ id: editing.id, draft })}
            onDelete={editing.id ? () => deleteMutation.mutate(editing.id!) : undefined}
          />
          {errorMessage && <p className="mt-2 text-xs text-intensity-hard">{errorMessage}</p>}
          <button
            type="button"
            onClick={() => saveMutation.mutate({ id: editing.id, draft: editing.draft })}
            disabled={saveMutation.isPending}
            className="mt-4 w-full rounded-control bg-brand py-2 font-semibold text-white disabled:opacity-60"
          >
            Enregistrer
          </button>
        </Modal>
      )}

      {regenerateMessage && (
        <Modal title="Plan régénéré" onClose={() => setRegenerateMessage(null)}>
          <p className="text-sm text-secondary-text">{regenerateMessage}</p>
          <button
            type="button"
            onClick={() => setRegenerateMessage(null)}
            className="mt-4 w-full rounded-control bg-brand py-2 font-semibold text-white"
          >
            Compris
          </button>
        </Modal>
      )}
    </div>
  );
}
