interface ChipGridProps<Item extends string | number> {
  items: Item[];
  selection: Item[];
  onChange: (selection: Item[]) => void;
  label: (item: Item) => string;
}

/** Port of TriCoachAI's `ChipGrid` — real `<button>`s (not click-handlers on plain text) so it's keyboard/VoiceOver operable. */
export function ChipGrid<Item extends string | number>({ items, selection, onChange, label }: ChipGridProps<Item>) {
  const toggle = (item: Item) => {
    if (selection.includes(item)) {
      onChange(selection.filter((s) => s !== item));
    } else {
      onChange([...selection, item]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isSelected = selection.includes(item);
        return (
          <button
            key={item}
            type="button"
            onClick={() => toggle(item)}
            aria-pressed={isSelected}
            className={`rounded-pill px-2 py-1.5 text-sm font-medium ${
              isSelected ? 'bg-brand text-white' : 'bg-secondary-background text-primary-text'
            }`}
          >
            {label(item)}
          </button>
        );
      })}
    </div>
  );
}
