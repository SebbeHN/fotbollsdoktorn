import { useEffect, useState } from "react";
import { usePositions, useDeleteRole, useUpdateInstruction, useUpdateRole } from "../../api/hooks";
import type { SetPieceRole } from "../../api/types";

interface RoleInspectorProps {
  role: SetPieceRole | undefined;
  variantId: string;
  onDeleted: () => void;
}

export function RoleInspector({ role, variantId, onDeleted }: RoleInspectorProps) {
  const { data: positions } = usePositions();
  const updateInstruction = useUpdateInstruction(variantId);
  const updateRole = useUpdateRole(variantId);
  const deleteRole = useDeleteRole(variantId);

  const [form, setForm] = useState({
    primary: "",
    secondary: "",
    onLossOfBall: "",
    timing: "",
    priority: "" as number | "",
  });
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!role) return;
    setForm({
      primary: role.instruction?.primary ?? "",
      secondary: role.instruction?.secondary ?? "",
      onLossOfBall: role.instruction?.onLossOfBall ?? "",
      timing: role.instruction?.timing ?? "",
      priority: role.instruction?.priority ?? "",
    });
    setLabel(role.label ?? "");
  }, [role?.id]);

  if (!role) {
    return (
      <div className="w-80 flex-shrink-0 border-l border-surface-border bg-surface-raised p-5 text-sm text-slate-500">
        Välj en roll på planen för att redigera instruktioner.
      </div>
    );
  }

  function saveInstruction() {
    updateInstruction.mutate({
      roleId: role!.id,
      data: {
        primary: form.primary || null,
        secondary: form.secondary || null,
        onLossOfBall: form.onLossOfBall || null,
        timing: form.timing || null,
        priority: form.priority === "" ? null : Number(form.priority),
      },
    });
  }

  return (
    <div className="w-80 flex-shrink-0 space-y-4 overflow-y-auto border-l border-surface-border bg-surface-raised p-5">
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500">
          {role.tacticalRole.type === "POSITIONAL" ? "Positionell roll" : "Specialroll"}
        </div>
        <div className="text-lg font-semibold text-white">{role.tacticalRole.name}</div>
        <div className="mt-1 text-sm text-slate-400">
          {role.resolvedPlayer
            ? `#${role.resolvedPlayer.shirtNumber} ${role.resolvedPlayer.name}`
            : "Ingen spelare tilldelad (via laguppställning)"}
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Tips: dra markören på planen, eller finjustera med piltangenterna (håll{" "}
          <kbd className="rounded border border-surface-border bg-surface px-1">Shift</kbd> för större steg).
        </div>
      </div>

      <label className="block">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Etikett (valfri)</div>
        <input
          className="input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => updateRole.mutate({ id: role.id, data: { label: label || null } })}
        />
      </label>

      {role.tacticalRole.type === "SPECIAL" && (
        <label className="block">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Formationsposition som fyller rollen
          </div>
          <select
            className="input"
            value={role.assignedPositionId ?? ""}
            onChange={(e) =>
              updateRole.mutate({ id: role.id, data: { assignedPositionId: e.target.value || null } })
            }
          >
            <option value="">- Ingen -</option>
            {positions?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Primär instruktion</div>
        <textarea
          className="input h-20"
          value={form.primary}
          onChange={(e) => setForm({ ...form, primary: e.target.value })}
          onBlur={saveInstruction}
        />
      </label>

      <label className="block">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Sekundär instruktion
        </div>
        <textarea
          className="input h-16"
          value={form.secondary}
          onChange={(e) => setForm({ ...form, secondary: e.target.value })}
          onBlur={saveInstruction}
        />
      </label>

      <label className="block">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Vid bollförlust</div>
        <textarea
          className="input h-16"
          value={form.onLossOfBall}
          onChange={(e) => setForm({ ...form, onLossOfBall: e.target.value })}
          onBlur={saveInstruction}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Timing</div>
          <input
            className="input"
            value={form.timing}
            onChange={(e) => setForm({ ...form, timing: e.target.value })}
            onBlur={saveInstruction}
          />
        </label>
        <label className="block">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Prioritet</div>
          <input
            type="number"
            className="input"
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: e.target.value === "" ? "" : Number(e.target.value) })
            }
            onBlur={saveInstruction}
          />
        </label>
      </div>

      <button
        className="w-full rounded-md border border-red-500/30 py-2 text-sm text-red-400 hover:bg-red-500/10"
        onClick={() => {
          if (confirm(`Ta bort rollen "${role.tacticalRole.name}" från denna variant?`)) {
            deleteRole.mutate(role.id, { onSuccess: onDeleted });
          }
        }}
      >
        Ta bort roll från planen
      </button>
    </div>
  );
}
