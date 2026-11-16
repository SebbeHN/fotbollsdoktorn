import { Link } from "react-router-dom";
import { useAppStore } from "../../state/appStore";
import { useTacticalRoles } from "../../api/hooks";
import type { SetPieceRole } from "../../api/types";

interface ToolPaletteProps {
  existingRoles: SetPieceRole[];
  selectedRoleId: string | null;
  onSelectRole: (id: string) => void;
  onAddRole: (tacticalRoleId: string) => void;
}

/** Left column: the players on the pitch as a checklist (✓ = instruction written), plus a picker for more. */
export function ToolPalette({ existingRoles, selectedRoleId, onSelectRole, onAddRole }: ToolPaletteProps) {
  const teamId = useAppStore((s) => s.currentTeamId);
  const { data: tacticalRoles } = useTacticalRoles(teamId ?? undefined);

  const usedIds = new Set(existingRoles.map((r) => r.tacticalRoleId));
  const available = (tacticalRoles ?? []).filter((r) => !usedIds.has(r.id));
  const done = existingRoles.filter((r) => r.instruction?.primary).length;

  return (
    <div className="w-56 flex-shrink-0 overflow-y-auto border-r border-surface-border bg-surface-raised p-3">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Spelare på planen</h3>
        {existingRoles.length > 0 && (
          <span className="text-xs text-slate-500">
            {done}/{existingRoles.length} klara
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        {existingRoles.length === 0 && <div className="px-1 text-xs text-slate-500">Lägg till spelare nedan.</div>}
        {existingRoles.map((role) => {
          const hasText = Boolean(role.instruction?.primary);
          return (
            <button
              key={role.id}
              onClick={() => onSelectRole(role.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                role.id === selectedRoleId ? "bg-accent/15 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: role.colorOverride ?? role.tacticalRole.color ?? "#38bdf8" }}
              >
                {role.resolvedPlayer?.shirtNumber ?? "?"}
              </span>
              <span className="min-w-0 flex-1 truncate">{role.label ?? role.tacticalRole.name}</span>
              <span className={hasText ? "text-emerald-400" : "text-slate-600"} title={hasText ? "Instruktion skriven" : "Saknar instruktion"}>
                {hasText ? "✓" : "○"}
              </span>
            </button>
          );
        })}
      </div>

      <details className="mt-4 border-t border-surface-border pt-3" open={existingRoles.length === 0}>
        <summary className="cursor-pointer px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          + Lägg till spelare
        </summary>
        <div className="mt-2 space-y-0.5">
          {available.length === 0 && <div className="px-1 text-xs text-slate-500">Alla roller är redan tillagda.</div>}
          {available.map((role) => (
            <button
              key={role.id}
              onClick={() => onAddRole(role.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white"
            >
              <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: role.color ?? "#38bdf8" }} />
              <span className="truncate">{role.name}</span>
              <span className="ml-auto text-[10px] uppercase text-slate-600">
                {role.type === "POSITIONAL" ? role.position?.code : "egen"}
              </span>
            </button>
          ))}
          <Link
            to="/roller"
            className="mt-2 block rounded-md border border-dashed border-surface-border px-2 py-1.5 text-center text-xs text-slate-400 hover:text-accent"
          >
            + Skapa egen roll
          </Link>
        </div>
      </details>
    </div>
  );
}
