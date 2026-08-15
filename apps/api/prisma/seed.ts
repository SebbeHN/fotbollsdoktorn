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

const SPECIAL_ROLES = [
  "Corner Taker",
  "First Runner",
  "Second Runner",
  "Goalkeeper Blocker",
  "Central Screen",
  "Far Post Runner",
  "Edge Left",
  "Edge Central",
  "Rest Defence Left",
  "Rest Defence Right",
  "Safety",
] as const;

async function main() {
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
      SPECIAL_ROLES.map(async (name) => [
        name,
        await prisma.tacticalRole.create({ data: { teamId: team.id, name, type: "SPECIAL" } }),
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

  console.log("Building H1 - Forsta example variant...");
  const tags = Object.fromEntries(
    await Promise.all(
      ["Zonal defence", "Man marking", "Short corner", "First post", "Far post", "Vs 4-4-2", "Vs 5-3-2"].map(
        async (name) => [name, await prisma.tag.create({ data: { teamId: team.id, name } })]
      )
    )
  );

  const variant = await prisma.setPieceVariant.create({
    data: {
      setPieceId: cornerLeft.id,
      name: "H1 - Forsta",
      description: "Hörna vänster med två löpare mot första stolpen och blockering på målvakten.",
      tacticalPurpose: "Skapa första kontakt i främre zon och attackera andrabollen.",
      priority: 1,
      signal: "Röd",
      notes: "Grundvariant. Fungerar bäst mot lag som försvarar zonalt.",
      stages: { create: [{ order: 1, name: "Stage 1", triggerDescription: "Hörnläggaren startar sin ansats." }] },
      tags: { create: [{ tagId: tags["First post"].id }] },
    },
    include: { stages: true },
  });
  const stage1 = variant.stages[0];

  type RoleSeed = {
    role: keyof typeof specialRoles;
    positionCode?: keyof typeof positionByCode;
    x: number;
    y: number;
    primary: string;
    secondary?: string;
    onLossOfBall?: string;
    timing?: string;
    priority?: number;
  };

  const roleSeeds: RoleSeed[] = [
    {
      role: "Corner Taker",
      positionCode: "LW",
      x: 0.02,
      y: 0.02,
      primary: "Slå en driven boll mot första zonen, i höjd med femmetersområdet.",
      timing: "Vänta på signal från First Runner innan ansatsen påbörjas.",
      priority: 1,
    },
    {
      role: "First Runner",
      positionCode: "LCB",
      x: 0.32,
      y: 0.1,
      primary: "Starta centralt. När hörnläggaren börjar sin ansats, attackera första stolpen med maximal fart.",
      secondary: "Om första ytan är blockerad, fortsätt löpningen mot främre delen av femmetersområdet.",
      onLossOfBall: "Direkt återpress i 3 sekunder, därefter fall tillbaka.",
      timing: "Starta löpningen när hörnläggaren tar sitt näst sista steg.",
      priority: 1,
    },
    {
      role: "Far Post Runner",
      positionCode: "RCB",
      x: 0.75,
      y: 0.06,
      primary: "Attackera bortre stolpen och möt bollar som glider över den första zonen.",
      onLossOfBall: "Fall tillbaka till rest defence-linjen.",
      priority: 2,
    },
    {
      role: "Goalkeeper Blocker",
      positionCode: "ST",
      x: 0.5,
      y: 0.03,
      primary: "Blockera målvaktens yta lagligt och hindra utrusning mot första zonen.",
      priority: 2,
    },
    {
      role: "Central Screen",
      positionCode: "RCM",
      x: 0.5,
      y: 0.14,
      primary: "Blockera motståndarens zonspelare centralt så att First Runner får fri väg.",
      priority: 3,
    },
    {
      role: "Second Runner",
      positionCode: "LCM",
      x: 0.42,
      y: 0.2,
      primary: "Attackera andrabollen i central zon om första inlägget klareras kort.",
      priority: 2,
    },
    {
      role: "Edge Left",
      positionCode: "LB",
      x: 0.25,
      y: 0.24,
      primary: "Stanna i defensiv balans utanför straffområdet.",
      onLossOfBall: "Första försvarare vid omedelbar kontring.",
      priority: 3,
    },
    {
      role: "Edge Central",
      positionCode: "DM",
      x: 0.5,
      y: 0.26,
      primary: "Täck edge of box och plocka upp klärningar.",
      priority: 2,
    },
    {
      role: "Rest Defence Left",
      positionCode: "RB",
      x: 0.15,
      y: 0.42,
      primary: "Säkra vänster zon i rest defence vid bollförlust.",
      priority: 3,
    },
    {
      role: "Rest Defence Right",
      positionCode: "RW",
      x: 0.85,
      y: 0.42,
      primary: "Säkra höger zon i rest defence vid bollförlust.",
      priority: 3,
    },
    {
      role: "Safety",
      x: 0.5,
      y: 0.45,
      primary: "Positionera dig centralt för att plocka upp klärade bollar. Roll ej tilldelad en formationsposition ännu.",
      priority: 3,
    },
  ];

  for (const [i, seed] of roleSeeds.entries()) {
    await prisma.setPieceRole.create({
      data: {
        variantId: variant.id,
        tacticalRoleId: specialRoles[seed.role].id,
        assignedPositionId: seed.positionCode ? positionByCode[seed.positionCode].id : null,
        sortOrder: i,
        instruction: {
          create: {
            primary: seed.primary,
            secondary: seed.secondary,
            onLossOfBall: seed.onLossOfBall,
            timing: seed.timing,
            priority: seed.priority,
          },
        },
        positions: { create: [{ stageId: stage1.id, entityType: "OWN_ROLE", x: seed.x, y: seed.y }] },
      },
    });
  }

  // Ball marker at the corner flag for stage 1.
  await prisma.setPiecePosition.create({
    data: { stageId: stage1.id, entityType: "BALL", x: 0.0, y: 0.0 },
  });

  console.log("Seed complete.");
  console.log(`Team: ${team.name} (${team.id})`);
  console.log(`Default lineup: ${lineup.name} (${lineup.id})`);
  console.log(`Example variant: ${variant.name} (${variant.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
