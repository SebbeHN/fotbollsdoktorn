import { Link } from "react-router-dom";
import { useAppStore } from "../state/appStore";
import { useDashboard } from "../api/hooks";

export function Dashboard() {
  const teamId = useAppStore((s) => s.currentTeamId);
  const { data, isLoading } = useDashboard(teamId ?? undefined);

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-400">Snabb överblick över nästa match, biblioteket och truppen.</p>

      {isLoading && <div className="mt-8 text-slate-500">Laddar...</div>}

      {data && (
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Card title="Nästa match">
            {data.nextMatch ? (
              <div>
                <div className="text-lg font-medium text-white">{data.nextMatch.opponentName}</div>
                <div className="text-sm text-slate-400">
                  {new Date(data.nextMatch.date).toLocaleDateString("sv-SE")}
                </div>
                {data.nextMatch.setPieces.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-slate-300">
                    {data.nextMatch.setPieces.map((sp) => (
                      <li key={sp.variant.id}>
                        <span className="text-accent">{sp.role}</span> — {sp.variant.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-500">Ingen kommande match inplanerad.</div>
            )}
          </Card>

          <Card title="Trupp & bibliotek">
            <div className="flex gap-8">
              <Stat label="Spelare" value={data.playerCount} to="/trupp" />
              <Stat label="Fasta situationer" value={data.setPieceCount} to="/fasta-situationer" />
            </div>
          </Card>

          <Card title="Senast redigerade" className="md:col-span-2">
            {data.recentVariants.length === 0 ? (
              <div className="text-sm text-slate-500">Inga varianter ännu.</div>
            ) : (
              <ul className="divide-y divide-surface-border">
                {data.recentVariants.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-2">
                    <Link
                      to={`/fasta-situationer/variant/${v.id}`}
                      className="text-sm font-medium text-slate-200 hover:text-accent"
                    >
                      {v.setPiece.name} — {v.name}
                    </Link>
                    <span className="text-xs text-slate-500">
                      {new Date(v.updatedAt).toLocaleString("sv-SE")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-surface-border bg-surface-raised p-5 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value, to }: { label: string; value: number; to: string }) {
  return (
    <Link to={to} className="group">
      <div className="text-3xl font-semibold text-white group-hover:text-accent">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </Link>
  );
}
