-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('HEAD_COACH', 'ASSISTANT_COACH', 'SET_PIECE_COACH', 'PLAYER');

-- CreateEnum
CREATE TYPE "DominantFoot" AS ENUM ('LEFT', 'RIGHT', 'BOTH');

-- CreateEnum
CREATE TYPE "PlayerAvailability" AS ENUM ('AVAILABLE', 'INJURED', 'SUSPENDED', 'NOT_SELECTED');

-- CreateEnum
CREATE TYPE "TacticalRoleType" AS ENUM ('POSITIONAL', 'SPECIAL');

-- CreateEnum
CREATE TYPE "SetPieceType" AS ENUM ('OFFENSIVE', 'DEFENSIVE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PositionEntityType" AS ENUM ('OWN_ROLE', 'OPPONENT', 'BALL', 'CONE');

-- CreateEnum
CREATE TYPE "ArrowType" AS ENUM ('RUN', 'PASS', 'BLOCK', 'ALT_RUN');

-- CreateEnum
CREATE TYPE "OverrideScope" AS ENUM ('MATCH', 'PLAYER', 'LINEUP');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'HEAD_COACH',
    "teamId" TEXT,
    "playerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "season" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shirtNumber" INTEGER NOT NULL,
    "photoUrl" TEXT,
    "isGoalkeeper" BOOLEAN NOT NULL DEFAULT false,
    "primaryPositionId" TEXT,
    "dominantFoot" "DominantFoot" NOT NULL DEFAULT 'RIGHT',
    "heightCm" INTEGER,
    "notes" TEXT,
    "availability" "PlayerAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSecondaryPosition" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,

    CONSTRAINT "PlayerSecondaryPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TacticalRole" (
    "id" TEXT NOT NULL,
    "teamId" TEXT,
    "name" TEXT NOT NULL,
    "type" "TacticalRoleType" NOT NULL DEFAULT 'SPECIAL',
    "positionId" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TacticalRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lineup" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formation" TEXT NOT NULL DEFAULT '4-3-3',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lineup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LineupAssignment" (
    "id" TEXT NOT NULL,
    "lineupId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "playerId" TEXT,

    CONSTRAINT "LineupAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetPieceCategory" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SetPieceType" NOT NULL DEFAULT 'CUSTOM',
    "parentId" TEXT,

    CONSTRAINT "SetPieceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetPiece" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SetPieceType" NOT NULL DEFAULT 'OFFENSIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetPiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetPieceVariant" (
    "id" TEXT NOT NULL,
    "setPieceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tacticalPurpose" TEXT,
    "priority" INTEGER,
    "signal" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetPieceVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetPieceRole" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "tacticalRoleId" TEXT NOT NULL,
    "assignedPositionId" TEXT,
    "label" TEXT,
    "colorOverride" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SetPieceRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetPieceInstruction" (
    "id" TEXT NOT NULL,
    "setPieceRoleId" TEXT NOT NULL,
    "primary" TEXT,
    "secondary" TEXT,
    "onLossOfBall" TEXT,
    "timing" TEXT,
    "priority" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetPieceInstruction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetPieceStage" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "triggerDescription" TEXT,
    "durationMs" INTEGER,

    CONSTRAINT "SetPieceStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetPiecePosition" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "entityType" "PositionEntityType" NOT NULL,
    "setPieceRoleId" TEXT,
    "opponentMarkerId" TEXT,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "SetPiecePosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetPieceMovement" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "setPieceRoleId" TEXT,
    "type" "ArrowType" NOT NULL DEFAULT 'RUN',
    "fromX" DOUBLE PRECISION NOT NULL,
    "fromY" DOUBLE PRECISION NOT NULL,
    "toX" DOUBLE PRECISION NOT NULL,
    "toY" DOUBLE PRECISION NOT NULL,
    "pathPoints" JSONB,
    "label" TEXT,

    CONSTRAINT "SetPieceMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetPieceZone" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#38bdf8',
    "points" JSONB NOT NULL,

    CONSTRAINT "SetPieceZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetPieceVariantVersion" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetPieceVariantVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "opponentName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "formation" TEXT,
    "lineupId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSquad" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "status" "PlayerAvailability" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "MatchSquad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSetPiece" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PRIMARY',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MatchSetPiece_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opponent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "formation" TEXT,

    CONSTRAINT "Opponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpponentPlayer" (
    "id" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "OpponentPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetPieceOverride" (
    "id" TEXT NOT NULL,
    "setPieceRoleId" TEXT NOT NULL,
    "scope" "OverrideScope" NOT NULL,
    "matchId" TEXT,
    "playerId" TEXT,
    "primary" TEXT,
    "secondary" TEXT,
    "onLossOfBall" TEXT,
    "timing" TEXT,
    "priority" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetPieceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetPieceTag" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "SetPieceTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_playerId_key" ON "User"("playerId");

-- CreateIndex
CREATE INDEX "Player_teamId_idx" ON "Player"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Position_code_key" ON "Position"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSecondaryPosition_playerId_positionId_key" ON "PlayerSecondaryPosition"("playerId", "positionId");

-- CreateIndex
CREATE INDEX "TacticalRole_teamId_idx" ON "TacticalRole"("teamId");

-- CreateIndex
CREATE INDEX "Lineup_teamId_idx" ON "Lineup"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "LineupAssignment_lineupId_positionId_key" ON "LineupAssignment"("lineupId", "positionId");

-- CreateIndex
CREATE INDEX "SetPieceCategory_teamId_idx" ON "SetPieceCategory"("teamId");

-- CreateIndex
CREATE INDEX "SetPiece_categoryId_idx" ON "SetPiece"("categoryId");

-- CreateIndex
CREATE INDEX "SetPieceVariant_setPieceId_idx" ON "SetPieceVariant"("setPieceId");

-- CreateIndex
CREATE INDEX "SetPieceRole_variantId_idx" ON "SetPieceRole"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "SetPieceInstruction_setPieceRoleId_key" ON "SetPieceInstruction"("setPieceRoleId");

-- CreateIndex
CREATE INDEX "SetPieceStage_variantId_idx" ON "SetPieceStage"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "SetPieceStage_variantId_order_key" ON "SetPieceStage"("variantId", "order");

-- CreateIndex
CREATE INDEX "SetPiecePosition_stageId_idx" ON "SetPiecePosition"("stageId");

-- CreateIndex
CREATE INDEX "SetPieceMovement_stageId_idx" ON "SetPieceMovement"("stageId");

-- CreateIndex
CREATE INDEX "SetPieceZone_variantId_idx" ON "SetPieceZone"("variantId");

-- CreateIndex
CREATE INDEX "SetPieceVariantVersion_variantId_idx" ON "SetPieceVariantVersion"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "SetPieceVariantVersion_variantId_versionNumber_key" ON "SetPieceVariantVersion"("variantId", "versionNumber");

-- CreateIndex
CREATE INDEX "Match_teamId_idx" ON "Match"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSquad_matchId_playerId_key" ON "MatchSquad"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "MatchSetPiece_matchId_idx" ON "MatchSetPiece"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Opponent_matchId_key" ON "Opponent"("matchId");

-- CreateIndex
CREATE INDEX "SetPieceOverride_setPieceRoleId_idx" ON "SetPieceOverride"("setPieceRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_teamId_name_key" ON "Tag"("teamId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SetPieceTag_variantId_tagId_key" ON "SetPieceTag"("variantId", "tagId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_primaryPositionId_fkey" FOREIGN KEY ("primaryPositionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSecondaryPosition" ADD CONSTRAINT "PlayerSecondaryPosition_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSecondaryPosition" ADD CONSTRAINT "PlayerSecondaryPosition_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TacticalRole" ADD CONSTRAINT "TacticalRole_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TacticalRole" ADD CONSTRAINT "TacticalRole_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lineup" ADD CONSTRAINT "Lineup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupAssignment" ADD CONSTRAINT "LineupAssignment_lineupId_fkey" FOREIGN KEY ("lineupId") REFERENCES "Lineup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupAssignment" ADD CONSTRAINT "LineupAssignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LineupAssignment" ADD CONSTRAINT "LineupAssignment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceCategory" ADD CONSTRAINT "SetPieceCategory_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceCategory" ADD CONSTRAINT "SetPieceCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SetPieceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPiece" ADD CONSTRAINT "SetPiece_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SetPieceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceVariant" ADD CONSTRAINT "SetPieceVariant_setPieceId_fkey" FOREIGN KEY ("setPieceId") REFERENCES "SetPiece"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceRole" ADD CONSTRAINT "SetPieceRole_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SetPieceVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceRole" ADD CONSTRAINT "SetPieceRole_tacticalRoleId_fkey" FOREIGN KEY ("tacticalRoleId") REFERENCES "TacticalRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceRole" ADD CONSTRAINT "SetPieceRole_assignedPositionId_fkey" FOREIGN KEY ("assignedPositionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceInstruction" ADD CONSTRAINT "SetPieceInstruction_setPieceRoleId_fkey" FOREIGN KEY ("setPieceRoleId") REFERENCES "SetPieceRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceStage" ADD CONSTRAINT "SetPieceStage_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SetPieceVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPiecePosition" ADD CONSTRAINT "SetPiecePosition_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "SetPieceStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPiecePosition" ADD CONSTRAINT "SetPiecePosition_setPieceRoleId_fkey" FOREIGN KEY ("setPieceRoleId") REFERENCES "SetPieceRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPiecePosition" ADD CONSTRAINT "SetPiecePosition_opponentMarkerId_fkey" FOREIGN KEY ("opponentMarkerId") REFERENCES "OpponentPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceMovement" ADD CONSTRAINT "SetPieceMovement_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "SetPieceStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceMovement" ADD CONSTRAINT "SetPieceMovement_setPieceRoleId_fkey" FOREIGN KEY ("setPieceRoleId") REFERENCES "SetPieceRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceZone" ADD CONSTRAINT "SetPieceZone_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SetPieceVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceVariantVersion" ADD CONSTRAINT "SetPieceVariantVersion_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SetPieceVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_lineupId_fkey" FOREIGN KEY ("lineupId") REFERENCES "Lineup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSquad" ADD CONSTRAINT "MatchSquad_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSquad" ADD CONSTRAINT "MatchSquad_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSetPiece" ADD CONSTRAINT "MatchSetPiece_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSetPiece" ADD CONSTRAINT "MatchSetPiece_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SetPieceVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opponent" ADD CONSTRAINT "Opponent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpponentPlayer" ADD CONSTRAINT "OpponentPlayer_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "Opponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceOverride" ADD CONSTRAINT "SetPieceOverride_setPieceRoleId_fkey" FOREIGN KEY ("setPieceRoleId") REFERENCES "SetPieceRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceOverride" ADD CONSTRAINT "SetPieceOverride_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceOverride" ADD CONSTRAINT "SetPieceOverride_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceTag" ADD CONSTRAINT "SetPieceTag_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "SetPieceVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetPieceTag" ADD CONSTRAINT "SetPieceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
