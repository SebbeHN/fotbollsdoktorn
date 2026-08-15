import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { useLineups, useTeams } from "./api/hooks";
import { useAppStore } from "./state/appStore";
import { Dashboard } from "./pages/Dashboard";
import { Squad } from "./pages/Squad";
import { Lineups } from "./pages/Lineups";
import { Roles } from "./pages/Roles";
import { SetPieceLibrary } from "./pages/library/SetPieceLibrary";
import { SetPieceEditor } from "./pages/editor/SetPieceEditor";
import { Matches } from "./pages/Matches";
import { Presentation } from "./pages/Presentation";

/** Single-team MVP bootstrap: picks the first team and its default lineup so
 * every page has a teamId/lineupId to work with without a login flow. */
function useBootstrapTeam() {
  const { data: teams } = useTeams();
  const currentTeamId = useAppStore((s) => s.currentTeamId);
  const setCurrentTeamId = useAppStore((s) => s.setCurrentTeamId);
  const setCurrentLineupId = useAppStore((s) => s.setCurrentLineupId);
  const { data: lineups } = useLineups(currentTeamId ?? undefined);

  useEffect(() => {
    if (!currentTeamId && teams && teams.length > 0) {
      setCurrentTeamId(teams[0].id);
    }
  }, [teams, currentTeamId, setCurrentTeamId]);

  useEffect(() => {
    if (lineups && lineups.length > 0) {
      const defaultLineup = lineups.find((l) => l.isDefault) ?? lineups[0];
      setCurrentLineupId(defaultLineup.id);
    }
  }, [lineups, setCurrentLineupId]);
}

export default function App() {
  useBootstrapTeam();

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/matcher" element={<Matches />} />
        <Route path="/fasta-situationer" element={<SetPieceLibrary />} />
        <Route path="/fasta-situationer/variant/:variantId" element={<SetPieceEditor />} />
        <Route path="/trupp" element={<Squad />} />
        <Route path="/laguppstallningar" element={<Lineups />} />
        <Route path="/roller" element={<Roles />} />
        <Route path="/presentation" element={<Presentation />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
