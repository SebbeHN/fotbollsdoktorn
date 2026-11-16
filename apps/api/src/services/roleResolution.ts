import type { Player } from "@prisma/client";
import { prisma } from "../db";

/**
 * Core resolution rule of the whole system:
 *
 *   SetPieceRole -> assigned Position -> current LineupAssignment -> Player
 *
 * A role's instruction and pitch position NEVER depend on a specific player. The coach picks which
 * lineup position fills a role (SetPieceRole.assignedPositionId); the player is then resolved on
 * read from whichever lineup is passed in (the team's default lineup, unless a match-specific
 * lineup is supplied). A role with no assigned position has no player ("?" on the pitch).
 */
export async function resolvePlayerForRole(
  role: { assignedPositionId: string | null },
  lineupId: string
): Promise<Player | null> {
  if (!role.assignedPositionId) return null;

  const assignment = await prisma.lineupAssignment.findUnique({
    where: { lineupId_positionId: { lineupId, positionId: role.assignedPositionId } },
    include: { player: true },
  });

  return assignment?.player ?? null;
}

/** Batch version: resolves players for many roles against one lineup in one query. */
export async function resolvePlayersForRoles(
  roles: Array<{ id: string; assignedPositionId: string | null }>,
  lineupId: string
): Promise<Record<string, Player | null>> {
  const positionIds = Array.from(
    new Set(roles.map((r) => r.assignedPositionId).filter((x): x is string => Boolean(x)))
  );

  const assignments = await prisma.lineupAssignment.findMany({
    where: { lineupId, positionId: { in: positionIds } },
    include: { player: true },
  });
  const byPosition = new Map(assignments.map((a) => [a.positionId, a.player]));

  const result: Record<string, Player | null> = {};
  for (const role of roles) {
    result[role.id] = role.assignedPositionId ? byPosition.get(role.assignedPositionId) ?? null : null;
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
