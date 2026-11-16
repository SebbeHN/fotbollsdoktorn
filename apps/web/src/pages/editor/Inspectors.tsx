import { useEffect, useState } from "react";
import type { ArrowType, SetPieceMovement, SetPiecePosition, SetPieceRole } from "../../api/types";
import { ARROW_LABELS } from "./PitchCanvas";

export const ARROW_SWATCH: Record<ArrowType, string> = {
  RUN: "border-yellow-300",
  ALT_RUN: "border-yellow-300 border-dashed",
  PASS: "border-white",
  BLOCK: "border-orange-400 border-dotted",
};

export const ARROW_ORDER: ArrowType[] = ["RUN", "ALT_RUN", "PASS", "BLOCK"];

export function ArrowTypeChips({
  value,
  onChange,
  showKeys = false,
}: {
  value: ArrowType;
  onChange: (type: ArrowType) => void;
  showKeys?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {ARROW_ORDER.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${
            value === t ? "border-accent bg-accent/15 text-white" : "border-surface-border text-slate-300 hover:text-white"
          }`}
        >
          <span className={`inline-block w-5 border-t-[3px] ${ARROW_SWATCH[t]}`} />
          {ARROW_LABELS[t]}
          {showKeys && <kbd className="rounded bg-surface px-1 text-[10px] text-slate-500">{i + 1}</kbd>}
        </button>
      ))}
    </div>
  );
}

const panel = "w-80 flex-shrink-0 space-y-4 overflow-y-auto border-l border-surface-border bg-surface-raised p-5";

export function MovementInspector({
  movement,
  roles,
  onChangeType,
  onDelete,
}: {
  movement: SetPieceMovement;
  roles: SetPieceRole[];
  onChangeType: (type: ArrowType) => void;
  onDelete: () => void;
}) {
  const role = roles.find((r) => r.id === movement.setPieceRoleId);
  const who = role
    ? `${role.resolvedPlayer ? `#${role.resolvedPlayer.shirtNumber} ${role.resolvedPlayer.name}` : ""} ${role.label ?? role.tacticalRole.name}`.trim()
    : "Boll / motståndare";
  return (
    <div className={panel}>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">Pil</div>
        <div className="text-lg font-semibold text-white">{who}</div>
      </div>
      <div>
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Typ</div>
        <ArrowTypeChips value={movement.type} onChange={onChangeType} />
      </div>
      <p className="text-xs text-slate-500">
        Dra i de blå punkterna på planen för att flytta start eller slut. Pilen ser ut så här på TV:n.
      </p>
      <button
        className="w-full rounded-md border border-red-500/30 py-2 text-sm text-red-400 hover:bg-red-500/10"
        onClick={onDelete}
      >
        Ta bort pil (Delete)
      </button>
    </div>
  );
}

export function OpponentInspector({
  opponent,
  onChangeLabel,
  onDelete,
}: {
  opponent: SetPiecePosition;
  onChangeLabel: (label: string) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(opponent.label ?? "M");
  useEffect(() => setLabel(opponent.label ?? "M"), [opponent.id, opponent.label]);
  return (
    <div className={panel}>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">Motståndare</div>
        <div className="text-lg font-semibold text-white">Röd markör</div>
      </div>
      <label className="block">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Text på markören</div>
        <input
          className="input"
          maxLength={4}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => label !== (opponent.label ?? "M") && onChangeLabel(label.trim() || "M")}
        />
        <div className="mt-1 text-xs text-slate-500">Till exempel M (motståndare) eller MV (målvakt).</div>
      </label>
      <p className="text-xs text-slate-500">
        Vill du visa vart motståndaren rör sig? Välj Pil-verktyget och dra från markören.
      </p>
      <button
        className="w-full rounded-md border border-red-500/30 py-2 text-sm text-red-400 hover:bg-red-500/10"
        onClick={onDelete}
      >
        Ta bort markör (Delete)
      </button>
    </div>
  );
}
