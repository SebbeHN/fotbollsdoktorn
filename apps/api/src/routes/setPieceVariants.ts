import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { resolvePlayersForRoles, getDefaultLineupId } from "../services/roleResolution";

export const setPieceVariantsRouter = Router();
export const setPieceVariantsForSetPieceRouter = Router({ mergeParams: true });

const variantSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(4000).nullable().optional(),
  tacticalPurpose: z.string().max(2000).nullable().optional(),
  priority: z.number().int().nullable().optional(),
  signal: z.string().max(120).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
  isActive: z.boolean().optional(),
});

setPieceVariantsForSetPieceRouter.get<{ setPieceId: string }>("/", async (req, res) => {
  const variants = await prisma.setPieceVariant.findMany({
    where: { setPieceId: req.params.setPieceId },
    orderBy: { createdAt: "asc" },
  });
  res.json(variants);
});

/** Creates a variant with an implicit Stage 1 (Phase 1 has no stage timeline UI yet). */
setPieceVariantsForSetPieceRouter.post<{ setPieceId: string }>("/", async (req, res) => {
  const parsed = variantSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const variant = await prisma.setPieceVariant.create({
    data: {
      ...parsed.data,
      setPieceId: req.params.setPieceId,
      stages: { create: [{ order: 1, name: "Steg 1" }] },
    },
    include: { stages: true },
  });
  res.status(201).json(variant);
});

/**
 * Full detail for the tactics board / editor. Resolves each role's current
 * player via: SetPieceRole -> TacticalRole -> LineupAssignment(lineupId) -> Player.
 * If no lineupId is given, falls back to the team's default lineup.
 */
setPieceVariantsRouter.get("/:id", async (req, res) => {
  const variant = await prisma.setPieceVariant.findUnique({
    where: { id: req.params.id },
    include: {
      setPiece: { include: { category: true } },
      roles: {
        orderBy: { sortOrder: "asc" },
        include: {
          tacticalRole: { include: { position: true } },
          assignedPosition: true,
          instruction: true,
          positions: { include: { stage: true } },
        },
      },
      stages: { orderBy: { order: "asc" }, include: { positions: true, movements: true } },
      zones: true,
      tags: { include: { tag: true } },
    },
  });
  if (!variant) return res.status(404).json({ error: "Variant not found" });

  const teamId = variant.setPiece.category.teamId;
  const lineupId =
    (req.query.lineupId as string | undefined) ?? (await getDefaultLineupId(teamId)) ?? undefined;

  const resolvedPlayers = lineupId
    ? await resolvePlayersForRoles(
        variant.roles.map((r) => ({
          id: r.id,
          assignedPositionId: r.assignedPositionId,
          tacticalRole: r.tacticalRole,
        })),
        lineupId
      )
    : {};

  const firstStageId = variant.stages[0]?.id;

  const roles = variant.roles.map((role) => {
    const stage1Position = role.positions.find((p) => p.stageId === firstStageId);
    return {
      ...role,
      resolvedPlayer: resolvedPlayers[role.id] ?? null,
      resolvedPosition: stage1Position ? { x: stage1Position.x, y: stage1Position.y } : null,
    };
  });

  const ballPosition = firstStageId
    ? await prisma.setPiecePosition.findFirst({
        where: { stageId: firstStageId, entityType: "BALL", setPieceRoleId: null },
      })
    : null;

  res.json({
    ...variant,
    roles,
    resolvedLineupId: lineupId ?? null,
    ball: ballPosition ? { x: ballPosition.x, y: ballPosition.y } : null,
  });
});

setPieceVariantsRouter.patch("/:id", async (req, res) => {
  const parsed = variantSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const variant = await prisma.setPieceVariant.update({ where: { id: req.params.id }, data: parsed.data });
  res.json(variant);
});

setPieceVariantsRouter.delete("/:id", async (req, res) => {
  await prisma.setPieceVariant.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

const ballPositionSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });

/** Upserts (or clears) the ball marker on Stage 1 of a variant. The ball is a
 * standalone SetPiecePosition (entityType BALL, no role attached). */
setPieceVariantsRouter.put("/:id/ball", async (req, res) => {
  const parsed = ballPositionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const stage1 = await prisma.setPieceStage.findFirst({
    where: { variantId: req.params.id, order: 1 },
  });
  if (!stage1) return res.status(400).json({ error: "Variant has no Stage 1" });

  const existing = await prisma.setPiecePosition.findFirst({
    where: { stageId: stage1.id, entityType: "BALL", setPieceRoleId: null },
  });

  const position = existing
    ? await prisma.setPiecePosition.update({ where: { id: existing.id }, data: parsed.data })
    : await prisma.setPiecePosition.create({
        data: { stageId: stage1.id, entityType: "BALL", ...parsed.data },
      });

  res.json({ x: position.x, y: position.y });
});

setPieceVariantsRouter.delete("/:id/ball", async (req, res) => {
  const stage1 = await prisma.setPieceStage.findFirst({
    where: { variantId: req.params.id, order: 1 },
  });
  if (stage1) {
    await prisma.setPiecePosition.deleteMany({
      where: { stageId: stage1.id, entityType: "BALL", setPieceRoleId: null },
    });
  }
  res.status(204).end();
});

/** Deep-clones a variant: roles, instructions, stages with positions, arrows and zones. Fast way to
 * spin off e.g. "H2 - Fake first -> far" from "H1 - First". */
setPieceVariantsRouter.post("/:id/duplicate", async (req, res) => {
  const nameSchema = z.object({ name: z.string().min(1).max(120) });
  const parsed = nameSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const source = await prisma.setPieceVariant.findUnique({
    where: { id: req.params.id },
    include: {
      roles: { include: { instruction: true, positions: true } },
      stages: {
        orderBy: { order: "asc" },
        include: {
          positions: { where: { setPieceRoleId: null, entityType: { in: ["BALL", "OPPONENT"] } } },
          movements: true,
        },
      },
      zones: true,
    },
  });
  if (!source) return res.status(404).json({ error: "Variant not found" });

  const clone = await prisma.$transaction(async (tx) => {
    const newVariant = await tx.setPieceVariant.create({
      data: {
        setPieceId: source.setPieceId,
        name: parsed.data.name,
        description: source.description,
        tacticalPurpose: source.tacticalPurpose,
        priority: source.priority,
        signal: source.signal,
        notes: source.notes,
      },
    });

    const stageIdMap = new Map<string, string>();
    for (const stage of source.stages) {
      const newStage = await tx.setPieceStage.create({
        data: {
          variantId: newVariant.id,
          order: stage.order,
          name: stage.name,
          triggerDescription: stage.triggerDescription,
          note: stage.note,
          durationMs: stage.durationMs,
        },
      });
      stageIdMap.set(stage.id, newStage.id);

      for (const pos of stage.positions) {
        await tx.setPiecePosition.create({
          data: { stageId: newStage.id, entityType: pos.entityType, label: pos.label, x: pos.x, y: pos.y },
        });
      }
    }

    const roleIdMap = new Map<string, string>();
    for (const role of source.roles) {
      const newRole = await tx.setPieceRole.create({
        data: {
          variantId: newVariant.id,
          tacticalRoleId: role.tacticalRoleId,
          assignedPositionId: role.assignedPositionId,
          label: role.label,
          colorOverride: role.colorOverride,
          sortOrder: role.sortOrder,
          instruction: role.instruction
            ? {
                create: {
                  primary: role.instruction.primary,
                  secondary: role.instruction.secondary,
                  onLossOfBall: role.instruction.onLossOfBall,
                  timing: role.instruction.timing,
                  priority: role.instruction.priority,
                },
              }
            : undefined,
          positions: {
            create: role.positions.map((p) => ({
              stageId: stageIdMap.get(p.stageId)!,
              entityType: p.entityType,
              x: p.x,
              y: p.y,
            })),
          },
        },
      });
      roleIdMap.set(role.id, newRole.id);
    }

    for (const stage of source.stages) {
      for (const m of stage.movements) {
        await tx.setPieceMovement.create({
          data: {
            stageId: stageIdMap.get(stage.id)!,
            setPieceRoleId: m.setPieceRoleId ? (roleIdMap.get(m.setPieceRoleId) ?? null) : null,
            type: m.type,
            fromX: m.fromX,
            fromY: m.fromY,
            toX: m.toX,
            toY: m.toY,
            label: m.label,
          },
        });
      }
    }

    for (const zone of source.zones) {
      await tx.setPieceZone.create({
        data: {
          variantId: newVariant.id,
          name: zone.name,
          color: zone.color,
          points: zone.points as any,
        },
      });
    }

    return newVariant;
  });

  res.status(201).json(clone);
});

// ---------------------------------------------------------------------------
// Roles (within a variant)
// ---------------------------------------------------------------------------

export const setPieceRolesRouter = Router();
export const variantRolesRouter = Router({ mergeParams: true });

const roleCreateSchema = z.object({
  tacticalRoleId: z.string(),
  assignedPositionId: z.string().nullable().optional(),
  label: z.string().max(120).nullable().optional(),
  colorOverride: z.string().max(20).nullable().optional(),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

variantRolesRouter.post<{ variantId: string }>("/", async (req, res) => {
  const parsed = roleCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const stage1 = await prisma.setPieceStage.findFirst({
    where: { variantId: req.params.variantId, order: 1 },
  });
  if (!stage1) return res.status(400).json({ error: "Variant has no Stage 1" });

  const roleCount = await prisma.setPieceRole.count({ where: { variantId: req.params.variantId } });

  const role = await prisma.setPieceRole.create({
    data: {
      variantId: req.params.variantId,
      tacticalRoleId: parsed.data.tacticalRoleId,
      assignedPositionId: parsed.data.assignedPositionId,
      label: parsed.data.label,
      colorOverride: parsed.data.colorOverride,
      sortOrder: roleCount,
      positions: {
        create: [{ stageId: stage1.id, entityType: "OWN_ROLE", x: parsed.data.x, y: parsed.data.y }],
      },
    },
    include: { tacticalRole: { include: { position: true } }, instruction: true, positions: true },
  });
  res.status(201).json(role);
});

const suggestRolesSchema = z.object({ lineupId: z.string().optional() });

type RoleKind = "aerial" | "duel" | "keep";

/** What a role needs from the player, judged from its (Swedish) name. Takers and "stanna hemma/framme"
 * roles are never reassigned: they depend on foot and game plan, not on aerial strength. */
function roleKind(name: string): RoleKind {
  const n = name.toLowerCase();
  if (/läggare|taker|stanna|målvakt|mv\b|säkerhet|markering/.test(n)) return "keep";
  if (/andra boll|andraboll|andra löp|screen|skärm/.test(n)) return "duel";
  return "aerial";
}

/**
 * Suggests which starting-XI player should fill each role that depends on aerial or duel strength
 * (runners, near/far post, zones → heading; second ball, screens → duels), using the ratings on the
 * squad page. Taker and "stanna hemma" roles are left alone. Only sets SetPieceRole.assignedPositionId,
 * never LineupAssignment, so the coach can still override any single role afterwards.
 */
variantRolesRouter.post<{ variantId: string }>("/suggest", async (req, res) => {
  const parsed = suggestRolesSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const variant = await prisma.setPieceVariant.findUnique({
    where: { id: req.params.variantId },
    include: {
      setPiece: { include: { category: true } },
      roles: { where: { tacticalRole: { type: "SPECIAL" } }, include: { tacticalRole: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!variant) return res.status(404).json({ error: "Variant not found" });

  const teamId = variant.setPiece.category.teamId;
  const lineupId = parsed.data.lineupId ?? (await getDefaultLineupId(teamId));
  if (!lineupId) return res.status(400).json({ error: "No lineup available to suggest from" });

  const assignments = await prisma.lineupAssignment.findMany({
    where: { lineupId },
    include: { player: true },
  });
  // Roles that keep their player still occupy that position, so nobody can end up in two places.
  const keptPositions = new Set(
    variant.roles
      .filter((r) => roleKind(r.tacticalRole.name) === "keep" && r.assignedPositionId)
      .map((r) => r.assignedPositionId!)
  );
  const players = assignments.filter(
    (a) => a.player && !a.player.isGoalkeeper && !keptPositions.has(a.positionId)
  );

  const rated = players.filter((a) => a.player!.headingStrength != null || a.player!.duelStrength != null);
  if (rated.length === 0) {
    return res.json({
      updated: 0,
      lineupId,
      reason: "NO_RATINGS",
      message: "Fyll i duellspel och huvudspel (1–5) på spelarna under Trupp först, så kan jag föreslå vem som passar var.",
    });
  }

  const score = (a: (typeof players)[number], kind: "aerial" | "duel") => {
    const p = a.player!;
    const heading = p.headingStrength ?? 2;
    const duel = p.duelStrength ?? 2;
    const height = (p.heightCm ?? 175) * 0.03;
    return kind === "aerial" ? heading * 3 + duel + height : duel * 3 + heading + height * 0.5;
  };

  const used = new Set<string>();
  const updates: { roleId: string; positionId: string }[] = [];
  // Aerial roles pick first, then duel roles pick from whoever is left.
  for (const kind of ["aerial", "duel"] as const) {
    for (const role of variant.roles.filter((r) => roleKind(r.tacticalRole.name) === kind)) {
      const pick = players
        .filter((a) => !used.has(a.positionId))
        .sort((x, y) => score(y, kind) - score(x, kind))[0];
      if (!pick) break;
      used.add(pick.positionId);
      updates.push({ roleId: role.id, positionId: pick.positionId });
    }
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.setPieceRole.update({ where: { id: u.roleId }, data: { assignedPositionId: u.positionId } })
    )
  );

  res.json({ updated: updates.length, lineupId });
});


const roleUpdateSchema = z.object({
  assignedPositionId: z.string().nullable().optional(),
  label: z.string().max(120).nullable().optional(),
  colorOverride: z.string().max(20).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

setPieceRolesRouter.patch("/:id", async (req, res) => {
  const parsed = roleUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const role = await prisma.setPieceRole.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { tacticalRole: { include: { position: true } }, instruction: true },
  });
  res.json(role);
});

setPieceRolesRouter.delete("/:id", async (req, res) => {
  await prisma.setPieceRole.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

const positionSchema = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) });

/** Updates (or creates) this role's marker position on Stage 1. Called once per
 * drag operation on the pitch canvas (debounced client-side), never per pixel. */
setPieceRolesRouter.patch("/:id/position", async (req, res) => {
  const parsed = positionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const role = await prisma.setPieceRole.findUnique({
    where: { id: req.params.id },
    select: { variantId: true },
  });
  if (!role) return res.status(404).json({ error: "Role not found" });

  const stage1 = await prisma.setPieceStage.findFirst({
    where: { variantId: role.variantId, order: 1 },
  });
  if (!stage1) return res.status(400).json({ error: "Variant has no Stage 1" });

  const existing = await prisma.setPiecePosition.findFirst({
    where: { stageId: stage1.id, setPieceRoleId: req.params.id },
  });

  const position = existing
    ? await prisma.setPiecePosition.update({ where: { id: existing.id }, data: parsed.data })
    : await prisma.setPiecePosition.create({
        data: { stageId: stage1.id, setPieceRoleId: req.params.id, entityType: "OWN_ROLE", ...parsed.data },
      });

  res.json(position);
});

const instructionSchema = z.object({
  primary: z.string().max(2000).nullable().optional(),
  secondary: z.string().max(2000).nullable().optional(),
  onLossOfBall: z.string().max(2000).nullable().optional(),
  timing: z.string().max(500).nullable().optional(),
  priority: z.number().int().nullable().optional(),
});

/** Upserts the instruction attached to a role. This is the base-level
 * instruction; match/player overrides live in SetPieceOverride (Phase 3). */
setPieceRolesRouter.put("/:id/instruction", async (req, res) => {
  const parsed = instructionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const instruction = await prisma.setPieceInstruction.upsert({
    where: { setPieceRoleId: req.params.id },
    create: { setPieceRoleId: req.params.id, ...parsed.data },
    update: parsed.data,
  });
  res.json(instruction);
});
