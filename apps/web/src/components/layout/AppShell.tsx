import { NavLink, Outlet } from "react-router-dom";
import { useTeams } from "../../api/hooks";
import { useAppStore } from "../../state/appStore";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/matcher", label: "Matcher" },
  { to: "/fasta-situationer", label: "Fasta situationer" },
  { to: "/trupp", label: "Trupp" },
  { to: "/laguppstallningar", label: "Laguppställningar" },
  { to: "/roller", label: "Roller" },
  { to: "/presentation", label: "Presentation" },
];

export function AppShell() {
  const { data: teams } = useTeams();
  const currentTeamId = useAppStore((s) => s.currentTeamId);
  const team = teams?.find((t) => t.id === currentTeamId);

  return (
    <div className="flex h-screen bg-surface text-slate-100">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-surface-border bg-surface-raised">
        <div className="px-5 py-5">
          <div className="text-sm uppercase tracking-widest text-slate-500">Fotbollsdoktorn</div>
          <div className="mt-1 truncate text-lg font-semibold text-slate-100">
            {team?.name ?? "Laddar lag..."}
          </div>
          {team?.season && <div className="text-xs text-slate-500">{team.season}</div>}
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent/15 text-accent"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 text-xs text-slate-600">Fas 1 - MVP</div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
