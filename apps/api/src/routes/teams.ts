import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

export const teamsRouter = Router();

teamsRouter.get("/", async (_req, res) => {
  const teams = await prisma.team.findMany({ orderBy: { createdAt: "asc" } });
  res.json(teams);
});

teamsRouter.get("/:id", async (req, res) => {
  const team = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!team) return res.status(404).json({ error: "Team not found" });
  res.json(team);
});

const createTeamSchema = z.object({
  name: z.string().min(1).max(120),
  season: z.string().max(40).optional(),
});

teamsRouter.post("/", async (req, res) => {
  const parsed = createTeamSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const team = await prisma.team.create({ data: parsed.data });
  res.status(201).json(team);
});

teamsRouter.patch("/:id", async (req, res) => {
  const parsed = createTeamSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const team = await prisma.team.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(team);
});

/** Dashboard summary: next match, recently edited variants, squad count. */
teamsRouter.get("/:id/dashboard", async (req, res) => {
  const teamId = req.params.id;

  const [nextMatch, recentVariants, playerCount, setPieceCount] = await Promise.all([
    prisma.match.findFirst({
      where: { teamId, date: { gte: new Date() } },
      orderBy: { date: "asc" },
      include: { setPieces: { include: { variant: true } } },
    }),
    prisma.setPieceVariant.findMany({
      where: { setPiece: { category: { teamId } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { setPiece: true },
    }),
    prisma.player.count({ where: { teamId } }),
    prisma.setPiece.count({ where: { category: { teamId } } }),
  ]);

  res.json({ nextMatch, recentVariants, playerCount, setPieceCount });
});
