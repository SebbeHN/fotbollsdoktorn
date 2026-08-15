import { Router } from "express";
import { prisma } from "../db";

export const positionsRouter = Router();

positionsRouter.get("/", async (_req, res) => {
  const positions = await prisma.position.findMany({ orderBy: { sortOrder: "asc" } });
  res.json(positions);
});
