import { readSheet } from "read-excel-file/browser";

export interface ImportPlayerRow {
  name: string;
  shirtNumber?: number;
  position?: string | null;
  secondaryPositions?: string[];
  dominantFoot?: "LEFT" | "RIGHT" | "BOTH" | null;
  heightCm?: number | null;
  isGoalkeeper?: boolean | null;
  availability?: "AVAILABLE" | "INJURED" | "SUSPENDED" | "NOT_SELECTED" | null;
  duelStrength?: number | null;
  headingStrength?: number | null;
  notes?: string | null;
}

export interface ParsedSquad {
  rows: ImportPlayerRow[];
  /** Header text found in the file for each field that was recognised. */
  recognized: string[];
  /** Header text that could not be matched to anything (ignored). */
  ignored: string[];
}

type Cell = string | number | boolean | Date | null | undefined;
type Field =
  | "name"
  | "firstName"
  | "lastName"
  | "shirtNumber"
  | "position"
  | "secondary"
  | "foot"
  | "height"
  | "goalkeeper"
  | "availability"
  | "duel"
  | "heading"
  | "notes";

const HEADER_ALIASES: Record<Field, string[]> = {
  name: ["namn", "spelare", "name", "player", "spelarnamn", "fullname", "heltnamn"],
  firstName: ["fornamn", "firstname", "first", "given"],
  lastName: ["efternamn", "lastname", "last", "surname", "family"],
  shirtNumber: ["nr", "nummer", "trojnummer", "troja", "number", "no", "shirt", "shirtnumber", "tnr", "nr."],
  position: ["position", "pos", "huvudposition", "primaryposition", "primary", "plats"],
  secondary: ["sekundarposition", "sekundar", "andraposition", "alternativposition", "secondary", "secondaryposition", "positioner", "ovrigapositioner"],
  foot: ["fot", "starkfot", "foot", "dominantfoot", "dominantfot"],
  height: ["langd", "hojd", "height", "cm", "langdcm"],
  goalkeeper: ["malvakt", "mv", "gk", "keeper", "goalkeeper"],
  availability: ["status", "tillganglighet", "tillganglig", "availability", "skadestatus"],
  duel: ["duellspel", "duell", "duellstyrka", "duel", "duelstrength"],
  heading: ["huvudspel", "nick", "nickstyrka", "heading", "headingstrength"],
  notes: ["anteckning", "anteckningar", "notering", "noteringar", "kommentar", "kommentarer", "notes", "note", "info"],
};

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9#]/g, "")
    .replace(/^#$/, "nr");
}

/** Splits delimited text (comma, semicolon or tab — Swedish Excel saves CSV with semicolons). */
export function parseDelimited(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/).find((l) => l.trim()) ?? "";
  const counts = { ";": 0, "\t": 0, ",": 0 };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch as keyof typeof counts]++;
  }
  const delimiter = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ",") as string;

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function str(c: Cell): string {
  if (c === null || c === undefined) return "";
  if (c instanceof Date) return "";
  return String(c).trim();
}

function toInt(c: Cell): number | undefined {
  const s = str(c).replace(",", ".");
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? Math.round(Number(m[0])) : undefined;
}

function toHeight(c: Cell): number | null {
  const n = toInt(c);
  if (n === undefined) return null;
  // "1,84" / "1.84" metres are common in Swedish sheets.
  const asNumber = Number(str(c).replace(",", ".").match(/\d+(\.\d+)?/)?.[0]);
  if (asNumber > 0 && asNumber < 3) return Math.round(asNumber * 100);
  return n;
}

function toFoot(c: Cell): ImportPlayerRow["dominantFoot"] {
  const s = norm(str(c));
  if (!s) return null;
  if (["h", "hoger", "r", "right", "hogerfot"].includes(s)) return "RIGHT";
  if (["v", "vanster", "l", "left", "vansterfot"].includes(s)) return "LEFT";
  if (["b", "badda", "bada", "both", "tvafota", "bagge"].includes(s)) return "BOTH";
  return null;
}

function toBool(c: Cell): boolean | null {
  if (typeof c === "boolean") return c;
  const s = norm(str(c));
  if (!s) return null;
  if (["ja", "j", "x", "1", "true", "yes", "y", "mv", "malvakt", "gk"].includes(s)) return true;
  if (["nej", "n", "0", "false", "no", ""].includes(s)) return false;
  return null;
}

function toAvailability(c: Cell): ImportPlayerRow["availability"] {
  const s = norm(str(c));
  if (!s) return null;
  if (s.includes("skad") || s.includes("injur")) return "INJURED";
  if (s.includes("avstang") || s.includes("suspend")) return "SUSPENDED";
  if (s.includes("ejuttag") || s.includes("notselected") || s.includes("uttagen")) return "NOT_SELECTED";
  if (s.includes("tillg") || s.includes("avail") || s === "ok" || s === "frisk") return "AVAILABLE";
  return null;
}

function toRating(c: Cell): number | null {
  const n = toInt(c);
  return n !== undefined && n >= 1 && n <= 5 ? n : null;
}

/** Turns a table (first non-empty row = headers) into player rows ready to send to the API. */
export function mapSquadTable(table: Cell[][]): ParsedSquad {
  const rows = table.filter((r) => r.some((c) => str(c) !== ""));
  if (rows.length < 2) return { rows: [], recognized: [], ignored: [] };

  const headers = rows[0].map((c) => str(c));
  const columnFor = new Map<Field, number>();
  const ignored: string[] = [];
  const recognized: string[] = [];
  headers.forEach((h, idx) => {
    if (!h) return;
    const n = norm(h);
    const field = (Object.keys(HEADER_ALIASES) as Field[]).find((f) => HEADER_ALIASES[f].includes(n));
    if (field && !columnFor.has(field)) {
      columnFor.set(field, idx);
      recognized.push(h);
    } else ignored.push(h);
  });

  const hasName = columnFor.has("name") || (columnFor.has("firstName") && columnFor.has("lastName"));
  if (!hasName) return { rows: [], recognized, ignored: headers.filter(Boolean) };

  const get = (r: Cell[], f: Field) => (columnFor.has(f) ? r[columnFor.get(f)!] : undefined);

  const players = rows.slice(1).map((r): ImportPlayerRow => {
    const name = columnFor.has("name")
      ? str(get(r, "name"))
      : `${str(get(r, "firstName"))} ${str(get(r, "lastName"))}`.trim();
    const row: ImportPlayerRow = { name, shirtNumber: toInt(get(r, "shirtNumber")) };
    if (columnFor.has("position")) row.position = str(get(r, "position")) || null;
    if (columnFor.has("secondary")) {
      row.secondaryPositions = str(get(r, "secondary"))
        .split(/[,/;+&]|\boch\b/i)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (columnFor.has("foot")) row.dominantFoot = toFoot(get(r, "foot"));
    if (columnFor.has("height")) row.heightCm = toHeight(get(r, "height"));
    if (columnFor.has("goalkeeper")) row.isGoalkeeper = toBool(get(r, "goalkeeper"));
    if (columnFor.has("availability")) row.availability = toAvailability(get(r, "availability"));
    if (columnFor.has("duel")) row.duelStrength = toRating(get(r, "duel"));
    if (columnFor.has("heading")) row.headingStrength = toRating(get(r, "heading"));
    if (columnFor.has("notes")) row.notes = str(get(r, "notes")) || null;
    return row;
  });

  return { rows: players, recognized, ignored };
}

export async function parseSquadFile(file: File): Promise<ParsedSquad> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx")) {
    const data = await readSheet(file);
    return mapSquadTable(data as Cell[][]);
  }
  if (lower.endsWith(".xls")) {
    throw new Error("Gamla .xls-filer stöds inte. Spara om filen som .xlsx eller .csv i Excel och försök igen.");
  }
  return mapSquadTable(parseDelimited(await file.text()));
}

export function parseSquadText(text: string): ParsedSquad {
  return mapSquadTable(parseDelimited(text));
}

const TEMPLATE_ROWS = [
  ["Namn", "Nr", "Position", "Sekundär position", "Fot", "Längd", "Målvakt", "Status", "Duellspel", "Huvudspel", "Anteckningar"],
  ["Oscar Lindberg", "1", "MV", "", "Höger", "189", "Ja", "Tillgänglig", "", "", ""],
  ["Anton Svensson", "2", "RB", "RCB", "Höger", "178", "", "Tillgänglig", "3", "2", ""],
  ["Marcus Berggren", "14", "LCB", "RCB", "Höger", "194", "", "Skadad", "5", "5", "Mycket stark i luften"],
];

export function downloadSquadTemplate() {
  const csv = TEMPLATE_ROWS.map((r) => r.join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "trupp-mall.csv";
  a.click();
  URL.revokeObjectURL(url);
}
