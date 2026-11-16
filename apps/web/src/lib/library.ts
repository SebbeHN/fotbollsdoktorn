import type { SetPieceCategory, SetPieceSummary } from "../api/types";

export interface LibraryGroup {
  root: SetPieceCategory;
  /** Sub-categories (Hörnor, Frisparkar, …); a root that directly holds set pieces gets a synthetic entry. */
  categories: { category: SetPieceCategory; setPieces: SetPieceSummary[] }[];
}

/** Flattens the category tree (Offensiva/Defensiva → Hörnor → Hörna vänster → varianter) into
 * root groups, ordered offensive first. */
export function groupLibrary(categories: SetPieceCategory[] | undefined): LibraryGroup[] {
  const all = categories ?? [];
  const roots = all.filter((c) => !c.parentId);
  const order = { OFFENSIVE: 0, DEFENSIVE: 1, CUSTOM: 2 } as const;
  roots.sort((a, b) => order[a.type] - order[b.type] || a.name.localeCompare(b.name, "sv"));

  return roots.map((root) => {
    const children = all.filter((c) => c.parentId === root.id);
    const entries = children.map((category) => ({ category, setPieces: category.setPieces ?? [] }));
    if (root.setPieces?.length) entries.unshift({ category: root, setPieces: root.setPieces });
    return { root, categories: entries };
  });
}

export function countVariants(group: LibraryGroup) {
  return group.categories.reduce(
    (sum, c) => sum + c.setPieces.reduce((s, sp) => s + sp.variants.length, 0),
    0
  );
}

export function genomgangUrl(variantIds: string[], lineupId?: string) {
  const params = new URLSearchParams({ v: variantIds.join(",") });
  if (lineupId) params.set("lineup", lineupId);
  return `/genomgang/spela?${params.toString()}`;
}
