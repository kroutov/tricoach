import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  deleteMenuSelection,
  getMenuSelections,
  getSuggestedRecipes,
  setMenuSelection,
  type MenuSelection,
  type Recipe,
} from '../../api/nutrition';
import { toDayString } from '../../lib/dateOnly';
import { MEAL_TYPE_OPTIONS, effortProfileColorVar, effortProfileLabel, mealTypeLabel, type MealType } from '../../lib/enumLabels';
import { Card } from '../../components/Card';
import { PillBadge } from '../../components/PillBadge';
import { Modal } from '../../components/Modal';

const dayHeaderFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const weekRangeFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function mondayOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const result = new Date(date);
  result.setDate(date.getDate() + diff);
  return result;
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(date.getDate() + amount);
  return result;
}

interface PendingCell {
  date: string;
  mealType: MealType;
}

function SuggestionModal({ pending, onClose, onPicked }: { pending: PendingCell; onClose: () => void; onPicked: (recipe: Recipe) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['nutrition', 'suggested', pending.date, pending.mealType],
    queryFn: () => getSuggestedRecipes(pending.date, pending.mealType),
  });

  return (
    <Modal title={`${mealTypeLabel[pending.mealType]} — ${pending.date}`} onClose={onClose}>
      {isLoading ? (
        <p className="text-secondary-text">Chargement des suggestions…</p>
      ) : (
        <div className="space-y-3">
          {data && (
            <p className="text-sm text-secondary-text">
              Profil d'effort du jour : <PillBadge text={effortProfileLabel[data.effortProfile]} tint={effortProfileColorVar[data.effortProfile]} />
            </p>
          )}
          <div className="space-y-2">
            {(data?.recipes ?? []).map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => onPicked(recipe)}
                className="flex w-full items-center justify-between rounded-control bg-background p-3 text-left"
              >
                <span className="font-medium text-primary-text">{recipe.title}</span>
                <PillBadge text={effortProfileLabel[recipe.effortProfile]} tint={effortProfileColorVar[recipe.effortProfile]} />
              </button>
            ))}
            {data && data.recipes.length === 0 && <p className="text-sm text-secondary-text">Aucune suggestion pour ce créneau.</p>}
          </div>
          <Link to="/nutrition/recipes" className="block text-center text-sm font-medium text-brand">
            Voir tout le catalogue
          </Link>
        </div>
      )}
    </Modal>
  );
}

export function WeeklyMenuPage() {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => mondayOfWeek(new Date()));
  const [pending, setPending] = useState<PendingCell | null>(null);
  const [viewing, setViewing] = useState<MenuSelection | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = toDayString(days[0]);
  const to = toDayString(days[6]);

  const { data: selections, isLoading } = useQuery({
    queryKey: ['nutrition', 'menu', from, to],
    queryFn: () => getMenuSelections(from, to),
  });

  const selectionMap = new Map((selections ?? []).map((s) => [`${s.date.slice(0, 10)}-${s.mealType}`, s]));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['nutrition', 'menu'] });

  const pickMutation = useMutation({
    mutationFn: ({ date, mealType, recipeId }: { date: string; mealType: MealType; recipeId: string }) =>
      setMenuSelection(date, mealType, recipeId),
    onSuccess: () => {
      invalidate();
      setPending(null);
    },
    onError: () => setErrorMessage('Impossible d’enregistrer ce choix.'),
  });

  const removeMutation = useMutation({
    mutationFn: ({ date, mealType }: { date: string; mealType: MealType }) => deleteMenuSelection(date, mealType),
    onSuccess: () => {
      invalidate();
      setViewing(null);
    },
    onError: () => setErrorMessage('Impossible de retirer ce menu.'),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary-text">Menu de la semaine</h1>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekStart((current) => addDays(current, -7))}
          aria-label="Semaine précédente"
          className="rounded-control px-3 py-1 text-primary-text"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="font-medium text-primary-text">
            {capitalize(weekRangeFormatter.format(days[0]))} — {weekRangeFormatter.format(days[6])}
          </p>
          <button type="button" onClick={() => setWeekStart(mondayOfWeek(new Date()))} className="text-xs font-medium text-brand">
            Cette semaine
          </button>
        </div>
        <button
          type="button"
          onClick={() => setWeekStart((current) => addDays(current, 7))}
          aria-label="Semaine suivante"
          className="rounded-control px-3 py-1 text-primary-text"
        >
          ›
        </button>
      </div>

      {isLoading ? (
        <p className="text-secondary-text">Chargement…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed border-separate border-spacing-1">
            <thead>
              <tr>
                <th scope="col" className="w-24">
                  <span className="sr-only">Repas</span>
                </th>
                {days.map((day) => (
                  <th key={day.toISOString()} scope="col" className="pb-1 text-xs font-medium text-secondary-text">
                    {capitalize(dayHeaderFormatter.format(day))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEAL_TYPE_OPTIONS.map((mealType) => (
                <tr key={mealType}>
                  <th scope="row" className="pr-2 text-left text-xs font-medium text-secondary-text">
                    {mealTypeLabel[mealType]}
                  </th>
                  {days.map((day) => {
                    const dayString = toDayString(day);
                    const selection = selectionMap.get(`${dayString}-${mealType}`);
                    return (
                      <td key={dayString}>
                        {selection ? (
                          <button
                            type="button"
                            onClick={() => setViewing(selection)}
                            className="block w-full text-left"
                            aria-label={`${mealTypeLabel[mealType]} du ${dayString} : ${selection.recipe.title}`}
                          >
                            <Card className="space-y-1 p-2">
                              <p className="text-xs font-medium leading-tight text-primary-text">{selection.recipe.title}</p>
                              <PillBadge
                                text={effortProfileLabel[selection.recipe.effortProfile]}
                                tint={effortProfileColorVar[selection.recipe.effortProfile]}
                              />
                            </Card>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPending({ date: dayString, mealType })}
                            aria-label={`Choisir un menu pour ${mealTypeLabel[mealType]} du ${dayString}`}
                            className="flex aspect-square w-full items-center justify-center rounded-control border border-dashed border-separator text-secondary-text"
                          >
                            +
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {errorMessage && <p className="text-center text-xs text-intensity-hard">{errorMessage}</p>}

      {pending && (
        <SuggestionModal
          pending={pending}
          onClose={() => setPending(null)}
          onPicked={(recipe) => {
            setErrorMessage(null);
            pickMutation.mutate({ date: pending.date, mealType: pending.mealType, recipeId: recipe.id });
          }}
        />
      )}

      {viewing && (
        <Modal title={`${mealTypeLabel[viewing.mealType]} — ${viewing.date.slice(0, 10)}`} onClose={() => setViewing(null)}>
          <div className="space-y-3">
            <p className="font-medium text-primary-text">{viewing.recipe.title}</p>
            <PillBadge
              text={effortProfileLabel[viewing.recipe.effortProfile]}
              tint={effortProfileColorVar[viewing.recipe.effortProfile]}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPending({ date: viewing.date.slice(0, 10), mealType: viewing.mealType });
                  setViewing(null);
                }}
                className="flex-1 rounded-control bg-brand py-2 text-sm font-semibold text-white"
              >
                Changer
              </button>
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  removeMutation.mutate({ date: viewing.date.slice(0, 10), mealType: viewing.mealType });
                }}
                className="flex-1 rounded-control bg-card-background py-2 text-sm font-semibold text-intensity-hard"
              >
                Retirer
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
