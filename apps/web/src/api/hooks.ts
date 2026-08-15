import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./client";
import type {
  ArrowType,
  DashboardData,
  Lineup,
  Player,
  Position,
  SetPieceCategory,
  SetPieceMovement,
  SetPieceStage,
  SetPieceSummary,
  SetPieceVariant,
  SetPieceZone,
  TacticalRole,
  Team,
} from "./types";

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export function useTeams() {
  return useQuery({ queryKey: ["teams"], queryFn: () => apiGet<Team[]>("/teams") });
}

export function useDashboard(teamId: string | undefined) {
  return useQuery({
    queryKey: ["dashboard", teamId],
    queryFn: () => apiGet<DashboardData>(`/teams/${teamId}/dashboard`),
    enabled: Boolean(teamId),
  });
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export function usePlayers(teamId: string | undefined) {
  return useQuery({
    queryKey: ["players", teamId],
    queryFn: () => apiGet<Player[]>(`/teams/${teamId}/players`),
    enabled: Boolean(teamId),
  });
}

export function useCreatePlayer(teamId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Player>) => apiPost<Player>(`/teams/${teamId}/players`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players", teamId] }),
  });
}

export function useUpdatePlayer(teamId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Player> }) =>
      apiPatch<Player>(`/players/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["players", teamId] });
      qc.invalidateQueries({ queryKey: ["lineups", teamId] });
    },
  });
}

export function useDeletePlayer(teamId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/players/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["players", teamId] }),
  });
}

// ---------------------------------------------------------------------------
// Positions & tactical roles
// ---------------------------------------------------------------------------

export function usePositions() {
  return useQuery({ queryKey: ["positions"], queryFn: () => apiGet<Position[]>("/positions") });
}

export function useTacticalRoles(teamId: string | undefined) {
  return useQuery({
    queryKey: ["tactical-roles", teamId],
    queryFn: () => apiGet<TacticalRole[]>(`/teams/${teamId}/tactical-roles`),
    enabled: Boolean(teamId),
  });
}

export function useCreateTacticalRole(teamId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TacticalRole>) =>
      apiPost<TacticalRole>(`/teams/${teamId}/tactical-roles`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tactical-roles", teamId] }),
  });
}

export function useUpdateTacticalRole(teamId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TacticalRole> }) =>
      apiPatch<TacticalRole>(`/tactical-roles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tactical-roles", teamId] }),
  });
}

export function useDeleteTacticalRole(teamId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/tactical-roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tactical-roles", teamId] }),
  });
}

// ---------------------------------------------------------------------------
// Lineups
// ---------------------------------------------------------------------------

export function useLineups(teamId: string | undefined) {
  return useQuery({
    queryKey: ["lineups", teamId],
    queryFn: () => apiGet<Lineup[]>(`/teams/${teamId}/lineups`),
    enabled: Boolean(teamId),
  });
}

export function useCreateLineup(teamId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; formation?: string; isDefault?: boolean }) =>
      apiPost<Lineup>(`/teams/${teamId}/lineups`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lineups", teamId] }),
  });
}

export function useUpdateLineup(teamId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lineup> }) =>
      apiPatch<Lineup>(`/lineups/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lineups", teamId] }),
  });
}

export function useSetLineupAssignments(teamId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      lineupId,
      assignments,
    }: {
      lineupId: string;
      assignments: { positionId: string; playerId: string | null }[];
    }) => apiPut<Lineup>(`/lineups/${lineupId}/assignments`, { assignments }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lineups", teamId] });
      // Any open set piece variant needs to re-resolve players.
      qc.invalidateQueries({ queryKey: ["variant"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Set piece library
// ---------------------------------------------------------------------------

export function useSetPieceCategories(teamId: string | undefined) {
  return useQuery({
    queryKey: ["set-piece-categories", teamId],
    queryFn: () => apiGet<SetPieceCategory[]>(`/teams/${teamId}/set-piece-categories`),
    enabled: Boolean(teamId),
  });
}

export function useCreateSetPieceCategory(teamId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type: string; parentId?: string | null }) =>
      apiPost<SetPieceCategory>(`/teams/${teamId}/set-piece-categories`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["set-piece-categories", teamId] }),
  });
}

export function useCreateSetPiece(teamId: string | undefined, categoryId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; type: string }) =>
      apiPost<SetPieceSummary>(`/set-piece-categories/${categoryId}/set-pieces`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["set-piece-categories", teamId] }),
  });
}

export function useCreateVariant(teamId: string | undefined, setPieceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; signal?: string }) =>
      apiPost<SetPieceVariant>(`/set-pieces/${setPieceId}/variants`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["set-piece-categories", teamId] }),
  });
}

export function useDuplicateVariant(teamId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, name }: { variantId: string; name: string }) =>
      apiPost<SetPieceVariant>(`/variants/${variantId}/duplicate`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["set-piece-categories", teamId] }),
  });
}

export function useDeleteVariant(teamId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (variantId: string) => apiDelete(`/variants/${variantId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["set-piece-categories", teamId] }),
  });
}

// ---------------------------------------------------------------------------
// Variant detail (the editor's main data source)
// ---------------------------------------------------------------------------

export function useVariant(variantId: string | undefined, lineupId: string | undefined) {
  return useQuery({
    queryKey: ["variant", variantId, lineupId],
    queryFn: () =>
      apiGet<SetPieceVariant>(
        `/variants/${variantId}${lineupId ? `?lineupId=${lineupId}` : ""}`
      ),
    enabled: Boolean(variantId),
  });
}

export function useUpdateVariant(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SetPieceVariant>) => apiPatch(`/variants/${variantId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useCreateRole(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      tacticalRoleId: string;
      assignedPositionId?: string | null;
      label?: string | null;
      x: number;
      y: number;
    }) => apiPost(`/variants/${variantId}/roles`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useUpdateRole(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { assignedPositionId?: string | null; label?: string | null; colorOverride?: string | null };
    }) => apiPatch(`/roles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useDeleteRole(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/roles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

/** Auto-suggests the best-fit starting-XI player (via position) for every
 * SPECIAL role in the variant, based on heading/duel strength and height. */
export function useSuggestSpecialRoles(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lineupId: string | undefined) =>
      apiPost<{ updated: number; lineupId: string }>(`/variants/${variantId}/roles/suggest`, { lineupId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useUpdateRolePosition(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, x, y }: { id: string; x: number; y: number }) =>
      apiPatch(`/roles/${id}/position`, { x, y }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useUpdateBallPosition(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ x, y }: { x: number; y: number }) => apiPut(`/variants/${variantId}/ball`, { x, y }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useRemoveBall(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiDelete(`/variants/${variantId}/ball`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useUpdateInstruction(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      roleId,
      data,
    }: {
      roleId: string;
      data: {
        primary?: string | null;
        secondary?: string | null;
        onLossOfBall?: string | null;
        timing?: string | null;
        priority?: number | null;
      };
    }) => apiPut(`/roles/${roleId}/instruction`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

// ---------------------------------------------------------------------------
// Stages (Phase 2 timeline: multiple steps per variant)
// ---------------------------------------------------------------------------

export function useCreateStage(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; triggerDescription?: string | null; durationMs?: number | null }) =>
      apiPost<SetPieceStage>(`/variants/${variantId}/stages`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useUpdateStage(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; triggerDescription?: string | null; durationMs?: number | null };
    }) => apiPatch<SetPieceStage>(`/stages/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useDeleteStage(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/stages/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useUpsertStageRolePosition(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stageId, roleId, x, y }: { stageId: string; roleId: string; x: number; y: number }) =>
      apiPut(`/stages/${stageId}/positions/role/${roleId}`, { x, y }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useRemoveStageRolePosition(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stageId, roleId }: { stageId: string; roleId: string }) =>
      apiDelete(`/stages/${stageId}/positions/role/${roleId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useUpsertStageBallPosition(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stageId, x, y }: { stageId: string; x: number; y: number }) =>
      apiPut(`/stages/${stageId}/positions/ball`, { x, y }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useRemoveStageBallPosition(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stageId: string) => apiDelete(`/stages/${stageId}/positions/ball`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

// ---------------------------------------------------------------------------
// Movements (run/pass/block arrows on a stage)
// ---------------------------------------------------------------------------

export function useCreateMovement(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      stageId,
      data,
    }: {
      stageId: string;
      data: {
        setPieceRoleId?: string | null;
        type: ArrowType;
        fromX: number;
        fromY: number;
        toX: number;
        toY: number;
        label?: string | null;
      };
    }) => apiPost<SetPieceMovement>(`/stages/${stageId}/movements`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useUpdateMovement(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SetPieceMovement> }) =>
      apiPatch<SetPieceMovement>(`/movements/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useDeleteMovement(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/movements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

// ---------------------------------------------------------------------------
// Zones (labeled areas: "Andra boll", "Stanna hemma", "Mur", etc.)
// ---------------------------------------------------------------------------

export function useCreateZone(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color: string; points: { x: number; y: number }[] }) =>
      apiPost<SetPieceZone>(`/variants/${variantId}/zones`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useUpdateZone(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{ name: string; color: string; points: { x: number; y: number }[] }>;
    }) => apiPatch<SetPieceZone>(`/zones/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}

export function useDeleteZone(variantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/zones/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["variant", variantId] }),
  });
}
