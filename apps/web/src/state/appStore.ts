import { create } from "zustand";

interface AppState {
  currentTeamId: string | null;
  currentLineupId: string | null;
  setCurrentTeamId: (id: string) => void;
  setCurrentLineupId: (id: string) => void;
}

/** Single-team MVP: the app auto-selects the first (only) team and its
 * default lineup on load. Multi-team / auth comes later (see User model). */
export const useAppStore = create<AppState>((set) => ({
  currentTeamId: null,
  currentLineupId: null,
  setCurrentTeamId: (id) => set({ currentTeamId: id }),
  setCurrentLineupId: (id) => set({ currentLineupId: id }),
}));
