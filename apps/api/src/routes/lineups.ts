import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const lineupsRouter = Router();
export const teamLineupsRouter = Router({ mergeParams: true });

const lineupSchema = z.object({
  name: z.string().min(1).max(120),
  formation: z.string().min(1).max(20).optional(),
  isDefault: z.boolean().optional(),
});

teamLineupsRouter.get<{ teamId: string }>("/", async (req, res) => {
  const lineups = await prisma.lineup.findMany({
    where: { teamId: req.params.teamId },
    include: { assignments: { include: { position: true, player: true } } },
    orderBy: { createdAt: "asc" },
  });
  res.json(lineups);
});

teamLineupsRouter.post<{ teamId: string }>("/", async (req, res) => {
  const parsed = lineupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const lineup = await prisma.$transaction(async (tx) => {
    if (parsed.data.isDefault) {
      await tx.lineup.updateMany({
        where: { teamId: req.params.teamId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.lineup.create({
      data: { ...parsed.data, teamId: req.params.teamId },
      include: { assignments: { include: { position: true, player: true } } },
    });
  });
  res.status(201).json(lineup);
});

lineupsRouter.get("/:id", async (req, res) => {
  const lineup = await prisma.lineup.findUnique({
    where: { id: req.params.id },
    include: { assignments: { include: { position: true, player: true } } },
  });
  if (!lineup) return res.status(404).json({ error: "Lineup not found" });
  res.json(lineup);
});

lineupsRouter.patch("/:id", async (req, res) => {
  const parsed = lineupSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const lineup = await prisma.$transaction(async (tx) => {
    if (parsed.data.isDefault) {
      const current = await tx.lineup.findUniqueOrThrow({ where: { id: req.params.id } });
      await tx.lineup.updateMany({
        where: { teamId: current.teamId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.lineup.update({
      where: { id: req.params.id },
      data: parsed.data,
      include: { assignments: { include: { position: true, player: true } } },
    });
  });
  res.json(lineup);
});

lineupsRouter.delete("/:id", async (req, res) => {
  await prisma.lineup.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

const assignmentsSchema = z.object({
  assignments: z.array(
    z.object({
      positionId: z.string(),
      playerId: z.string().nullable(),
    })
  ),
});

/** Bulk upsert of position -> player assignments for a lineup. This is the ONLY
 * place a player gets tied to a role, and it never touches SetPiece data directly:
 * set piece renderers re-resolve players from this table on every read. */
lineupsRouter.put("/:id/assignments", async (req, res) => {
  const parsed = assignmentsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  await prisma.$transaction(
    parsed.data.assignments.map((a) =>
      prisma.lineupAssignment.upsert({
        where: { lineupId_positionId: { lineupId: req.params.id, positionId: a.positionId } },
        create: { lineupId: req.params.id, positionId: a.positionId, playerId: a.playerId },
        update: { playerId: a.playerId },
      })
    )
  );

  const lineup = await prisma.lineup.findUnique({
    where: { id: req.params.id },
    include: { assignments: { include: { position: true, player: true } } },
  });
  res.json(lineup);
});
