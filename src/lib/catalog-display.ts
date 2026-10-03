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

export type HierarchicalCategory<T> = T & {
  depth: number;
  ancestorIds: string[];
  descendantIds: string[];
  path: string[];
};

export function categoryHierarchy<T extends { id: string; parentId: string | null }>(
  categories: T[],
  getName: (category: T) => string,
) {
  const ids = new Set(categories.map(({ id }) => id));
  const children = new Map<string, T[]>();
  const roots: T[] = [];

  for (const category of categories) {
    if (!category.parentId || !ids.has(category.parentId)) roots.push(category);
    else children.set(category.parentId, [...(children.get(category.parentId) ?? []), category]);
  }

  const ordered: Array<T & { depth: number; ancestorIds: string[]; path: string[] }> = [];
  const visited = new Set<string>();
  function visit(category: T, ancestorIds: string[], path: string[]) {
    if (visited.has(category.id)) return;
    visited.add(category.id);
    ordered.push({
      ...category,
      depth: ancestorIds.length,
      ancestorIds,
      path: [...path, getName(category)],
    });
    for (const child of children.get(category.id) ?? []) {
      visit(child, [...ancestorIds, category.id], [...path, getName(category)]);
    }
  }

  for (const root of roots) visit(root, [], []);
  for (const category of categories) visit(category, [], []);

  return ordered.map((category) => ({
    ...category,
    descendantIds: ordered
      .filter(({ ancestorIds }) => ancestorIds.includes(category.id))
      .map(({ id }) => id),
  })) as Array<HierarchicalCategory<T>>;
}
