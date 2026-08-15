import { useState } from "react";
import { useAppStore } from "../../state/appStore";
import { useCreateTacticalRole, usePositions, useUpdateTacticalRole } from "../../api/hooks";
import type { TacticalRole } from "../../api/types";

interface RoleDrawerProps {
  role: TacticalRole | null;
  onClose: () => void;
}

const emptyForm = {
  name: "",
  type: "SPECIAL" as TacticalRole["type"],
  positionId: null as string | null,
  color: "#38bdf8",
};

export function RoleDrawer({ role, onClose }: RoleDrawerProps) {
  const teamId = useAppStore((s) => s.currentTeamId);
  const { data: positions } = usePositions();
  const createRole = useCreateTacticalRole(teamId ?? undefined);
  const updateRole = useUpdateTacticalRole(teamId ?? undefined);

  const [form, setForm] = useState(
    role
      ? {
          name: role.name,
          type: role.type,
          positionId: role.positionId,
          color: role.color ?? "#38bdf8",
        }
      : emptyForm
  );

  const saving = createRole.isPending || updateRole.isPending;

  function handleSave() {
    if (!form.name.trim()) return;
    if (form.type === "POSITIONAL" && !form.positionId) return;
    const data = {
      name: form.name.trim(),
      type: form.type,
      positionId: form.type === "POSITIONAL" ? form.positionId : null,
      color: form.color,
    };
    if (role) {
      updateRole.mutate({ id: role.id, data }, { onSuccess: onClose });
    } else {
      createRole.mutate(data, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-surface-border bg-surface-raised shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 className="text-lg font-semibold text-white">{role ? "Redigera roll" : "Ny roll"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <Field label="Namn">
            <input
              autoFocus
              className="input"
              placeholder="T.ex. Blockerare bortre stolpen"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>

          <Field label="Typ">
            <select
              className="input"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as TacticalRole["type"], positionId: null })
              }
            >
              <option value="SPECIAL">Specialroll (fri instruktion)</option>
              <option value="POSITIONAL">Positionell roll (kopplad till startposition)</option>
            </select>
          </Field>

          {form.type === "POSITIONAL" && (
            <Field label="Position">
              <select
                className="input"
                value={form.positionId ?? ""}
                onChange={(e) => setForm({ ...form, positionId: e.target.value || null })}
              >
                <option value="">Välj position...</option>
                {positions?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Färg">
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="h-8 w-16 cursor-pointer rounded border border-surface-border bg-transparent"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-border px-5 py-4">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm text-slate-300 hover:text-white">
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || (form.type === "POSITIONAL" && !form.positionId)}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-slate-950 hover:bg-accent/90 disabled:opacity-50"
          >
            {saving ? "Sparar..." : "Spara"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      {children}
    </label>
  );
}
