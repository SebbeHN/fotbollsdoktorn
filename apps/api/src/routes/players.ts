import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { createPositionResolver } from "../services/positionResolver";

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

const importRowSchema = z.object({
  name: z.string().trim().min(1).max(120),
  shirtNumber: z.number().int().min(0).max(999),
  position: z.string().max(60).nullable().optional(),
  secondaryPositions: z.array(z.string().max(60)).optional(),
  dominantFoot: z.enum(["LEFT", "RIGHT", "BOTH"]).nullable().optional(),
  heightCm: z.number().int().min(100).max(230).nullable().optional(),
  isGoalkeeper: z.boolean().nullable().optional(),
  availability: z.enum(["AVAILABLE", "INJURED", "SUSPENDED", "NOT_SELECTED"]).nullable().optional(),
  duelStrength: z.number().int().min(1).max(5).nullable().optional(),
  headingStrength: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

const importSchema = z.object({
  players: z.array(z.unknown()).min(1).max(300),
  dryRun: z.boolean().optional(),
  removeMissing: z.boolean().optional(),
});

type ImportAction = "create" | "update" | "error";

/**
 * Bulk import of a squad (parsed from CSV/Excel in the browser). Players are matched on shirt
 * number, then name; only the fields present in the file are written so a partial sheet never wipes
 * data. With dryRun nothing is saved and the per-row outcome is returned as a preview.
 */
teamPlayersRouter.post<{ teamId: string }>("/import", async (req, res) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { dryRun = false, removeMissing = false } = parsed.data;
  const teamId = req.params.teamId;

  const [existing, positions] = await Promise.all([
    prisma.player.findMany({ where: { teamId } }),
    prisma.position.findMany(),
  ]);
  const resolvePosition = createPositionResolver(positions);

  const rows = parsed.data.players.map((raw, i) => ({ index: i, raw, result: importRowSchema.safeParse(raw) }));
  const seenNumbers = new Set<number>();
  const matchedIds = new Set<string>();

  type Outcome = { index: number; action: ImportAction; name: string; shirtNumber: number | null; messages: string[] };
  const outcomes: Outcome[] = [];
  const work: { action: "create" | "update"; id?: string; data: Record<string, unknown>; secondary: string[] }[] = [];

  for (const row of rows) {
    if (!row.result.success) {
      const r = row.raw as { name?: unknown; shirtNumber?: unknown };
      const missingNumber = typeof r?.shirtNumber !== "number";
      outcomes.push({
        index: row.index,
        action: "error",
        name: typeof r?.name === "string" ? r.name : "",
        shirtNumber: typeof r?.shirtNumber === "number" ? r.shirtNumber : null,
        messages: [missingNumber ? "Tröjnummer saknas eller är ogiltigt" : "Namn saknas eller värden är ogiltiga"],
      });
      continue;
    }
    const d = row.result.data;
    const messages: string[] = [];
    if (seenNumbers.has(d.shirtNumber)) {
      outcomes.push({ index: row.index, action: "error", name: d.name, shirtNumber: d.shirtNumber, messages: [`Tröjnummer ${d.shirtNumber} förekommer flera gånger i filen`] });
      continue;
    }
    seenNumbers.add(d.shirtNumber);

    const match =
      existing.find((p) => p.shirtNumber === d.shirtNumber && !matchedIds.has(p.id)) ??
      existing.find((p) => p.name.toLowerCase() === d.name.toLowerCase() && !matchedIds.has(p.id));
    if (match) matchedIds.add(match.id);

    const primary = d.position ? resolvePosition(d.position) : null;
    if (d.position && !primary) messages.push(`Okänd position "${d.position}" – lämnas tom`);
    const secondary: string[] = [];
    for (const s of d.secondaryPositions ?? []) {
      const pos = resolvePosition(s);
      if (pos) secondary.push(pos.id);
      else messages.push(`Okänd sekundär position "${s}" – hoppas över`);
    }

    const data: Record<string, unknown> = { name: d.name, shirtNumber: d.shirtNumber };
    if (primary) data.primaryPositionId = primary.id;
    if (d.dominantFoot) data.dominantFoot = d.dominantFoot;
    if (d.heightCm != null) data.heightCm = d.heightCm;
    if (d.availability) data.availability = d.availability;
    if (d.duelStrength != null) data.duelStrength = d.duelStrength;
    if (d.headingStrength != null) data.headingStrength = d.headingStrength;
    if (d.notes) data.notes = d.notes;
    if (d.isGoalkeeper != null) data.isGoalkeeper = d.isGoalkeeper;
    else if (primary?.code === "GK") data.isGoalkeeper = true;

    outcomes.push({ index: row.index, action: match ? "update" : "create", name: d.name, shirtNumber: d.shirtNumber, messages });
    work.push({ action: match ? "update" : "create", id: match?.id, data, secondary });
  }

  const toRemove = removeMissing ? existing.filter((p) => !matchedIds.has(p.id)) : [];
  const summary = {
    created: work.filter((w) => w.action === "create").length,
    updated: work.filter((w) => w.action === "update").length,
    errors: outcomes.filter((o) => o.action === "error").length,
    removed: toRemove.length,
    removedNames: toRemove.map((p) => p.name),
  };
  if (dryRun) return res.json({ dryRun: true, summary, rows: outcomes });

  // Rows with errors are skipped; everything else is saved together.
  const notRemoved: string[] = [];
  await prisma.$transaction(async (tx) => {
    for (const w of work) {
      const secondaryCreate = w.secondary.length ? { create: w.secondary.map((positionId) => ({ positionId })) } : undefined;
      if (w.action === "update" && w.id) {
        await tx.player.update({
          where: { id: w.id },
          data: {
            ...w.data,
            secondaryPositions: w.secondary.length ? { deleteMany: {}, ...secondaryCreate } : undefined,
          },
        });
      } else {
        await tx.player.create({ data: { ...(w.data as { name: string; shirtNumber: number }), teamId, secondaryPositions: secondaryCreate } });
      }
    }
  });
  for (const p of toRemove) {
    try {
      await prisma.player.delete({ where: { id: p.id } });
    } catch {
      notRemoved.push(p.name);
    }
  }
  res.json({ dryRun: false, summary: { ...summary, removed: toRemove.length - notRemoved.length }, notRemoved, rows: outcomes });
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
