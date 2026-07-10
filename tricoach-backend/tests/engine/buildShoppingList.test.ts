import { buildShoppingList } from '../../src/modules/nutrition/engine/buildShoppingList';

describe('buildShoppingList', () => {
  it('sums quantities for the same name and unit', () => {
    const groups = buildShoppingList([
      { name: 'Riz', amount: 200, unit: 'g', aisle: 'GROCERY' },
      { name: 'Riz', amount: 150, unit: 'g', aisle: 'GROCERY' },
    ]);
    expect(groups).toEqual([{ aisle: 'GROCERY', items: [{ name: 'Riz', amount: 350, unit: 'g' }] }]);
  });

  it('keeps the same name with different units as separate lines', () => {
    const groups = buildShoppingList([
      { name: 'Oignon', amount: 2, unit: 'unité', aisle: 'PRODUCE' },
      { name: 'Oignon', amount: 100, unit: 'g', aisle: 'PRODUCE' },
    ]);
    expect(groups[0]!.items).toHaveLength(2);
  });

  it('leaves the total null when either occurrence of the same name+unit has no quantity', () => {
    const groups = buildShoppingList([
      { name: 'Sel', amount: null, unit: 'g', aisle: 'GROCERY' },
      { name: 'Sel', amount: 5, unit: 'g', aisle: 'GROCERY' },
    ]);
    expect(groups).toEqual([{ aisle: 'GROCERY', items: [{ name: 'Sel', amount: null, unit: 'g' }] }]);
  });

  it('groups items by aisle in store-walking order, unassigned last', () => {
    const groups = buildShoppingList([
      { name: 'Surgelés petits pois', amount: 200, unit: 'g', aisle: 'FROZEN' },
      { name: 'Blanc de poulet', amount: 400, unit: 'g', aisle: 'BUTCHER' },
      { name: 'Poivron', amount: 2, unit: 'unité', aisle: 'PRODUCE' },
      { name: 'Mystère', amount: null, unit: null, aisle: null },
    ]);
    expect(groups.map((g) => g.aisle)).toEqual(['PRODUCE', 'BUTCHER', 'FROZEN', null]);
  });

  it('sorts items alphabetically within an aisle group', () => {
    const groups = buildShoppingList([
      { name: 'Poivron', amount: 1, unit: 'unité', aisle: 'PRODUCE' },
      { name: 'Ail', amount: 1, unit: 'gousse', aisle: 'PRODUCE' },
    ]);
    expect(groups[0]!.items.map((i) => i.name)).toEqual(['Ail', 'Poivron']);
  });

  it('returns an empty list for no ingredients', () => {
    expect(buildShoppingList([])).toEqual([]);
  });
});
