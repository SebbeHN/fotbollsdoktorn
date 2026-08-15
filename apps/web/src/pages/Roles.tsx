import { useState } from "react";
import { useAppStore } from "../state/appStore";
import { useDeleteTacticalRole, useTacticalRoles } from "../api/hooks";
import type { TacticalRole } from "../api/types";
import { RoleDrawer } from "../components/roles/RoleDrawer";

export function Roles() {
  const teamId = useAppStore((s) => s.currentTeamId);
  const { data: roles } = useTacticalRoles(teamId ?? undefined);
  const deleteRole = useDeleteTacticalRole(teamId ?? undefined);
  const [editingRole, setEditingRole] = useState<TacticalRole | "new" | null>(null);

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Roller</h1>
          <p className="mt-1 text-sm text-slate-400">
            {roles?.length ?? 0} instruktionsroller tillgängliga för fasta situationer.
          </p>
        </div>
        <button
          onClick={() => setEditingRole("new")}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-slate-950 hover:bg-accent/90"
        >
          + Ny roll
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-surface-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-raised text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3" />
              <th className="px-4 py-3">Namn</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {roles?.map((r) => (
              <tr key={r.id} className="cursor-pointer hover:bg-white/5" onClick={() => setEditingRole(r)}>
                <td className="px-4 py-3">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: r.color ?? "#38bdf8" }}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-white">
                  {r.name}
                  {r.teamId === null && (
                    <span className="ml-2 rounded bg-slate-700/50 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">
                      standard
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {r.type === "POSITIONAL" ? "Positionell" : "Specialroll"}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {r.position ? `${r.position.name} (${r.position.code})` : "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Ta bort rollen "${r.name}"?`)) deleteRole.mutate(r.id);
                    }}
                    className="text-xs text-slate-500 hover:text-red-400"
                  >
                    Ta bort
                  </button>
                </td>
              </tr>
            ))}
            {roles?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Inga roller ännu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingRole && (
        <RoleDrawer role={editingRole === "new" ? null : editingRole} onClose={() => setEditingRole(null)} />
      )}
    </div>
  );
}
