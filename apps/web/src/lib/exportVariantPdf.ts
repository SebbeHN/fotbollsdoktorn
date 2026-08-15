import { jsPDF } from "jspdf";
import type { SetPieceVariant } from "../api/types";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

/**
 * Builds a one-variant coaching sheet PDF: header/meta info, the pitch
 * diagram (as a PNG captured from the Konva stage), and a table of each
 * role's instructions. Triggers a browser download.
 */
export function exportVariantPdf(variant: SetPieceVariant, diagramDataUrl: string | null) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`${variant.setPiece?.name ?? "Fast situation"} — ${variant.name}`, MARGIN, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const metaLines: string[] = [];
  if (variant.tacticalPurpose) metaLines.push(`Taktiskt syfte: ${variant.tacticalPurpose}`);
  if (variant.signal) metaLines.push(`Signal: ${variant.signal}`);
  if (variant.description) metaLines.push(`Beskrivning: ${variant.description}`);
  for (const line of metaLines) {
    const wrapped = doc.splitTextToSize(line, CONTENT_W);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 4.5;
  }
  y += 3;

  if (diagramDataUrl) {
    // Diagram aspect ratio comes from the stage's own width/height, embedded
    // in the data URL's implicit image dimensions — draw it to fit the page
    // width and let the browser-decoded image determine the height via a
    // fixed max, since jsPDF needs explicit dimensions up front. We fall back
    // to a sensible 4:3-ish box that matches the pitch canvas proportions.
    const imgW = CONTENT_W;
    const imgH = imgW * 0.65;
    if (y + imgH > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
    doc.addImage(diagramDataUrl, "PNG", MARGIN, y, imgW, imgH);
    y += imgH + 6;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  if (y > PAGE_H - MARGIN - 10) {
    doc.addPage();
    y = MARGIN;
  }
  doc.text("Roller och instruktioner", MARGIN, y);
  y += 6;

  const colWidths = { role: 45, player: 35, instr: CONTENT_W - 45 - 35 };
  doc.setFontSize(9);

  for (const role of variant.roles) {
    const roleName = role.label ? `${role.label} (${role.tacticalRole.name})` : role.tacticalRole.name;
    const playerName = role.resolvedPlayer
      ? `#${role.resolvedPlayer.shirtNumber} ${role.resolvedPlayer.name}`
      : "-";
    const instrParts: string[] = [];
    if (role.instruction?.primary) instrParts.push(`Primär: ${role.instruction.primary}`);
    if (role.instruction?.secondary) instrParts.push(`Sekundär: ${role.instruction.secondary}`);
    if (role.instruction?.timing) instrParts.push(`Timing: ${role.instruction.timing}`);
    if (role.instruction?.onLossOfBall) instrParts.push(`Vid bollförlust: ${role.instruction.onLossOfBall}`);
    const instrText = instrParts.length ? instrParts.join(" | ") : "-";

    const roleLines = doc.splitTextToSize(roleName, colWidths.role);
    const playerLines = doc.splitTextToSize(playerName, colWidths.player);
    const instrLines = doc.splitTextToSize(instrText, colWidths.instr);
    const rowLines = Math.max(roleLines.length, playerLines.length, instrLines.length);
    const rowHeight = rowLines * 4.2 + 3;

    if (y + rowHeight > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }

    doc.setFont("helvetica", "bold");
    doc.text(roleLines, MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(playerLines, MARGIN + colWidths.role, y);
    doc.text(instrLines, MARGIN + colWidths.role + colWidths.player, y);

    y += rowHeight;
    doc.setDrawColor(220);
    doc.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2);
  }

  const fileName = `${(variant.setPiece?.name ?? "fast-situation")}-${variant.name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  doc.save(`${fileName || "variant"}.pdf`);
}
