import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";

// ---------------------------------------------------------------------------
// Zones (labeled areas on the pitch, e.g. "Andra boll", "Stanna hemma", "Mur")
// ---------------------------------------------------------------------------

export const variantZonesRouter = Router({ mergeParams: true });
export const zonesRouter = Router();

const pointSchema = z.object({ x: z.number().min(-0.2).max(1.2), y: z.number().min(-0.2).max(1.2) });

const zoneSchema = z.object({
  name: z.string().min(1).max(120),
  color: z.string().max(20).default("#38bdf8"),
  points: z.array(pointSchema).min(2).max(2),
});

variantZonesRouter.post<{ variantId: string }>("/", async (req, res) => {
  const parsed = zoneSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const zone = await prisma.setPieceZone.create({
    data: {
      variantId: req.params.variantId,
      name: parsed.data.name,
      color: parsed.data.color,
      points: parsed.data.points,
    },
  });
  res.status(201).json(zone);
});

zonesRouter.patch<{ id: string }>("/:id", async (req, res) => {
  const parsed = zoneSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const zone = await prisma.setPieceZone.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
      ...(parsed.data.points !== undefined ? { points: parsed.data.points } : {}),
    },
  });
  res.json(zone);
});

zonesRouter.delete<{ id: string }>("/:id", async (req, res) => {
  await prisma.setPieceZone.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
