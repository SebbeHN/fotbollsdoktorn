import { useEffect, useState } from "react";
import { useAppStore } from "../state/appStore";
import {
  useCreateLineup,
  useLineups,
  usePlayers,
  usePositions,
  useSetLineupAssignments,
  useUpdateLineup,
} from "../api/hooks";

export function Lineups() {
  const teamId = useAppStore((s) => s.currentTeamId);
  const { data: lineups } = useLineups(teamId ?? undefined);
  const { data: positions } = usePositions();
  const { data: players } = usePlayers(teamId ?? undefined);
  const createLineup = useCreateLineup(teamId ?? undefined);
  const updateLineup = useUpdateLineup(teamId ?? undefined);
  const setAssignments = useSetLineupAssignments(teamId ?? undefined);

  const [selectedLineupId, setSelectedLineupId] = useState<string | null>(null);
  const [newLineupName, setNewLineupName] = useState("");

  useEffect(() => {
    if (!selectedLineupId && lineups && lineups.length > 0) {
      setSelectedLineupId(lineups.find((l) => l.isDefault)?.id ?? lineups[0].id);
    }
  }, [lineups, selectedLineupId]);

  const lineup = lineups?.find((l) => l.id === selectedLineupId);

  function assignedPlayerId(positionId: string) {
    return lineup?.assignments.find((a) => a.positionId === positionId)?.playerId ?? "";
  }

  function handleAssign(positionId: string, playerId: string) {
    if (!lineup) return;
    const nextAssignments = (positions ?? []).map((p) => ({
      positionId: p.id,
      playerId: p.id === positionId ? (playerId || null) : assignedPlayerId(p.id) || null,
    }));
    setAssignments.mutate({ lineupId: lineup.id, assignments: nextAssignments });
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold text-white">Laguppställningar</h1>
      <p className="mt-1 text-sm text-slate-400">
        Vem som spelar var. Ändringar här slår igenom direkt på alla fasta situationer som utgår från
        rollernas positioner.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <select
          className="input max-w-xs"
          value={selectedLineupId ?? ""}
          onChange={(e) => setSelectedLineupId(e.target.value)}
        >
          {lineups?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} {l.isDefault ? "(standard)" : ""}
            </option>
          ))}
        </select>

        <input
          className="input max-w-xs"
          placeholder="Ny uppställning..."
          value={newLineupName}
          onChange={(e) => setNewLineupName(e.target.value)}
        />
        <button
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-slate-950 hover:bg-accent/90 disabled:opacity-50"
          disabled={!newLineupName.trim()}
          onClick={() => {
            createLineup.mutate(
              { name: newLineupName, formation: "4-3-3" },
              { onSuccess: (l) => setSelectedLineupId(l.id) }
            );
            setNewLineupName("");
          }}
        >
          + Ny uppställning
        </button>

        {lineup && !lineup.isDefault && (
          <button
            className="text-sm text-slate-400 hover:text-accent"
            onClick={() => updateLineup.mutate({ id: lineup.id, data: { isDefault: true } })}
          >
            Sätt som standard
          </button>
        )}
      </div>

      {lineup && (
        <div className="mt-6 overflow-hidden rounded-lg border border-surface-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-raised text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Spelare</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {positions?.map((pos) => (
                <tr key={pos.id}>
                  <td className="px-4 py-3 font-medium text-white">
                    {pos.name} <span className="text-slate-500">({pos.code})</span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="input max-w-xs"
                      value={assignedPlayerId(pos.id)}
                      onChange={(e) => handleAssign(pos.id, e.target.value)}
                    >
                      <option value="">- Ingen -</option>
                      {players?.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.shirtNumber} {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
