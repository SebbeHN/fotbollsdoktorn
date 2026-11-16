import type { Position } from "@prisma/client";

const POSITION_ALIASES: Record<string, string> = {
  mv: "GK",
  keeper: "GK",
  goalkeeper: "GK",
  malvakt: "GK",
  hb: "RB",
  vb: "LB",
  hmb: "RCB",
  vmb: "LCB",
  hcm: "RCM",
  vcm: "LCM",
  hy: "RW",
  vy: "LW",
  fw: "ST",
  forward: "ST",
  striker: "ST",
  anfall: "ST",
  cdm: "DM",
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Resolves free text from a spreadsheet ("RB", "Högerback", "hb") to a formation position. */
export function createPositionResolver(positions: Position[]) {
  const lookup = new Map<string, Position>();
  for (const p of positions) {
    lookup.set(normalize(p.code), p);
    lookup.set(normalize(p.name), p);
  }
  for (const [alias, code] of Object.entries(POSITION_ALIASES)) {
    const target = positions.find((p) => p.code === code);
    if (target && !lookup.has(alias)) lookup.set(alias, target);
  }
  return (text: string | null | undefined): Position | null => {
    if (!text) return null;
    return lookup.get(normalize(text)) ?? null;
  };
}
