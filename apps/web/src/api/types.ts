// Types mirroring the API's JSON responses (including relations the backend
// eagerly includes). Kept local to the web app since the exact "include"
// shape is a frontend concern; packages/shared holds the more abstract DTOs.

export type DominantFoot = "LEFT" | "RIGHT" | "BOTH";
export type PlayerAvailability = "AVAILABLE" | "INJURED" | "SUSPENDED" | "NOT_SELECTED";
export type TacticalRoleType = "POSITIONAL" | "SPECIAL";
export type SetPieceType = "OFFENSIVE" | "DEFENSIVE" | "CUSTOM";

export interface Team {
  id: string;
  name: string;
  season: string | null;
}

export interface Position {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  shirtNumber: number;
  photoUrl: string | null;
  isGoalkeeper: boolean;
  primaryPositionId: string | null;
  primaryPosition?: Position | null;
  secondaryPositionIds: string[];
  dominantFoot: DominantFoot;
  heightCm: number | null;
  duelStrength: number | null;
  headingStrength: number | null;
  notes: string | null;
  availability: PlayerAvailability;
}

export interface TacticalRole {
  id: string;
  teamId: string | null;
  name: string;
  type: TacticalRoleType;
  positionId: string | null;
  position?: Position | null;
  color: string | null;
}

export interface LineupAssignment {
  id: string;
  lineupId: string;
  positionId: string;
  position: Position;
  playerId: string | null;
  player: Player | null;
}

export interface Lineup {
  id: string;
  teamId: string;
  name: string;
  formation: string;
  isDefault: boolean;
  assignments: LineupAssignment[];
}

export interface SetPieceCategory {
  id: string;
  teamId: string;
  name: string;
  type: SetPieceType;
  parentId: string | null;
  setPieces?: SetPieceSummary[];
}

export interface SetPieceSummary {
  id: string;
  categoryId: string;
  name: string;
  type: SetPieceType;
  variants: { id: string; name: string; isActive: boolean; signal?: string | null }[];
}

export interface SetPieceInstruction {
  id: string;
  setPieceRoleId: string;
  primary: string | null;
  secondary: string | null;
  onLossOfBall: string | null;
  timing: string | null;
  priority: number | null;
}

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface SetPieceRole {
  id: string;
  variantId: string;
  tacticalRoleId: string;
  tacticalRole: TacticalRole;
  assignedPositionId: string | null;
  assignedPosition?: Position | null;
  label: string | null;
  colorOverride: string | null;
  sortOrder: number;
  instruction: SetPieceInstruction | null;
  resolvedPlayer: Player | null;
  resolvedPosition: NormalizedPoint | null;
}

export interface SetPiecePosition {
  id: string;
  stageId: string;
  entityType: "OWN_ROLE" | "OPPONENT" | "BALL" | "CONE";
  setPieceRoleId: string | null;
  opponentMarkerId: string | null;
  x: number;
  y: number;
}

export type ArrowType = "RUN" | "PASS" | "BLOCK" | "ALT_RUN";

export interface SetPieceMovement {
  id: string;
  stageId: string;
  setPieceRoleId: string | null;
  type: ArrowType;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  label: string | null;
}

export interface SetPieceStage {
  id: string;
  variantId: string;
  order: number;
  name: string;
  triggerDescription: string | null;
  durationMs: number | null;
  positions: SetPiecePosition[];
  movements: SetPieceMovement[];
}

export interface SetPieceZone {
  id: string;
  variantId: string;
  name: string;
  color: string;
  points: NormalizedPoint[];
}

export interface SetPieceVariant {
  id: string;
  setPieceId: string;
  name: string;
  description: string | null;
  tacticalPurpose: string | null;
  priority: number | null;
  signal: string | null;
  notes: string | null;
  isActive: boolean;
  roles: SetPieceRole[];
  stages: SetPieceStage[];
  zones: SetPieceZone[];
  resolvedLineupId: string | null;
  ball: NormalizedPoint | null;
  setPiece?: { id: string; name: string; type: SetPieceType };
}

export interface DashboardData {
  nextMatch: null | {
    id: string;
    opponentName: string;
    date: string;
    setPieces: { role: string; variant: { id: string; name: string } }[];
  };
  recentVariants: { id: string; name: string; updatedAt: string; setPiece: { id: string; name: string } }[];
  playerCount: number;
  setPieceCount: number;
}
