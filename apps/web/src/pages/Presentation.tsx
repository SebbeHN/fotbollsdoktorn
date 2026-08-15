import { useMemo, useState } from "react";
import { useAppStore } from "../state/appStore";
import { useSetPieceCategories, useVariant } from "../api/hooks";
import { PitchCanvas, type PitchView } from "./editor/PitchCanvas";

export function Presentation() {
  const teamId = useAppStore((s) => s.currentTeamId);
  const { data: categories } = useSetPieceCategories(teamId ?? undefined);
  const [variantId, setVariantId] = useState<string | undefined>(undefined);
  const [stageIndex, setStageIndex] = useState(0);

  const options = useMemo(() => {
    const list: { id: string; label: string }[] = [];
    for (const cat of categories ?? []) {
      for (const sp of cat.setPieces ?? []) {
        for (const v of sp.variants) {
          list.push({ id: v.id, label: `${sp.name} — ${v.name}` });
        }
      }
    }
    return list;
  }, [categories]);

  const { data: variant, isLoading } = useVariant(variantId, undefined);
  const stages = variant?.stages ?? [];
  const stage = stages[stageIndex] ?? stages[0] ?? null;

  function selectVariant(id: string) {
    setVariantId(id || undefined);
    setStageIndex(0);
  }

  if (!variantId) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold text-white">Presentation</h1>
        <p className="mt-2 text-sm text-slate-400">
          Välj en fast situation att gå igenom med spelartruppen, steg för steg.
        </p>
        <select
          className="input mt-6 max-w-md"
          value={variantId ?? ""}
          onChange={(e) => selectVariant(e.target.value)}
        >
          <option value="">Välj variant...</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (isLoading || !variant) {
    return <div className="p-8 text-slate-500">Laddar...</div>;
  }

  const view: PitchView = /hörn|corner|frispark|free.?kick/i.test(variant.setPiece?.name ?? "")
    ? "box"
    : "full";

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {variant.setPiece?.name} — {variant.name}
          </h1>
          {stage?.triggerDescription && (
            <p className="mt-1 text-sm text-slate-400">Utlöses av: {stage.triggerDescription}</p>
          )}
        </div>
        <button
          onClick={() => selectVariant("")}
          className="rounded-md border border-surface-border px-3 py-1.5 text-sm text-slate-300 hover:text-accent"
        >
          Byt variant
        </button>
      </div>

      <div className="mt-6 flex flex-1 gap-8 overflow-hidden">
        <div className="flex flex-1 items-center justify-center overflow-auto">
          {stage && (
            <PitchCanvas
              roles={variant.roles}
              positions={stage.positions}
              movements={stage.movements}
              zones={variant.zones}
              view={view}
              selectedRoleId={null}
              drawMode={false}
              onSelectRole={() => {}}
              onMoveRole={() => {}}
              onMoveBall={() => {}}
              onDrawArrow={() => {}}
            />
          )}
        </div>

        <div className="w-80 shrink-0 overflow-auto">
          <h2 className="text-lg font-semibold text-white">Instruktioner</h2>
          <div className="mt-3 space-y-3">
            {variant.roles.map((role) => (
              <div key={role.id} className="rounded-lg border border-surface-border bg-surface-raised p-3">
                <div className="text-sm font-medium text-white">
                  {role.resolvedPlayer ? `#${role.resolvedPlayer.shirtNumber} ${role.resolvedPlayer.name}` : "?"}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    ({role.label ?? role.tacticalRole.name})
                  </span>
                </div>
                {role.instruction?.primary && (
                  <p className="mt-1 text-sm text-slate-300">{role.instruction.primary}</p>
                )}
                {role.instruction?.secondary && (
                  <p className="mt-1 text-xs text-slate-400">{role.instruction.secondary}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4 border-t border-surface-border pt-4">
        <button
          disabled={stageIndex === 0}
          onClick={() => setStageIndex((i) => Math.max(0, i - 1))}
          className="rounded-md border border-surface-border px-4 py-2 text-sm text-slate-300 disabled:opacity-30"
        >
          ← Föregående steg
        </button>
        <span className="text-sm text-slate-400">
          Steg {stageIndex + 1} av {stages.length}
          {stage ? ` — ${stage.name}` : ""}
        </span>
        <button
          disabled={stageIndex >= stages.length - 1}
          onClick={() => setStageIndex((i) => Math.min(stages.length - 1, i + 1))}
          className="rounded-md border border-surface-border px-4 py-2 text-sm text-slate-300 disabled:opacity-30"
        >
          Nästa steg →
        </button>
      </div>
    </div>
  );
}
