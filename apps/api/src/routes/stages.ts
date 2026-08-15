import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

// ---------------------------------------------------------------------------
// Stages (Phase 2: multi-step timeline for a set piece variant)
// ---------------------------------------------------------------------------

export const variantStagesRouter = Router({ mergeParams: true });
export const stagesRouter = Router();
export const movementsRouter = Router();

const stageSchema = z.object({
  name: z.string().min(1).max(120),
  triggerDescription: z.string().max(500).nullable().optional(),
  durationMs: z.number().int().positive().nullable().optional(),
});

variantStagesRouter.get<{ variantId: string }>("/", async (req, res) => {
  const stages = await prisma.setPieceStage.findMany({
    where: { variantId: req.params.variantId },
    orderBy: { order: "asc" },
    include: { positions: true, movements: true },
  });
  res.json(stages);
});

/** Appends a new stage after the current last one, cloning the previous
 * stage's role/ball positions as a starting point so the coach only has to
 * move the players that actually change between steps. */
variantStagesRouter.post<{ variantId: string }>("/", async (req, res) => {
  const parsed = stageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const lastStage = await prisma.setPieceStage.findFirst({
    where: { variantId: req.params.variantId },
    orderBy: { order: "desc" },
    include: { positions: true },
  });

  const stage = await prisma.setPieceStage.create({
    data: {
      variantId: req.params.variantId,
      order: (lastStage?.order ?? 0) + 1,
      name: parsed.data.name,
      triggerDescription: parsed.data.triggerDescription,
      durationMs: parsed.data.durationMs,
      positions: lastStage
        ? {
            create: lastStage.positions.map((p) => ({
              entityType: p.entityType,
              setPieceRoleId: p.setPieceRoleId,
              opponentMarkerId: p.opponentMarkerId,
              x: p.x,
              y: p.y,
            })),
          }
        : undefined,
    },
    include: { positions: true, movements: true },
  });
  res.status(201).json(stage);
});

stagesRouter.patch("/:id", async (req, res) => {
  const parsed = stageSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const stage = await prisma.setPieceStage.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(stage);
});

/** Refuses to delete a variant's only remaining stage — every variant must
 * always have at least Stage 1. */
stagesRouter.delete("/:id", async (req, res) => {
  const stage = await prisma.setPieceStage.findUnique({ where: { id: req.params.id } });
  if (!stage) return res.status(404).json({ error: "Stage not found" });

  const count = await prisma.setPieceStage.count({ where: { variantId: stage.variantId } });
  if (count <= 1) {
    return res.status(400).json({ error: "Cannot delete the only stage of a variant" });
  }

  await prisma.setPieceStage.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

const positionSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });

/** Upserts a role's marker position on a specific stage. */
stagesRouter.put("/:stageId/positions/role/:roleId", async (req, res) => {
  const parsed = positionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.setPiecePosition.findFirst({
    where: { stageId: req.params.stageId, setPieceRoleId: req.params.roleId },
  });

  const position = existing
    ? await prisma.setPiecePosition.update({ where: { id: existing.id }, data: parsed.data })
    : await prisma.setPiecePosition.create({
        data: {
          stageId: req.params.stageId,
          setPieceRoleId: req.params.roleId,
          entityType: "OWN_ROLE",
          ...parsed.data,
        },
      });
  res.json(position);
});

/** Removes a role's marker from a specific stage (the role simply isn't
 * shown on the pitch for that step). */
stagesRouter.delete("/:stageId/positions/role/:roleId", async (req, res) => {
  await prisma.setPiecePosition.deleteMany({
    where: { stageId: req.params.stageId, setPieceRoleId: req.params.roleId },
  });
  res.status(204).end();
});

stagesRouter.put("/:stageId/positions/ball", async (req, res) => {
  const parsed = positionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await prisma.setPiecePosition.findFirst({
    where: { stageId: req.params.stageId, entityType: "BALL", setPieceRoleId: null },
  });

  const position = existing
    ? await prisma.setPiecePosition.update({ where: { id: existing.id }, data: parsed.data })
    : await prisma.setPiecePosition.create({
        data: { stageId: req.params.stageId, entityType: "BALL", ...parsed.data },
      });
  res.json(position);
});

stagesRouter.delete("/:stageId/positions/ball", async (req, res) => {
  await prisma.setPiecePosition.deleteMany({
    where: { stageId: req.params.stageId, entityType: "BALL", setPieceRoleId: null },
  });
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Movements (run/pass/block arrows drawn on a stage)
// ---------------------------------------------------------------------------

const movementSchema = z.object({
  setPieceRoleId: z.string().nullable().optional(),
  type: z.enum(["RUN", "PASS", "BLOCK", "ALT_RUN"]).default("RUN"),
  fromX: z.number().min(0).max(1),
  fromY: z.number().min(0).max(1),
  toX: z.number().min(0).max(1),
  toY: z.number().min(0).max(1),
  label: z.string().max(120).nullable().optional(),
});

stagesRouter.post("/:stageId/movements", async (req, res) => {
  const parsed = movementSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const movement = await prisma.setPieceMovement.create({
    data: { stageId: req.params.stageId, ...parsed.data },
  });
  res.status(201).json(movement);
});

movementsRouter.patch("/:id", async (req, res) => {
  const parsed = movementSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const movement = await prisma.setPieceMovement.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(movement);
});

movementsRouter.delete("/:id", async (req, res) => {
  await prisma.setPieceMovement.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
