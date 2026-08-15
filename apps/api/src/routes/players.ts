import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const playersRouter = Router();

const playerSchema = z.object({
  name: z.string().min(1).max(120),
  shirtNumber: z.number().int().min(0).max(999),
  photoUrl: z.string().url().max(2048).nullable().optional(),
  isGoalkeeper: z.boolean().optional(),
  primaryPositionId: z.string().nullable().optional(),
  secondaryPositionIds: z.array(z.string()).optional(),
  dominantFoot: z.enum(["LEFT", "RIGHT", "BOTH"]).optional(),
  heightCm: z.number().int().min(100).max(230).nullable().optional(),
  duelStrength: z.number().int().min(1).max(5).nullable().optional(),
  headingStrength: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  availability: z.enum(["AVAILABLE", "INJURED", "SUSPENDED", "NOT_SELECTED"]).optional(),
});

function serializePlayer(p: any) {
  return {
    ...p,
    secondaryPositionIds: p.secondaryPositions?.map((sp: any) => sp.positionId) ?? [],
    secondaryPositions: undefined,
  };
}

// Nested under /api/teams/:teamId/players
export const teamPlayersRouter = Router({ mergeParams: true });

teamPlayersRouter.get<{ teamId: string }>("/", async (req, res) => {
  const players = await prisma.player.findMany({
    where: { teamId: req.params.teamId },
    include: { secondaryPositions: true, primaryPosition: true },
    orderBy: { shirtNumber: "asc" },
  });
  res.json(players.map(serializePlayer));
});

teamPlayersRouter.post<{ teamId: string }>("/", async (req, res) => {
  const parsed = playerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { secondaryPositionIds, ...data } = parsed.data;

  const player = await prisma.player.create({
    data: {
      ...data,
      teamId: req.params.teamId,
      secondaryPositions: secondaryPositionIds
        ? { create: secondaryPositionIds.map((positionId) => ({ positionId })) }
        : undefined,
    },
    include: { secondaryPositions: true, primaryPosition: true },
  });
  res.status(201).json(serializePlayer(player));
});

// Flat /api/players/:id routes
playersRouter.get("/:id", async (req, res) => {
  const player = await prisma.player.findUnique({
    where: { id: req.params.id },
    include: { secondaryPositions: true, primaryPosition: true },
  });
  if (!player) return res.status(404).json({ error: "Player not found" });
  res.json(serializePlayer(player));
});

playersRouter.patch("/:id", async (req, res) => {
  const parsed = playerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { secondaryPositionIds, ...data } = parsed.data;

  const player = await prisma.player.update({
    where: { id: req.params.id },
    data: {
      ...data,
      secondaryPositions: secondaryPositionIds
        ? {
            deleteMany: {},
            create: secondaryPositionIds.map((positionId) => ({ positionId })),
          }
        : undefined,
    },
    include: { secondaryPositions: true, primaryPosition: true },
  });
  res.json(serializePlayer(player));
});

playersRouter.delete("/:id", async (req, res) => {
  await prisma.player.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
