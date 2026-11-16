import type { SetPiecePosition, SetPieceStage, SetPieceType } from "../api/types";
import type { PitchView } from "../pages/editor/PitchCanvas";

const BOX_SITUATION = /hörn|corner|frispark|free.?kick|straff|penalty|inkast/i;

/** Corners, free kicks and similar are shown zoomed in on the relevant penalty area,
 * with the goal at the top (own attack) or bottom (defending), like the coaching slides. */
export function defaultViewFor(name: string | undefined, type: SetPieceType | undefined): PitchView {
  if (!name || !BOX_SITUATION.test(name)) return "full";
  if (/inkast/i.test(name)) return "full";
  return type === "DEFENSIVE" ? "defend" : "attack";
}

/** Positions to draw for a stage. A role without its own position on that stage keeps its
 * position from the closest earlier stage, so roles never silently vanish between steps. */
export function effectivePositions(stages: SetPieceStage[], index: number): SetPiecePosition[] {
  const current = stages[index];
  if (!current) return [];
  const result = [...current.positions];
  const seen = new Set(result.map((p) => (p.entityType === "BALL" ? "BALL" : p.setPieceRoleId)));
  for (let i = index - 1; i >= 0; i--) {
    for (const p of stages[i].positions) {
      const key = p.entityType === "BALL" ? "BALL" : p.setPieceRoleId;
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(p);
      }
    }
  }
  return result;
}
