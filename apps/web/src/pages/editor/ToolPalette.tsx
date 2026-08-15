import { Link } from "react-router-dom";
import { useAppStore } from "../../state/appStore";
import { useTacticalRoles } from "../../api/hooks";
import type { SetPieceRole } from "../../api/types";

interface ToolPaletteProps {
  existingRoles: SetPieceRole[];
  onAddRole: (tacticalRoleId: string) => void;
}

export function ToolPalette({ existingRoles, onAddRole }: ToolPaletteProps) {
  const teamId = useAppStore((s) => s.currentTeamId);
  const { data: tacticalRoles } = useTacticalRoles(teamId ?? undefined);

  const usedIds = new Set(existingRoles.map((r) => r.tacticalRoleId));
  const available = (tacticalRoles ?? []).filter((r) => !usedIds.has(r.id));

  return (
    <div className="w-64 flex-shrink-0 border-r border-surface-border bg-surface-raised p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Lägg till roll på planen
      </h3>
      <div className="space-y-1">
        {available.length === 0 && (
          <div className="text-xs text-slate-500">Alla roller är redan tillagda.</div>
        )}
        {available.map((role) => (
          <button
            key={role.id}
            onClick={() => onAddRole(role.id)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white"
          >
            <span
              className="h-3 w-3 flex-shrink-0 rounded-full"
              style={{ backgroundColor: role.color ?? "#38bdf8" }}
            />
            {role.name}
            <span className="ml-auto text-[10px] uppercase text-slate-600">
              {role.type === "POSITIONAL" ? role.position?.code : "special"}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 border-t border-surface-border pt-3">
        <Link
          to="/roller"
          className="block w-full rounded-md border border-dashed border-surface-border px-2 py-1.5 text-center text-xs text-slate-400 hover:text-accent"
        >
          + Hantera / skapa roller
        </Link>
      </div>
    </div>
  );
}
