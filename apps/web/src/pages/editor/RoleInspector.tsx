import { useEffect, useRef, useState } from "react";
import { useDeleteRole, useUpdateInstruction, useUpdateRole } from "../../api/hooks";
import type { LineupAssignment, SetPieceRole } from "../../api/types";

interface RoleInspectorProps {
  role: SetPieceRole | undefined;
  /** Players in the lineup currently shown on the pitch; only these can be picked for a role. */
  lineupAssignments: LineupAssignment[];
  /** Positions already used by other roles in this variant. */
  usedPositionIds: string[];
  variantId: string;
  onDeleted: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSaved: () => void;
}

type Form = { primary: string; secondary: string; onLossOfBall: string; timing: string };

const FIELDS: { key: keyof Form; label: string; rows: number; placeholder: string }[] = [
  { key: "primary", label: "Din uppgift", rows: 4, placeholder: "Vad ska spelaren göra? Skriv som du säger det på genomgången." },
  { key: "secondary", label: "Sedan / om…", rows: 2, placeholder: "t.ex. Är ytan blockerad, fortsätt mot…" },
  { key: "onLossOfBall", label: "Om vi tappar bollen", rows: 2, placeholder: "t.ex. Direkt återpress i 3 sekunder" },
  { key: "timing", label: "Timing", rows: 1, placeholder: "t.ex. Starta när hörnläggaren tar sitt näst sista steg" },
];

export function RoleInspector({
  role,
  lineupAssignments,
  usedPositionIds,
  variantId,
  onDeleted,
  onPrev,
  onNext,
  onSaved,
}: RoleInspectorProps) {
  const updateInstruction = useUpdateInstruction(variantId);
  const updateRole = useUpdateRole(variantId);
  const deleteRole = useDeleteRole(variantId);

  const [form, setForm] = useState<Form>({ primary: "", secondary: "", onLossOfBall: "", timing: "" });
  const [label, setLabel] = useState("");
  const formRef = useRef(form);
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const roleIdRef = useRef<string | undefined>(undefined);
  const primaryRef = useRef<HTMLTextAreaElement>(null);

  function flush() {
    window.clearTimeout(timer.current);
    const roleId = roleIdRef.current;
    if (!dirty.current || !roleId) return;
    dirty.current = false;
    const f = formRef.current;
    onSaved();
    updateInstruction.mutate({
      roleId,
      data: {
        primary: f.primary || null,
        secondary: f.secondary || null,
        onLossOfBall: f.onLossOfBall || null,
        timing: f.timing || null,
      },
    });
  }

  // Switching player (or leaving the inspector) saves whatever is still pending.
  useEffect(() => {
    flush();
    roleIdRef.current = role?.id;
    if (!role) return;
    const next = {
      primary: role.instruction?.primary ?? "",
      secondary: role.instruction?.secondary ?? "",
      onLossOfBall: role.instruction?.onLossOfBall ?? "",
      timing: role.instruction?.timing ?? "",
    };
    formRef.current = next;
    setForm(next);
    setLabel(role.label ?? "");
    primaryRef.current?.focus();
    return flush;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role?.id]);

  if (!role) {
    return (
      <div className="w-80 flex-shrink-0 border-l border-surface-border bg-surface-raised p-5 text-sm text-slate-500">
        <div className="text-base font-medium text-slate-300">Klicka på en spelare</div>
        <p className="mt-1">…så skriver du direkt vad spelaren ska göra. Allt sparas automatiskt.</p>
        <ul className="mt-4 space-y-1.5 text-xs">
          <li>
            <kbd className="rounded bg-surface px-1">V</kbd> flytta spelare
          </li>
          <li>
            <kbd className="rounded bg-surface px-1">A</kbd> rita pil: dra från spelare eller boll
          </li>
          <li>
            <kbd className="rounded bg-surface px-1">1</kbd>–<kbd className="rounded bg-surface px-1">4</kbd> välj pilens typ
          </li>
          <li>
            <kbd className="rounded bg-surface px-1">Delete</kbd> tar bort vald pil
          </li>
        </ul>
      </div>
    );
  }

  function change(key: keyof Form, value: string) {
    const next = { ...formRef.current, [key]: value };
    formRef.current = next;
    dirty.current = true;
    setForm(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 700);
  }

  const candidates = [...lineupAssignments]
    .filter((a) => a.player)
    .sort((a, b) => a.position.sortOrder - b.position.sortOrder);
  const assignedInLineup = candidates.some((a) => a.positionId === role.assignedPositionId);

  return (
    <div className="flex w-80 flex-shrink-0 flex-col overflow-hidden border-l border-surface-border bg-surface-raised">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {role.tacticalRole.type === "POSITIONAL" ? "Positionell roll" : "Egen roll"}
          </div>
          <div className="text-lg font-semibold text-white">{role.label ?? role.tacticalRole.name}</div>
        </div>

        <label className="block rounded-lg border border-accent/40 bg-accent/5 p-3">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-accent">Vem spelar rollen?</div>
          <select
            className="input"
            value={assignedInLineup ? (role.assignedPositionId ?? "") : ""}
            onChange={(e) => {
              onSaved();
              updateRole.mutate({ id: role.id, data: { assignedPositionId: e.target.value || null } });
            }}
          >
            <option value="">– Ingen vald –</option>
            {candidates.map((a) => {
              const taken = usedPositionIds.includes(a.positionId) && a.positionId !== role.assignedPositionId;
              return (
                <option key={a.positionId} value={a.positionId} disabled={taken}>
                  #{a.player!.shirtNumber} {a.player!.name} ({a.position.code}){taken ? " – redan placerad" : ""}
                </option>
              );
            })}
          </select>
          <div className="mt-1 text-xs text-slate-500">
            {role.assignedPositionId && !assignedInLineup
              ? "Den valda positionen saknar spelare i den här laguppställningen."
              : "Spelarna kommer från vald laguppställning."}
          </div>
        </label>

        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{f.label}</div>
            <textarea
              ref={f.key === "primary" ? primaryRef : undefined}
              className="input resize-none"
              rows={f.rows}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={(e) => change(f.key, e.target.value)}
              onBlur={flush}
            />
          </label>
        ))}

        <details className="rounded-md border border-surface-border px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-slate-500">
            Fler inställningar
          </summary>
          <div className="mt-3 space-y-3">
            <label className="block">
              <div className="mb-1 text-xs text-slate-500">Eget namn på rollen</div>
              <input
                className="input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={() => label !== (role.label ?? "") && updateRole.mutate({ id: role.id, data: { label: label || null } })}
              />
            </label>
            <button
              className="w-full rounded-md border border-red-500/30 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
              onClick={() => {
                if (confirm(`Ta bort "${role.label ?? role.tacticalRole.name}" från den här situationen?`)) {
                  deleteRole.mutate(role.id, { onSuccess: onDeleted });
                }
              }}
            >
              Ta bort spelaren från planen
            </button>
          </div>
        </details>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-surface-border p-3">
        <button onClick={onPrev} className="rounded-md border border-surface-border px-3 py-1.5 text-sm text-slate-300 hover:text-white">
          ← Förra
        </button>
        <span className="text-xs text-slate-500">Sparas automatiskt</span>
        <button onClick={onNext} className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-slate-950">
          Nästa spelare →
        </button>
      </div>
    </div>
  );
}
