import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const tacticalRolesRouter = Router();
export const teamTacticalRolesRouter = Router({ mergeParams: true });

const tacticalRoleSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["POSITIONAL", "SPECIAL"]),
  positionId: z.string().nullable().optional(),
  color: z.string().max(20).nullable().optional(),
});

teamTacticalRolesRouter.get<{ teamId: string }>("/", async (req, res) => {
  const roles = await prisma.tacticalRole.findMany({
    where: { OR: [{ teamId: req.params.teamId }, { teamId: null }] },
    include: { position: true },
    orderBy: { name: "asc" },
  });
  res.json(roles);
});

teamTacticalRolesRouter.post<{ teamId: string }>("/", async (req, res) => {
  const parsed = tacticalRoleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  if (parsed.data.type === "POSITIONAL" && !parsed.data.positionId) {
    return res.status(400).json({ error: "positionId is required for POSITIONAL tactical roles" });
  }
  const role = await prisma.tacticalRole.create({
    data: { ...parsed.data, teamId: req.params.teamId },
    include: { position: true },
  });
  res.status(201).json(role);
});

tacticalRolesRouter.patch("/:id", async (req, res) => {
  const parsed = tacticalRoleSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const role = await prisma.tacticalRole.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { position: true },
  });
  res.json(role);
});

tacticalRolesRouter.delete("/:id", async (req, res) => {
  await prisma.tacticalRole.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
