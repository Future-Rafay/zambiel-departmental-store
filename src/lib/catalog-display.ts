export function parsePriceRappen(value?: string) {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  const francs = Number(normalized);
  return Number.isFinite(francs) && francs >= 0 ? Math.round(francs * 100) : undefined;
}

export function categoryProductTotals(
  categories: Array<{ id: string; parentId: string | null; productCount: number }>,
) {
  const children = new Map<string, string[]>();
  const direct = new Map(categories.map((category) => [category.id, category.productCount]));
  for (const category of categories) {
    if (!category.parentId) continue;
    children.set(category.parentId, [...(children.get(category.parentId) ?? []), category.id]);
  }

  const totals = new Map<string, number>();
  function total(id: string, ancestors = new Set<string>()): number {
    if (totals.has(id)) return totals.get(id)!;
    if (ancestors.has(id)) return direct.get(id) ?? 0;
    const path = new Set(ancestors).add(id);
    const value = (direct.get(id) ?? 0) + (children.get(id) ?? []).reduce((sum, child) => sum + total(child, path), 0);
    totals.set(id, value);
    return value;
  }
  for (const category of categories) total(category.id);
  return totals;
}
