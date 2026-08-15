import type { Player } from "@prisma/client";
import { prisma } from "../db";

/**
 * Core resolution rule of the whole system:
 *
 *   SetPieceRole -> TacticalRole -> current LineupAssignment -> Player
 *
 * A role's instruction and pitch position NEVER depend on a specific player.
 * The player is resolved on read, from whichever lineup is passed in
 * (the team's default lineup, unless a match-specific lineup is supplied).
 *
 * Resolution steps for a given SetPieceRole:
 *  1. Determine which Position this role maps to:
 *     - POSITIONAL tactical role -> tacticalRole.positionId
 *     - SPECIAL tactical role    -> setPieceRole.assignedPositionId
 *  2. Look up the LineupAssignment for that Position in the given lineup.
 *  3. Return the Player currently assigned (or null if unfilled).
 */
export async function resolvePlayerForRole(
  role: {
    assignedPositionId: string | null;
    tacticalRole: { type: string; positionId: string | null };
  },
  lineupId: string
): Promise<Player | null> {
  const positionId =
    role.tacticalRole.type === "POSITIONAL"
      ? role.tacticalRole.positionId
      : role.assignedPositionId;

  if (!positionId) return null;

  const assignment = await prisma.lineupAssignment.findUnique({
    where: { lineupId_positionId: { lineupId, positionId } },
    include: { player: true },
  });

  return assignment?.player ?? null;
}

/** Batch version: resolves players for many roles against one lineup in one query. */
export async function resolvePlayersForRoles(
  roles: Array<{
    id: string;
    assignedPositionId: string | null;
    tacticalRole: { type: string; positionId: string | null };
  }>,
  lineupId: string
): Promise<Record<string, Player | null>> {
  const positionIds = Array.from(
    new Set(
      roles
        .map((r) =>
          r.tacticalRole.type === "POSITIONAL"
            ? r.tacticalRole.positionId
            : r.assignedPositionId
        )
        .filter((x): x is string => Boolean(x))
    )
  );

  const assignments = await prisma.lineupAssignment.findMany({
    where: { lineupId, positionId: { in: positionIds } },
    include: { player: true },
  });

  const byPosition = new Map(assignments.map((a) => [a.positionId, a.player]));

  const result: Record<string, Player | null> = {};
  for (const role of roles) {
    const positionId =
      role.tacticalRole.type === "POSITIONAL"
        ? role.tacticalRole.positionId
        : role.assignedPositionId;
    result[role.id] = positionId ? byPosition.get(positionId) ?? null : null;
  }
  return result;
}

/** Finds (or creates) the team's default lineup id, used when no lineup is specified. */
export async function getDefaultLineupId(teamId: string): Promise<string | null> {
  const lineup = await prisma.lineup.findFirst({
    where: { teamId, isDefault: true },
    select: { id: true },
  });
  return lineup?.id ?? null;
}
