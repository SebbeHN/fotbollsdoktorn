// Shared enums & DTO types used by both apps/api and apps/web.
// Keep this free of framework-specific code (no Express/React/Prisma imports).

export type DominantFoot = "LEFT" | "RIGHT" | "BOTH";

export type PlayerAvailability =
  | "AVAILABLE"
  | "INJURED"
  | "SUSPENDED"
  | "NOT_SELECTED";

export type TacticalRoleType = "POSITIONAL" | "SPECIAL";

export type SetPieceType = "OFFENSIVE" | "DEFENSIVE" | "CUSTOM";

export type OverrideScope = "MATCH" | "PLAYER" | "LINEUP";

export type ArrowType = "RUN" | "PASS" | "BLOCK" | "ALT_RUN";

export type UserRole =
  | "HEAD_COACH"
  | "ASSISTANT_COACH"
  | "SET_PIECE_COACH"
  | "PLAYER";

/** Normalized pitch coordinate: 0..1 on both axes, independent of screen size. */
export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface PlayerDTO {
  id: string;
  teamId: string;
  name: string;
  shirtNumber: number;
  photoUrl?: string | null;
  isGoalkeeper: boolean;
  primaryPositionId?: string | null;
  secondaryPositionIds: string[];
  dominantFoot: DominantFoot;
  heightCm?: number | null;
  notes?: string | null;
  availability: PlayerAvailability;
}

export interface PositionDTO {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
}

export interface TacticalRoleDTO {
  id: string;
  teamId?: string | null;
  name: string;
  type: TacticalRoleType;
  positionId?: string | null;
  color?: string | null;
}

export interface LineupAssignmentDTO {
  id: string;
  lineupId: string;
  positionId: string;
  playerId: string | null;
}

export interface LineupDTO {
  id: string;
  teamId: string;
  name: string;
  formation: string;
  isDefault: boolean;
  assignments: LineupAssignmentDTO[];
}

export interface SetPieceInstructionDTO {
  id: string;
  setPieceRoleId: string;
  primary: string | null;
  secondary: string | null;
  onLossOfBall: string | null;
  timing: string | null;
  priority: number | null;
}

export interface SetPieceRoleDTO {
  id: string;
  variantId: string;
  tacticalRoleId: string;
  tacticalRole?: TacticalRoleDTO;
  assignedPositionId?: string | null;
  label?: string | null;
  colorOverride?: string | null;
  instruction?: SetPieceInstructionDTO | null;
  /** Resolved at read-time by the API: role -> lineup -> player */
  resolvedPlayer?: PlayerDTO | null;
  resolvedPosition?: NormalizedPoint | null;
}

export interface SetPieceVariantDTO {
  id: string;
  setPieceId: string;
  name: string;
  description?: string | null;
  tacticalPurpose?: string | null;
  priority?: number | null;
  signal?: string | null;
  notes?: string | null;
  isActive: boolean;
  tags: string[];
  roles: SetPieceRoleDTO[];
}

export interface SetPieceDTO {
  id: string;
  categoryId: string;
  name: string;
  type: SetPieceType;
  variants: SetPieceVariantDTO[];
}

export interface SetPieceCategoryDTO {
  id: string;
  teamId: string;
  name: string;
  type: SetPieceType;
  parentId?: string | null;
}
