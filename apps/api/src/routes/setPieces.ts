import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const setPiecesRouter = Router();
export const categorySetPiecesRouter = Router({ mergeParams: true });

const setPieceSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["OFFENSIVE", "DEFENSIVE", "CUSTOM"]),
});

categorySetPiecesRouter.get<{ categoryId: string }>("/", async (req, res) => {
  const setPieces = await prisma.setPiece.findMany({
    where: { categoryId: req.params.categoryId },
    include: { variants: { select: { id: true, name: true, isActive: true, signal: true } } },
    orderBy: { name: "asc" },
  });
  res.json(setPieces);
});

categorySetPiecesRouter.post<{ categoryId: string }>("/", async (req, res) => {
  const parsed = setPieceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const setPiece = await prisma.setPiece.create({
    data: { ...parsed.data, categoryId: req.params.categoryId },
  });
  res.status(201).json(setPiece);
});

setPiecesRouter.get("/:id", async (req, res) => {
  const setPiece = await prisma.setPiece.findUnique({
    where: { id: req.params.id },
    include: { variants: { orderBy: { createdAt: "asc" } } },
  });
  if (!setPiece) return res.status(404).json({ error: "Set piece not found" });
  res.json(setPiece);
});

setPiecesRouter.patch("/:id", async (req, res) => {
  const parsed = setPieceSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const setPiece = await prisma.setPiece.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(setPiece);
});

setPiecesRouter.delete("/:id", async (req, res) => {
  await prisma.setPiece.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
