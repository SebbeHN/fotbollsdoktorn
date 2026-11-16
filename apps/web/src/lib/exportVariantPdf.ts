import { jsPDF } from "jspdf";
import type { SetPieceRole, SetPieceVariant } from "../api/types";

export interface StageImage {
  name: string;
  trigger: string | null;
  note: string | null;
  arrowTypes: string[];
  dataUrl: string;
  width: number;
  height: number;
}

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 10;
const LIST_X = 202;
const LIST_W = PAGE_W - MARGIN - LIST_X;

function hexToRgb(hex: string | null | undefined): [number, number, number] {
  const m = (hex ?? "").match(/^#?([0-9a-f]{6})$/i);
  if (!m) return [37, 99, 235];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function roleName(role: SetPieceRole) {
  return role.label ?? role.tacticalRole.name;
}

/**
 * Landscape A4 handout for going through a set piece with the squad: one large pitch page per step
 * (numbers on the pitch, names and tasks in a column next to it), then one page section with every
 * instruction in full.
 */
export function exportVariantPdf(variant: SetPieceVariant, images: StageImage[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const title = `${variant.setPiece?.name ?? "Fast situation"} – ${variant.name}`;
  const isDefensive = variant.setPiece?.type === "DEFENSIVE";
  const accent: [number, number, number] = isDefensive ? [14, 116, 144] : [180, 83, 9];

  images.forEach((img, i) => {
    if (i > 0) doc.addPage();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text(title, MARGIN, 15);

    doc.setFontSize(10);
    doc.setTextColor(...accent);
    const kind = isDefensive ? "DEFENSIVT" : "OFFENSIVT";
    const signal = variant.signal ? `   ·   Signal: ${variant.signal}` : "";
    doc.text(`${kind}${signal}`, MARGIN, 7.5);

    doc.setFontSize(13);
    doc.setTextColor(22, 101, 52);
    doc.text(`Steg ${i + 1} av ${images.length}: ${img.name}`, PAGE_W - MARGIN, 11, { align: "right" });
    if (img.trigger) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Startar när: ${img.trigger}`, PAGE_W - MARGIN, 16.5, { align: "right" });
    }

    // Pitch, as large as the page allows.
    const areaX = MARGIN;
    const areaY = 21;
    const areaW = LIST_X - MARGIN - 5;
    const areaH = PAGE_H - areaY - MARGIN;
    const scale = Math.min(areaW / img.width, areaH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    doc.addImage(img.dataUrl, "JPEG", areaX + (areaW - w) / 2, areaY, w, h);

    // Legend for the arrow types used in this step.
    const legend: Record<string, { label: string; color: [number, number, number]; dash: number[] }> = {
      RUN: { label: "Löpning", color: [202, 138, 4], dash: [] },
      ALT_RUN: { label: "Alternativ löpning", color: [202, 138, 4], dash: [2, 1.5] },
      PASS: { label: "Passning / inlägg", color: [30, 41, 59], dash: [] },
      BLOCK: { label: "Block / skärm", color: [234, 88, 12], dash: [0.6, 1.4] },
    };
    let lx = areaX + (areaW - w) / 2;
    const ly = areaY + h + 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const type of img.arrowTypes) {
      const item = legend[type];
      if (!item) continue;
      doc.setDrawColor(...item.color);
      doc.setLineWidth(0.9);
      doc.setLineDashPattern(item.dash, 0);
      doc.line(lx, ly - 1.2, lx + 10, ly - 1.2);
      doc.setLineDashPattern([], 0);
      doc.setTextColor(71, 85, 105);
      doc.text(item.label, lx + 12.5, ly);
      lx += 12.5 + doc.getTextWidth(item.label) + 8;
    }

    let y = areaY;
    if (img.note) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(img.note, LIST_W - 8) as string[];
      const boxH = lines.length * 5 + 11;
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(217, 119, 6);
      doc.setLineWidth(0.6);
      doc.roundedRect(LIST_X, y, LIST_W, boxH, 2, 2, "FD");
      doc.setFontSize(8.5);
      doc.setTextColor(146, 64, 14);
      doc.text("OBS", LIST_X + 4, y + 5.5);
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(lines, LIST_X + 4, y + 11);
      y += boxH + 4;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("UPPGIFTER", LIST_X, y + 3);
    y += 7;

    let clipped = false;
    for (const role of variant.roles) {
      const instr = role.instruction?.primary ?? "";
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const lines = instr ? (doc.splitTextToSize(instr, LIST_W - 9) as string[]) : [];
      const rowH = 5 + lines.length * 4.1 + 2.2;
      if (y + rowH > PAGE_H - MARGIN - 4) {
        clipped = true;
        break;
      }
      const [r, g, b] = hexToRgb(role.colorOverride ?? role.tacticalRole.color);
      doc.setFillColor(r, g, b);
      doc.circle(LIST_X + 3, y + 2.2, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(String(role.resolvedPlayer?.shirtNumber ?? "?"), LIST_X + 3, y + 3.4, { align: "center" });

      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      const who = role.resolvedPlayer?.name ?? roleName(role);
      doc.text(who, LIST_X + 8, y + 3);
      if (role.resolvedPlayer) {
        const nameW = doc.getTextWidth(who);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`· ${roleName(role)}`, LIST_X + 8 + nameW + 1.5, y + 3);
      }
      if (lines.length) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        doc.text(lines, LIST_X + 8, y + 7.4);
      }
      y += rowH;
    }
    if (clipped) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Fler uppgifter finns på sista sidan.", LIST_X, PAGE_H - MARGIN - 1);
    }
  });

  // Full instructions, one block per player.
  doc.addPage();
  let y = MARGIN + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(`${title} – alla uppgifter`, MARGIN, y);
  y += 4;
  const meta: string[] = [];
  if (variant.tacticalPurpose) meta.push(`Syfte: ${variant.tacticalPurpose}`);
  if (variant.description) meta.push(variant.description);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  for (const line of meta) {
    const wrapped = doc.splitTextToSize(line, PAGE_W - MARGIN * 2) as string[];
    y += 6;
    doc.text(wrapped, MARGIN, y);
    y += (wrapped.length - 1) * 4.8;
  }
  y += 9;

  const colW = (PAGE_W - MARGIN * 2 - 8) / 2;
  let col = 0;
  let colY = y;
  const top = y;
  const bottom = PAGE_H - MARGIN;

  for (const role of variant.roles) {
    const fields: [string, string | null | undefined][] = [
      ["Uppgift", role.instruction?.primary],
      ["Sedan", role.instruction?.secondary],
      ["Timing", role.instruction?.timing],
      ["Om vi tappar bollen", role.instruction?.onLossOfBall],
    ];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const blocks = fields
      .filter(([, v]) => v)
      .map(([label, v]) => ({ label, lines: doc.splitTextToSize(v!, colW - 9) as string[] }));
    const height = 8 + blocks.reduce((a, b) => a + 4.6 + b.lines.length * 4.8, 0) + 4;

    if (colY + height > bottom) {
      if (col === 0) {
        col = 1;
        colY = top;
      } else {
        doc.addPage();
        col = 0;
        colY = MARGIN + 6;
      }
    }
    const x = MARGIN + col * (colW + 8);
    const [r, g, b] = hexToRgb(role.colorOverride ?? role.tacticalRole.color);
    doc.setFillColor(r, g, b);
    doc.circle(x + 3.5, colY + 2, 3.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(String(role.resolvedPlayer?.shirtNumber ?? "?"), x + 3.5, colY + 3.3, { align: "center" });
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    const head = role.resolvedPlayer ? `${role.resolvedPlayer.name} · ${roleName(role)}` : roleName(role);
    doc.text(head, x + 9, colY + 3.4);

    let by = colY + 9;
    if (blocks.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Ingen instruktion skriven.", x + 9, by);
      by += 5;
    }
    for (const block of blocks) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(180, 83, 9);
      doc.text(block.label.toUpperCase(), x + 9, by);
      by += 4.2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(block.lines, x + 9, by);
      by += block.lines.length * 4.8 + 0.6;
    }
    colY += height;
  }

  const fileName = title
    .toLowerCase()
    .replace(/å|ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  doc.save(`${fileName || "variant"}.pdf`);
}
