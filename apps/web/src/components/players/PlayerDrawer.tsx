import { useState } from "react";
import { useAppStore } from "../../state/appStore";
import { useCreatePlayer, usePositions, useUpdatePlayer } from "../../api/hooks";
import type { Player } from "../../api/types";

interface PlayerDrawerProps {
  player: Player | null;
  onClose: () => void;
}

const emptyForm = {
  name: "",
  shirtNumber: 0,
  isGoalkeeper: false,
  primaryPositionId: null as string | null,
  secondaryPositionIds: [] as string[],
  dominantFoot: "RIGHT" as Player["dominantFoot"],
  heightCm: null as number | null,
  duelStrength: null as number | null,
  headingStrength: null as number | null,
  notes: "" as string | null,
  availability: "AVAILABLE" as Player["availability"],
};

export function PlayerDrawer({ player, onClose }: PlayerDrawerProps) {
  const teamId = useAppStore((s) => s.currentTeamId);
  const { data: positions } = usePositions();
  const createPlayer = useCreatePlayer(teamId ?? undefined);
  const updatePlayer = useUpdatePlayer(teamId ?? undefined);

  const [form, setForm] = useState(
    player
      ? {
          name: player.name,
          shirtNumber: player.shirtNumber,
          isGoalkeeper: player.isGoalkeeper,
          primaryPositionId: player.primaryPositionId,
          secondaryPositionIds: player.secondaryPositionIds,
          dominantFoot: player.dominantFoot,
          heightCm: player.heightCm,
          duelStrength: player.duelStrength,
          headingStrength: player.headingStrength,
          notes: player.notes,
          availability: player.availability,
        }
      : emptyForm
  );

  const saving = createPlayer.isPending || updatePlayer.isPending;

  function handleSave() {
    if (!form.name.trim()) return;
    if (player) {
      updatePlayer.mutate({ id: player.id, data: form }, { onSuccess: onClose });
    } else {
      createPlayer.mutate(form, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-surface-border bg-surface-raised shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
          <h2 className="text-lg font-semibold text-white">{player ? "Redigera spelare" : "Ny spelare"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <Field label="Namn">
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tröjnummer">
              <input
                type="number"
                className="input"
                value={form.shirtNumber}
                onChange={(e) => setForm({ ...form, shirtNumber: Number(e.target.value) })}
              />
            </Field>
            <Field label="Längd (cm)">
              <input
                type="number"
                className="input"
                value={form.heightCm ?? ""}
                onChange={(e) =>
                  setForm({ ...form, heightCm: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>
          </div>

          <Field label="Primär position">
            <select
              className="input"
              value={form.primaryPositionId ?? ""}
              onChange={(e) => setForm({ ...form, primaryPositionId: e.target.value || null })}
            >
              <option value="">-</option>
              {positions?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sekundära positioner">
            <select
              multiple
              className="input h-24"
              value={form.secondaryPositionIds}
              onChange={(e) =>
                setForm({
                  ...form,
                  secondaryPositionIds: Array.from(e.target.selectedOptions).map((o) => o.value),
                })
              }
            >
              {positions?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Dominant fot">
              <select
                className="input"
                value={form.dominantFoot}
                onChange={(e) => setForm({ ...form, dominantFoot: e.target.value as Player["dominantFoot"] })}
              >
                <option value="RIGHT">Höger</option>
                <option value="LEFT">Vänster</option>
                <option value="BOTH">Båda</option>
              </select>
            </Field>
            <Field label="Status">
              <select
                className="input"
                value={form.availability}
                onChange={(e) =>
                  setForm({ ...form, availability: e.target.value as Player["availability"] })
                }
              >
                <option value="AVAILABLE">Tillgänglig</option>
                <option value="INJURED">Skadad</option>
                <option value="SUSPENDED">Avstängd</option>
                <option value="NOT_SELECTED">Ej uttagen</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Duellspel (1–5)">
              <select
                className="input"
                value={form.duelStrength ?? ""}
                onChange={(e) =>
                  setForm({ ...form, duelStrength: e.target.value ? Number(e.target.value) : null })
                }
              >
                <option value="">-</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Huvudspel (1–5)">
              <select
                className="input"
                value={form.headingStrength ?? ""}
                onChange={(e) =>
                  setForm({ ...form, headingStrength: e.target.value ? Number(e.target.value) : null })
                }
              >
                <option value="">-</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Målvakt">
            <input
              type="checkbox"
              checked={form.isGoalkeeper}
              onChange={(e) => setForm({ ...form, isGoalkeeper: e.target.checked })}
            />
          </Field>

          <Field label="Anteckningar">
            <textarea
              className="input h-24"
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-surface-border px-5 py-4">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm text-slate-300 hover:text-white">
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
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
