import { useState } from "react";
import { useAppStore } from "../state/appStore";
import { useDeletePlayer, usePlayers, usePositions } from "../api/hooks";
import type { Player } from "../api/types";
import { PlayerDrawer } from "../components/players/PlayerDrawer";

const AVAILABILITY_LABEL: Record<Player["availability"], string> = {
  AVAILABLE: "Tillgänglig",
  INJURED: "Skadad",
  SUSPENDED: "Avstängd",
  NOT_SELECTED: "Ej uttagen",
};

const AVAILABILITY_COLOR: Record<Player["availability"], string> = {
  AVAILABLE: "bg-emerald-500/15 text-emerald-400",
  INJURED: "bg-red-500/15 text-red-400",
  SUSPENDED: "bg-amber-500/15 text-amber-400",
  NOT_SELECTED: "bg-slate-500/15 text-slate-400",
};

export function Squad() {
  const teamId = useAppStore((s) => s.currentTeamId);
  const { data: players } = usePlayers(teamId ?? undefined);
  const { data: positions } = usePositions();
  const deletePlayer = useDeletePlayer(teamId ?? undefined);
  const [editingPlayer, setEditingPlayer] = useState<Player | "new" | null>(null);

  const positionByCode = Object.fromEntries((positions ?? []).map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Trupp</h1>
          <p className="mt-1 text-sm text-slate-400">{players?.length ?? 0} spelare i truppen.</p>
        </div>
        <button
          onClick={() => setEditingPlayer("new")}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-slate-950 hover:bg-accent/90"
        >
          + Ny spelare
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-raised text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Namn</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Fot</th>
              <th className="px-4 py-3">Längd</th>
              <th className="px-4 py-3">Duellspel</th>
              <th className="px-4 py-3">Huvudspel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {players?.map((p) => (
              <tr
                key={p.id}
                className="cursor-pointer hover:bg-white/5"
                onClick={() => setEditingPlayer(p)}
              >
                <td className="px-4 py-3 font-mono text-slate-300">{p.shirtNumber}</td>
                <td className="px-4 py-3 font-medium text-white">
                  {p.name}
                  {p.isGoalkeeper && <span className="ml-2 text-xs text-slate-500">MV</span>}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {p.primaryPositionId ? positionByCode[p.primaryPositionId]?.code : "-"}
                </td>
                <td className="px-4 py-3 text-slate-300">{p.dominantFoot}</td>
                <td className="px-4 py-3 text-slate-300">{p.heightCm ? `${p.heightCm} cm` : "-"}</td>
                <td className="px-4 py-3 text-slate-300">{p.duelStrength ?? "-"}</td>
                <td className="px-4 py-3 text-slate-300">{p.headingStrength ?? "-"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${AVAILABILITY_COLOR[p.availability]}`}>
                    {AVAILABILITY_LABEL[p.availability]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Ta bort ${p.name}?`)) deletePlayer.mutate(p.id);
                    }}
                    className="text-xs text-slate-500 hover:text-red-400"
                  >
                    Ta bort
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingPlayer && (
        <PlayerDrawer
          player={editingPlayer === "new" ? null : editingPlayer}
          onClose={() => setEditingPlayer(null)}
        />
      )}
    </div>
  );
}
