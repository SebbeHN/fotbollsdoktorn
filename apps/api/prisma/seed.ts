/**
 * Demo seed: one team, 17 players, a default 4-3-3 lineup, the full set piece
 * category tree from the brief, and one fully worked example ("H1 - Första")
 * with special tactical roles resolved through the lineup.
 *
 * Run with: npm run seed --workspace=@fotbollsdoktorn/api
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const POSITIONS = [
  { code: "GK", name: "Målvakt", sortOrder: 0 },
  { code: "RB", name: "Högerback", sortOrder: 1 },
  { code: "RCB", name: "Höger mittback", sortOrder: 2 },
  { code: "LCB", name: "Vänster mittback", sortOrder: 3 },
  { code: "LB", name: "Vänsterback", sortOrder: 4 },
  { code: "DM", name: "Defensiv mittfältare", sortOrder: 5 },
  { code: "RCM", name: "Höger central mittfältare", sortOrder: 6 },
  { code: "LCM", name: "Vänster central mittfältare", sortOrder: 7 },
  { code: "RW", name: "Höger ytter", sortOrder: 8 },
  { code: "ST", name: "Anfallare", sortOrder: 9 },
  { code: "LW", name: "Vänster ytter", sortOrder: 10 },
];

const BLUE = "#2563eb";

const SPECIAL_ROLES = [
  { name: "Hörnläggare", color: "#eab308" },
  { name: "Frisparksläggare", color: "#eab308" },
  { name: "Löpare 1", color: BLUE },
  { name: "Löpare 2", color: BLUE },
  { name: "Löpare 3", color: BLUE },
  { name: "Löpare 4", color: BLUE },
  { name: "Löpare 5", color: BLUE },
  { name: "Andra boll 1", color: BLUE },
  { name: "Andra boll 2", color: BLUE },
  { name: "Stanna hemma 1", color: BLUE },
  { name: "Stanna hemma 2", color: BLUE },
  { name: "Första stolpen", color: BLUE },
  { name: "Zon 11", color: BLUE },
  { name: "Zon 12", color: BLUE },
  { name: "Zon 13", color: BLUE },
  { name: "Zon 21", color: BLUE },
  { name: "Zon 22", color: BLUE },
  { name: "Zon 23", color: BLUE },
  { name: "Stanna framme", color: BLUE },
] as const;

type SpecialRoleName = (typeof SPECIAL_ROLES)[number]["name"];

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!/@(localhost|127\.0\.0\.1)[:/]/.test(dbUrl) && process.env.SEED_FORCE !== "1") {
    throw new Error("Seed wipes all data and only runs against a local database (set SEED_FORCE=1 to override).");
  }
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Team", "Opponent", "Tag" CASCADE');
  console.log("Seeding demo team...");

  const team = await prisma.team.create({
    data: { name: "IF Demoklubben", season: "2026/27" },
  });

  const positions = await Promise.all(
    POSITIONS.map((p) =>
      prisma.position.upsert({ where: { code: p.code }, create: p, update: p })
    )
  );
  const positionByCode = Object.fromEntries(positions.map((p) => [p.code, p]));

  const players = await Promise.all(
    [
      { name: "Oscar Lindberg", shirtNumber: 1, isGoalkeeper: true, primary: "GK", dominantFoot: "RIGHT", heightCm: 189 },
      { name: "Viktor Holm", shirtNumber: 12, isGoalkeeper: true, primary: "GK", dominantFoot: "LEFT", heightCm: 192 },
      { name: "Anton Svensson", shirtNumber: 2, primary: "RB", secondary: ["RCB"], dominantFoot: "RIGHT", heightCm: 178 },
      { name: "Johan Pettersson", shirtNumber: 5, primary: "RCB", secondary: ["DM"], dominantFoot: "RIGHT", heightCm: 188 },
      {
        name: "Erik Andersson",
        shirtNumber: 4,
        primary: "LCB",
        secondary: ["DM"],
        dominantFoot: "RIGHT",
        heightCm: 191,
        notes: "Stark i luftrummet, van att attackera första stolpen på hörnor.",
      },
      { name: "David Karlsson", shirtNumber: 3, primary: "LB", secondary: ["LW"], dominantFoot: "LEFT", heightCm: 176 },
      { name: "Marcus Berggren", shirtNumber: 14, primary: "LCB", secondary: ["RCB"], dominantFoot: "RIGHT", heightCm: 194, notes: "Mycket stark huvudspelare, bättre än Erik i boxen." },
      { name: "Isak Björk", shirtNumber: 15, primary: "RB", secondary: ["LB"], dominantFoot: "RIGHT", heightCm: 180 },
      { name: "Simon Olsson", shirtNumber: 6, primary: "DM", secondary: ["RCM"], dominantFoot: "RIGHT", heightCm: 183 },
      { name: "Filip Gustafsson", shirtNumber: 8, primary: "RCM", secondary: ["DM"], dominantFoot: "RIGHT", heightCm: 179 },
      { name: "Adam Nilsson", shirtNumber: 10, primary: "LCM", secondary: ["RCM"], dominantFoot: "LEFT", heightCm: 175 },
      { name: "Hugo Ekström", shirtNumber: 16, primary: "DM", secondary: ["LCM"], dominantFoot: "RIGHT", heightCm: 185 },
      { name: "Oskar Bergqvist", shirtNumber: 7, primary: "RW", secondary: ["ST"], dominantFoot: "LEFT", heightCm: 174 },
      { name: "Noah Johansson", shirtNumber: 9, primary: "ST", secondary: ["RW"], dominantFoot: "RIGHT", heightCm: 186 },
      { name: "Elias Magnusson", shirtNumber: 11, primary: "LW", secondary: ["ST"], dominantFoot: "RIGHT", heightCm: 177 },
      { name: "Leo Ström", shirtNumber: 17, primary: "RW", secondary: ["LW"], dominantFoot: "LEFT", heightCm: 173 },
      { name: "William Åberg", shirtNumber: 18, primary: "ST", secondary: ["LW"], dominantFoot: "RIGHT", heightCm: 190 },
    ].map((p) =>
      prisma.player.create({
        data: {
          teamId: team.id,
          name: p.name,
          shirtNumber: p.shirtNumber,
          isGoalkeeper: p.isGoalkeeper ?? false,
          primaryPositionId: positionByCode[p.primary].id,
          dominantFoot: p.dominantFoot as any,
          heightCm: p.heightCm,
          notes: p.notes,
          secondaryPositions: p.secondary
            ? { create: p.secondary.map((code) => ({ positionId: positionByCode[code].id })) }
            : undefined,
        },
      })
    )
  );
  const playerByName = Object.fromEntries(players.map((p) => [p.name, p]));

  console.log("Creating default 4-3-3 lineup...");
  const lineup = await prisma.lineup.create({
    data: { teamId: team.id, name: "Startelva 4-3-3", formation: "4-3-3", isDefault: true },
  });

  const STARTING_XI: Record<string, string> = {
    GK: "Oscar Lindberg",
    RB: "Anton Svensson",
    RCB: "Johan Pettersson",
    LCB: "Erik Andersson",
    LB: "David Karlsson",
    DM: "Simon Olsson",
    RCM: "Filip Gustafsson",
    LCM: "Adam Nilsson",
    RW: "Oskar Bergqvist",
    ST: "Noah Johansson",
    LW: "Elias Magnusson",
  };

  await Promise.all(
    Object.entries(STARTING_XI).map(([code, playerName]) =>
      prisma.lineupAssignment.create({
        data: {
          lineupId: lineup.id,
          positionId: positionByCode[code].id,
          playerId: playerByName[playerName].id,
        },
      })
    )
  );

  console.log("Creating tactical roles (positional + special)...");
  const positionalRoles = await Promise.all(
    positions.map((pos) =>
      prisma.tacticalRole.create({
        data: { teamId: team.id, name: pos.name, type: "POSITIONAL", positionId: pos.id },
      })
    )
  );
  void positionalRoles;

  const specialRoles = Object.fromEntries(
    await Promise.all(
      SPECIAL_ROLES.map(async ({ name, color }) => [
        name,
        await prisma.tacticalRole.create({ data: { teamId: team.id, name, type: "SPECIAL", color } }),
      ])
    )
  );

  console.log("Building set piece category tree...");
  const offensive = await prisma.setPieceCategory.create({
    data: { teamId: team.id, name: "Offensiva", type: "OFFENSIVE" },
  });
  const defensive = await prisma.setPieceCategory.create({
    data: { teamId: team.id, name: "Defensiva", type: "DEFENSIVE" },
  });

  const [offCorners, offFreeKicks, offThrowIns, offPenalties, offKickoff] = await Promise.all([
    prisma.setPieceCategory.create({ data: { teamId: team.id, name: "Hörnor", type: "OFFENSIVE", parentId: offensive.id } }),
    prisma.setPieceCategory.create({ data: { teamId: team.id, name: "Frisparkar", type: "OFFENSIVE", parentId: offensive.id } }),
    prisma.setPieceCategory.create({ data: { teamId: team.id, name: "Inkast", type: "OFFENSIVE", parentId: offensive.id } }),
    prisma.setPieceCategory.create({ data: { teamId: team.id, name: "Straffar", type: "OFFENSIVE", parentId: offensive.id } }),
    prisma.setPieceCategory.create({ data: { teamId: team.id, name: "Avspark", type: "OFFENSIVE", parentId: offensive.id } }),
  ]);

  const [defCorners, defFreeKicks, defThrowIns] = await Promise.all([
    prisma.setPieceCategory.create({ data: { teamId: team.id, name: "Hörnor", type: "DEFENSIVE", parentId: defensive.id } }),
    prisma.setPieceCategory.create({ data: { teamId: team.id, name: "Frisparkar", type: "DEFENSIVE", parentId: defensive.id } }),
    prisma.setPieceCategory.create({ data: { teamId: team.id, name: "Inkast", type: "DEFENSIVE", parentId: defensive.id } }),
  ]);

  const cornerLeft = await prisma.setPiece.create({
    data: { categoryId: offCorners.id, name: "Hörna vänster", type: "OFFENSIVE" },
  });
  await prisma.setPiece.create({ data: { categoryId: offCorners.id, name: "Hörna höger", type: "OFFENSIVE" } });
  await Promise.all(
    ["Frispark vänster", "Frispark höger", "Central frispark", "Indirekt frispark"].map((name) =>
      prisma.setPiece.create({ data: { categoryId: offFreeKicks.id, name, type: "OFFENSIVE" } })
    )
  );
  await prisma.setPiece.create({ data: { categoryId: offThrowIns.id, name: "Inkast", type: "OFFENSIVE" } });
  await prisma.setPiece.create({ data: { categoryId: offPenalties.id, name: "Straff", type: "OFFENSIVE" } });
  await prisma.setPiece.create({ data: { categoryId: offKickoff.id, name: "Avspark", type: "OFFENSIVE" } });

  await Promise.all(
    ["Försvara hörna vänster", "Försvara hörna höger"].map((name) =>
      prisma.setPiece.create({ data: { categoryId: defCorners.id, name, type: "DEFENSIVE" } })
    )
  );
  await Promise.all(
    ["Försvara frispark", "Försvara indirekt frispark"].map((name) =>
      prisma.setPiece.create({ data: { categoryId: defFreeKicks.id, name, type: "DEFENSIVE" } })
    )
  );
  await prisma.setPiece.create({ data: { categoryId: defThrowIns.id, name: "Försvara inkast", type: "DEFENSIVE" } });

  console.log("Building example set pieces from the coaching slides...");
  const tags = Object.fromEntries(
    await Promise.all(
      ["Zonförsvar", "Man-mot-man", "Kort hörna", "Första stolpen", "Bortre stolpen", "Mot 4-4-2", "Mot 5-3-2"].map(
        async (name) => [name, await prisma.tag.create({ data: { teamId: team.id, name } })]
      )
    )
  );

  type Pt = [number, number];
  type ArrowSeed = { role?: string; type: "RUN" | "ALT_RUN" | "PASS" | "BLOCK"; from: Pt; to: Pt };
  type StageSeed = {
    name: string;
    trigger?: string;
    note?: string;
    ball?: Pt;
    opponents?: { label: string; at: Pt }[];
    arrows?: ArrowSeed[];
  };
  type RoleSeed = {
    role: SpecialRoleName | "Målvakt";
    positionCode: string;
    /** One position per stage (the last one repeats if fewer are given). */
    pos: Pt[];
    primary: string;
    secondary?: string;
    onLossOfBall?: string;
    timing?: string;
  };
  type ZoneSeed = { name: string; color: string; points: [Pt, Pt] };
  type VariantSeed = {
    setPieceId: string;
    name: string;
    description: string;
    tacticalPurpose: string;
    signal?: string;
    tagNames?: string[];
    stages: StageSeed[];
    roles: RoleSeed[];
    zones: ZoneSeed[];
    /** Mirrors the situation left <-> right (y -> 1 - y) and swaps left/right positions. */
    mirror?: boolean;
  };

  const goalkeeperRole = positionalRoles.find((r) => r.name === "Målvakt")!;
  const MIRROR_POSITION: Record<string, string> = { LW: "RW", RW: "LW", LCB: "RCB", RCB: "LCB", LB: "RB", RB: "LB", LCM: "RCM", RCM: "LCM" };

  /** Creates a variant with stages, player placements per stage, arrows, ball, opponents and zones. */
  async function createVariant(v: VariantSeed) {
    const my = (p: Pt): Pt => (v.mirror ? [p[0], 1 - p[1]] : p);
    const variant = await prisma.setPieceVariant.create({
      data: {
        setPieceId: v.setPieceId,
        name: v.name,
        description: v.description,
        tacticalPurpose: v.tacticalPurpose,
        signal: v.signal,
        priority: 1,
        stages: {
          create: v.stages.map((s, i) => ({
            order: i + 1,
            name: s.name,
            triggerDescription: s.trigger,
            note: s.note,
          })),
        },
        tags: { create: (v.tagNames ?? []).map((n) => ({ tagId: tags[n].id })) },
      },
      include: { stages: { orderBy: { order: "asc" } } },
    });

    const roleIds = new Map<string, string>();
    for (const [i, seed] of v.roles.entries()) {
      const tactical = seed.role === "Målvakt" ? goalkeeperRole : specialRoles[seed.role];
      const code = v.mirror ? (MIRROR_POSITION[seed.positionCode] ?? seed.positionCode) : seed.positionCode;
      const role = await prisma.setPieceRole.create({
        data: {
          variantId: variant.id,
          tacticalRoleId: tactical.id,
          assignedPositionId: positionByCode[code].id,
          sortOrder: i,
          instruction: {
            create: {
              primary: seed.primary,
              secondary: seed.secondary,
              onLossOfBall: seed.onLossOfBall,
              timing: seed.timing,
            },
          },
          positions: {
            create: variant.stages.map((stage, s) => {
              const [x, y] = my(seed.pos[Math.min(s, seed.pos.length - 1)]);
              return { stageId: stage.id, entityType: "OWN_ROLE" as const, x, y };
            }),
          },
        },
      });
      roleIds.set(seed.role, role.id);
    }

    for (const [s, stageSeed] of v.stages.entries()) {
      const stage = variant.stages[s];
      const ball = stageSeed.ball ?? v.stages[0].ball;
      if (ball) {
        const [x, y] = my(ball);
        await prisma.setPiecePosition.create({ data: { stageId: stage.id, entityType: "BALL", x, y } });
      }
      for (const opp of stageSeed.opponents ?? []) {
        const [x, y] = my(opp.at);
        await prisma.setPiecePosition.create({
          data: { stageId: stage.id, entityType: "OPPONENT", label: opp.label, x, y },
        });
      }
      for (const a of stageSeed.arrows ?? []) {
        const [fromX, fromY] = my(a.from);
        const [toX, toY] = my(a.to);
        await prisma.setPieceMovement.create({
          data: {
            stageId: stage.id,
            setPieceRoleId: a.role ? roleIds.get(a.role) : null,
            type: a.type,
            fromX,
            fromY,
            toX,
            toY,
          },
        });
      }
    }

    for (const z of v.zones) {
      const [a, b] = z.points.map(my);
      await prisma.setPieceZone.create({
        data: {
          variantId: variant.id,
          name: z.name,
          color: z.color,
          points: [
            { x: a[0], y: a[1] },
            { x: b[0], y: b[1] },
          ],
        },
      });
    }
    return variant;
  }

  // Coordinates are normalised pitch positions. The goal being attacked is at x = 1, the one we
  // defend at x = 0, and y = 0 is the left side. Measured from the coaching slides in "facit fasta".
  const ZONE_BLUE = "#38bdf8";
  const ZONE_AMBER = "#facc15";
  const ZONE_GREY = "#94a3b8";

  const RUNNER_START_X = 0.998;
  const RUNNER_END_X = 0.975;
  const cornerRunnerY = [0.439, 0.469, 0.499, 0.531, 0.567];
  const cornerRunnerText = [
    { primary: "Du ska vara först av alla spelarna till bollen." },
    { primary: "Du ska börja på mållinjen framför målvakten och hamna mellan första stolpen och målvakten." },
    { primary: "Du ska börja på mållinjen bakom målvakten och hamna precis framför målvakten." },
    { primary: "Du ska börja på mållinjen vid bortre stolpen och hamna mellan målvakten och den bortre stolpen." },
    {
      primary:
        "Du är den som börjar löpa först: från bortre stolpen till kanten av målområdet, för att se vart bollen går.",
      secondary:
        "Slås bollen mot första stolpen ska du in och vara exakt vid den bortre stolpen. Går den för lång ska du kunna nicka tillbaka bollen in i målområdet.",
    },
  ];
  const runnerPositionCodes = ["ST", "RW", "LCM", "RCM", "LCB"];

  const cornerOff = (setPieceId: string, mirror: boolean): VariantSeed => ({
    setPieceId,
    mirror,
    name: "Grundvariant",
    description: "Offensiv hörna: fem löpare startar på mållinjen, två spelare tar andra boll och två stannar hemma.",
    tacticalPurpose: "Vara först på bollen i målområdet och ha kontroll på andra boll och omställning.",
    signal: "Röd",
    tagNames: ["Första stolpen"],
    stages: [
      {
        name: "Start på mållinjen",
        note: "Alla inne i målområdet ska börja PÅ MÅLLINJEN.",
        ball: [0.99, 0.012],
        opponents: [{ label: "MV", at: [0.995, 0.5] }],
        arrows: [
          { type: "PASS", from: [0.99, 0.012], to: [0.965, 0.46] },
        ],
      },
      { name: "Slutpositioner", note: "Bilden visar era slutpositioner.", ball: [0.965, 0.46] },
    ],
    roles: [
      {
        role: "Hörnläggare",
        positionCode: "LW",
        pos: [[0.996, 0.0]],
        primary: "Slå bollen mot första zonen i målområdet.",
        timing: "Slå när alla är på plats.",
      },
      ...cornerRunnerY.map((y, i) => ({
        role: `Löpare ${i + 1}` as SpecialRoleName,
        positionCode: runnerPositionCodes[i],
        pos: [[RUNNER_START_X, y], [RUNNER_END_X, y]] as Pt[],
        ...cornerRunnerText[i],
      })),
      {
        role: "Andra boll 1",
        positionCode: "DM",
        pos: [[0.834, 0.417]],
        primary: "Stå i zonen för andra boll och vinn bollen när den klaras ut.",
      },
      {
        role: "Andra boll 2",
        positionCode: "LB",
        pos: [[0.834, 0.582]],
        primary: "Stå i zonen för andra boll och vinn bollen när den klaras ut.",
      },
      {
        role: "Stanna hemma 1",
        positionCode: "RB",
        pos: [[0.657, 0.448]],
        primary: "Stanna hemma som säkerhet mot kontring.",
      },
      {
        role: "Stanna hemma 2",
        positionCode: "RCB",
        pos: [[0.657, 0.553]],
        primary: "Stanna hemma som säkerhet mot kontring.",
      },
    ],
    zones: [
      { name: "Andra boll", color: ZONE_AMBER, points: [[0.813, 0.386], [0.85, 0.62]] },
      { name: "Stanna hemma", color: ZONE_BLUE, points: [[0.635, 0.386], [0.672, 0.62]] },
    ],
  });

  const freeKickTargets = [0.437, 0.473, 0.505, 0.54, 0.58];
  const freeKickStarts = [0.524, 0.553, 0.588, 0.62, 0.654];

  const freeKickOff = (setPieceId: string, mirror: boolean): VariantSeed => ({
    setPieceId,
    mirror,
    name: "Grundvariant",
    description: "Offensiv frispark: fem löpare från straffområdets kant, två på andra boll och två som stannar hemma.",
    tacticalPurpose: "Vinna löpduellen in mot målet och ha kontroll på andra boll och omställning.",
    stages: [
      {
        name: "Löpningarna",
        note: "Se till att ha mer fart än motståndarna när bollen slås.",
        ball: [0.778, 0.168],
        opponents: [{ label: "MV", at: [0.995, 0.5] }],
        arrows: [
          { type: "PASS", from: [0.778, 0.168], to: [0.9, 0.5] },
          ...freeKickStarts.map((y, i) => ({
            role: `Löpare ${i + 1}`,
            type: "ALT_RUN" as const,
            from: [0.843, y] as Pt,
            to: [0.94, freeKickTargets[i]] as Pt,
          })),
        ],
      },
      { name: "Slutpositioner", ball: [0.9, 0.5] },
    ],
    roles: [
      {
        role: "Frisparksläggare",
        positionCode: "LW",
        pos: [[0.778, 0.14]],
        primary: "Slå bollen i en båge mot ytan framför målvakten.",
      },
      ...freeKickStarts.map((y, i) => ({
        role: `Löpare ${i + 1}` as SpecialRoleName,
        positionCode: runnerPositionCodes[i],
        pos: [[0.843, y], [0.94, freeKickTargets[i]]] as Pt[],
        primary: `Starta från straffområdets kant och spring in mot målet så fort bollen slås. Löpare ${i + 1}: håll din bana.`,
      })),
      { role: "Andra boll 1", positionCode: "DM", pos: [[0.811, 0.42]], primary: "Stå redo att vinna andra boll." },
      { role: "Andra boll 2", positionCode: "LB", pos: [[0.811, 0.58]], primary: "Stå redo att vinna andra boll." },
      { role: "Stanna hemma 1", positionCode: "RB", pos: [[0.65, 0.43]], primary: "Stanna hemma som säkerhet mot kontring." },
      { role: "Stanna hemma 2", positionCode: "RCB", pos: [[0.65, 0.556]], primary: "Stanna hemma som säkerhet mot kontring." },
    ],
    zones: [
      { name: "Andra boll", color: ZONE_AMBER, points: [[0.793, 0.39], [0.829, 0.61]] },
      { name: "Stanna hemma", color: ZONE_BLUE, points: [[0.632, 0.39], [0.668, 0.61]] },
    ],
  });

  const cornerDef = (setPieceId: string, mirror: boolean): VariantSeed => ({
    setPieceId,
    mirror,
    name: "Zonförsvar",
    description: "Defensiv hörna med zonförsvar: sex zonspelare, första stolpen, målvakt och två på andra boll.",
    tacticalPurpose: "Äga zonerna framför mål, attackera bollen och ha kontroll på andra boll.",
    tagNames: ["Zonförsvar"],
    stages: [
      {
        name: "Uppställning",
        note: "Ni ska INTE markera spelare – även om de står i er zon. Attackera bollen!",
        ball: [0.004, 0.004],
        opponents: [{ label: "M", at: [0.012, 0.026] }],
      },
      {
        name: "Om hörnan spelas kort",
        note: "Spelas hörnan kort: gå ut mot bollen och stäng ytorna.",
        trigger: "Hörnläggaren spelar kort",
        ball: [0.004, 0.004],
        opponents: [
          { label: "M", at: [0.012, 0.026] },
          { label: "M", at: [0.07, 0.077] },
        ],
        arrows: [
          { type: "PASS", from: [0.004, 0.004], to: [0.07, 0.077] },
          { role: "Andra boll 1", type: "ALT_RUN", from: [0.155, 0.448], to: [0.12, 0.2] },
          { role: "Första stolpen", type: "ALT_RUN", from: [0.016, 0.442], to: [0.02, 0.12] },
        ],
      },
    ],
    roles: [
      { role: "Målvakt", positionCode: "GK", pos: [[0.012, 0.496]], primary: "Ta alla bollar du kommer åt i målområdet. Ropa tydligt!" },
      {
        role: "Första stolpen",
        positionCode: "RW",
        pos: [[0.016, 0.442]],
        primary: "Stå vid första stolpen och rensa det som kommer lågt.",
      },
      { role: "Zon 11", positionCode: "LB", pos: [[0.05, 0.443]], primary: "Äg din zon och attackera bollen. Markera inte spelare." },
      { role: "Zon 12", positionCode: "LCB", pos: [[0.05, 0.497]], primary: "Äg din zon och attackera bollen. Markera inte spelare." },
      { role: "Zon 13", positionCode: "RCB", pos: [[0.05, 0.553]], primary: "Äg din zon och attackera bollen. Markera inte spelare." },
      { role: "Zon 21", positionCode: "RB", pos: [[0.1, 0.442]], primary: "Äg din zon och attackera bollen. Markera inte spelare." },
      { role: "Zon 22", positionCode: "LCM", pos: [[0.1, 0.5]], primary: "Äg din zon och attackera bollen. Markera inte spelare." },
      { role: "Zon 23", positionCode: "RCM", pos: [[0.1, 0.553]], primary: "Äg din zon och attackera bollen. Markera inte spelare." },
      { role: "Andra boll 1", positionCode: "DM", pos: [[0.155, 0.448]], primary: "Stå i zonen för andra boll och vinn bollen när den klaras ut." },
      { role: "Andra boll 2", positionCode: "LW", pos: [[0.155, 0.556]], primary: "Stå i zonen för andra boll och vinn bollen när den klaras ut." },
      { role: "Stanna framme", positionCode: "ST", pos: [[0.346, 0.497]], primary: "Stanna kvar framme som utspelsalternativ." },
    ],
    zones: [
      { name: "Zon 21", color: ZONE_BLUE, points: [[0.083, 0.37], [0.128, 0.47]] },
      { name: "Zon 22", color: ZONE_BLUE, points: [[0.083, 0.475], [0.128, 0.525]] },
      { name: "Zon 23", color: ZONE_BLUE, points: [[0.083, 0.53], [0.128, 0.63]] },
      { name: "Zon 11", color: ZONE_BLUE, points: [[0.038, 0.37], [0.083, 0.47]] },
      { name: "Zon 12", color: ZONE_BLUE, points: [[0.038, 0.475], [0.083, 0.525]] },
      { name: "Zon 13", color: ZONE_BLUE, points: [[0.038, 0.53], [0.083, 0.63]] },
      { name: "Andra boll", color: ZONE_AMBER, points: [[0.135, 0.39], [0.175, 0.61]] },
      { name: "Stanna framme", color: ZONE_GREY, points: [[0.325, 0.44], [0.365, 0.56]] },
    ],
  });

  const setPieceByName = async (name: string) => prisma.setPiece.findFirstOrThrow({ where: { name, category: { teamId: team.id } } });

  const [cornerRight, freeLeft, freeRight, defCornerLeft, defCornerRight] = await Promise.all([
    setPieceByName("Hörna höger"),
    setPieceByName("Frispark vänster"),
    setPieceByName("Frispark höger"),
    setPieceByName("Försvara hörna vänster"),
    setPieceByName("Försvara hörna höger"),
  ]);

  const first = await createVariant(cornerOff(cornerLeft.id, false));
  await createVariant(cornerOff(cornerRight.id, true));
  await createVariant(freeKickOff(freeLeft.id, false));
  await createVariant(freeKickOff(freeRight.id, true));
  await createVariant(cornerDef(defCornerLeft.id, false));
  await createVariant(cornerDef(defCornerRight.id, true));

  console.log("Seed complete.");
  console.log(`Team: ${team.name} (${team.id})`);
  console.log(`Default lineup: ${lineup.name} (${lineup.id})`);
  console.log(`First variant: ${first.name} (${first.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
