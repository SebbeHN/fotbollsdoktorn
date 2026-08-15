import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const setPieceCategoriesRouter = Router();
export const teamSetPieceCategoriesRouter = Router({ mergeParams: true });

const categorySchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["OFFENSIVE", "DEFENSIVE", "CUSTOM"]),
  parentId: z.string().nullable().optional(),
});

teamSetPieceCategoriesRouter.get<{ teamId: string }>("/", async (req, res) => {
  const categories = await prisma.setPieceCategory.findMany({
    where: { teamId: req.params.teamId },
    include: {
      setPieces: { include: { variants: { select: { id: true, name: true, isActive: true } } } },
    },
    orderBy: { name: "asc" },
  });
  res.json(categories);
});

teamSetPieceCategoriesRouter.post<{ teamId: string }>("/", async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const category = await prisma.setPieceCategory.create({
    data: { ...parsed.data, teamId: req.params.teamId },
  });
  res.status(201).json(category);
});

setPieceCategoriesRouter.patch("/:id", async (req, res) => {
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const category = await prisma.setPieceCategory.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json(category);
});

setPieceCategoriesRouter.delete("/:id", async (req, res) => {
  await prisma.setPieceCategory.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
