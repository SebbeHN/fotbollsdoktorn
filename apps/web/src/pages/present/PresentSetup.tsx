import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppStore } from "../../state/appStore";
import { useLineups, useSetPieceCategories } from "../../api/hooks";
import { countVariants, genomgangUrl, groupLibrary } from "../../lib/library";

/** Pick which situations to run through with the squad, then start the TV walkthrough. */
export function PresentSetup() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const teamId = useAppStore((s) => s.currentTeamId);
  const defaultLineupId = useAppStore((s) => s.currentLineupId);
  const { data: categories, isLoading } = useSetPieceCategories(teamId ?? undefined);
  const { data: lineups } = useLineups(teamId ?? undefined);

  const groups = useMemo(() => groupLibrary(categories), [categories]);
  const allVariantIds = useMemo(
    () => groups.flatMap((g) => g.categories.flatMap((c) => c.setPieces.flatMap((sp) => sp.variants.map((v) => v.id)))),
    [groups]
  );

  const preselected = params.get("v")?.split(",").filter(Boolean) ?? [];
  const [selected, setSelected] = useState<string[]>(preselected);
  const [lineupId, setLineupId] = useState<string | undefined>(undefined);

  const orderedSelection = allVariantIds.filter((id) => selected.includes(id));

  function toggle(ids: string[], on: boolean) {
    setSelected((prev) => (on ? [...new Set([...prev, ...ids])] : prev.filter((id) => !ids.includes(id))));
  }

  function start() {
    if (orderedSelection.length === 0) return;
    // Called from the click handler so the browser allows entering full screen.
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    navigate(genomgangUrl(orderedSelection, lineupId ?? defaultLineupId ?? undefined));
  }

  return (
    <div className="mx-auto max-w-4xl p-8 pb-32">
      <h1 className="text-3xl font-bold text-white">Genomgång på TV</h1>
      <p className="mt-1 text-slate-400">
        Välj de fasta situationer ni ska gå igenom. Presentationen visas i helskärm och styrs med piltangenter eller
        klicker.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Laguppställning
          <select
            className="input !w-auto"
            value={lineupId ?? defaultLineupId ?? ""}
            onChange={(e) => setLineupId(e.target.value)}
          >
            {lineups?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.isDefault ? " (standard)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button className="text-sm text-accent hover:underline" onClick={() => setSelected(allVariantIds)}>
          Välj alla
        </button>
        <button className="text-sm text-slate-400 hover:underline" onClick={() => setSelected([])}>
          Rensa
        </button>
      </div>

      {isLoading && <p className="mt-8 text-slate-500">Laddar…</p>}
      {!isLoading && allVariantIds.length === 0 && (
        <div className="mt-8 rounded-lg border border-dashed border-surface-border p-8 text-center text-slate-400">
          Du har inga fasta situationer ännu. Skapa din första under{" "}
          <button className="text-accent underline" onClick={() => navigate("/fasta-situationer")}>
            Fasta situationer
          </button>
          .
        </div>
      )}

      <div className="mt-6 space-y-8">
        {groups
          .filter((g) => countVariants(g) > 0)
          .map((group) => (
            <section key={group.root.id}>
              <h2
                className={`text-sm font-bold uppercase tracking-[0.2em] ${
                  group.root.type === "DEFENSIVE" ? "text-sky-300" : "text-amber-300"
                }`}
              >
                {group.root.name}
              </h2>
              <div className="mt-3 space-y-4">
                {group.categories
                  .filter((c) => c.setPieces.some((sp) => sp.variants.length > 0))
                  .map(({ category, setPieces }) => {
                    const ids = setPieces.flatMap((sp) => sp.variants.map((v) => v.id));
                    const allOn = ids.every((id) => selected.includes(id));
                    return (
                      <div key={category.id} className="rounded-xl border border-surface-border bg-surface-raised p-4">
                        <label className="flex cursor-pointer items-center gap-3 font-semibold text-white">
                          <input type="checkbox" checked={allOn} onChange={(e) => toggle(ids, e.target.checked)} />
                          {category.name}
                        </label>
                        <div className="mt-3 space-y-3 pl-7">
                          {setPieces
                            .filter((sp) => sp.variants.length > 0)
                            .map((sp) => (
                              <div key={sp.id}>
                                <div className="text-sm text-slate-400">{sp.name}</div>
                                <div className="mt-1 flex flex-wrap gap-2">
                                  {sp.variants.map((v) => {
                                    const on = selected.includes(v.id);
                                    return (
                                      <label
                                        key={v.id}
                                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                                          on
                                            ? "border-accent bg-accent/15 text-white"
                                            : "border-surface-border text-slate-300 hover:border-slate-500"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={on}
                                          onChange={(e) => toggle([v.id], e.target.checked)}
                                        />
                                        {v.name}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
      </div>

      <div className="fixed bottom-0 left-60 right-0 border-t border-surface-border bg-surface/95 px-8 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <span className="text-slate-300">
            {orderedSelection.length === 0 ? "Inga situationer valda" : `${orderedSelection.length} valda`}
          </span>
          <button
            onClick={start}
            disabled={orderedSelection.length === 0}
            className="rounded-lg bg-accent px-6 py-3 text-base font-bold text-slate-950 disabled:opacity-30"
          >
            ▶ Starta genomgång
          </button>
        </div>
      </div>
    </div>
  );
}
