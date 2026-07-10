import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getShoppingList } from '../../api/nutrition';
import { addDays, mondayOfWeek, toDayString } from '../../lib/dateOnly';
import { groceryAisleLabel } from '../../lib/enumLabels';
import { Card } from '../../components/Card';

const weekRangeFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' });

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function GroceryListPage() {
  const [weekStart, setWeekStart] = useState(() => mondayOfWeek(new Date()));

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = toDayString(days[0]);
  const to = toDayString(days[6]);

  const { data, isLoading } = useQuery({
    queryKey: ['nutrition', 'shopping-list', from, to],
    queryFn: () => getShoppingList(from, to),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-xl font-bold text-primary-text">Liste de courses</h1>

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
      ) : data && data.aisles.length > 0 ? (
        <div className="space-y-3">
          {data.aisles.map((group) => (
            <Card key={group.aisle ?? 'autre'}>
              <p className="font-semibold text-primary-text">{group.aisle ? groceryAisleLabel[group.aisle] : 'Autres'}</p>
              <ul className="mt-2 space-y-1">
                {group.items.map((item) => (
                  <li key={item.name} className="text-sm text-secondary-text">
                    {item.name}
                    {item.amount != null ? ` — ${item.amount} ${item.unit ?? ''}`.trimEnd() : ''}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-secondary-text">Aucune recette sélectionnée cette semaine.</p>
      )}
    </div>
  );
}
