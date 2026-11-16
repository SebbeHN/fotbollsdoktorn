import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "../../state/appStore";
import { useImportPlayers, type ImportResult } from "../../api/hooks";
import {
  downloadSquadTemplate,
  parseSquadFile,
  parseSquadText,
  type ParsedSquad,
} from "../../lib/importSquad";

const ACTION_LABEL = { create: "Ny", update: "Uppdateras", error: "Hoppas över" } as const;
const ACTION_STYLE = {
  create: "bg-emerald-500/15 text-emerald-400",
  update: "bg-sky-500/15 text-sky-300",
  error: "bg-red-500/15 text-red-400",
} as const;

/** Upload a CSV/Excel file (or paste from a spreadsheet), check the preview, then import the squad. */
export function ImportSquadDialog({ onClose }: { onClose: () => void }) {
  const teamId = useAppStore((s) => s.currentTeamId);
  const importPlayers = useImportPlayers(teamId ?? undefined);

  const [parsed, setParsed] = useState<ParsedSquad | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [removeMissing, setRemoveMissing] = useState(false);
  const [done, setDone] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const accept = useCallback((result: ParsedSquad) => {
    setError(null);
    if (result.rows.length === 0) {
      setParsed(null);
      setPreview(null);
      setError(
        result.recognized.length === 0 && result.ignored.length > 0
          ? "Hittade ingen kolumn för spelarens namn. Första raden ska vara rubriker, t.ex. Namn, Nr, Position. Ladda ner mallen för ett exempel."
          : "Hittade inga spelare i filen. Första raden ska vara rubriker och sedan en spelare per rad."
      );
      return;
    }
    setParsed(result);
  }, []);

  async function handleFile(file: File) {
    setFileName(file.name);
    setPreview(null);
    setDone(null);
    try {
      accept(await parseSquadFile(file));
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : "Kunde inte läsa filen.");
    }
  }

  // Re-check against the squad whenever the data or the "remove missing" option changes.
  useEffect(() => {
    if (!parsed) return;
    let cancelled = false;
    importPlayers.mutate(
      { players: parsed.rows, dryRun: true, removeMissing },
      {
        onSuccess: (r) => !cancelled && setPreview(r),
        onError: () => !cancelled && setError("Kunde inte kontrollera filen mot servern."),
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed, removeMissing]);

  const importable = (preview?.summary.created ?? 0) + (preview?.summary.updated ?? 0);

  function runImport() {
    if (!parsed || !preview) return;
    if (removeMissing && preview.summary.removed > 0) {
      const names = preview.summary.removedNames.slice(0, 8).join(", ");
      if (!confirm(`${preview.summary.removed} spelare som inte finns i filen tas bort (${names}${preview.summary.removed > 8 ? "…" : ""}). Fortsätta?`)) {
        return;
      }
    }
    importPlayers.mutate(
      { players: parsed.rows, dryRun: false, removeMissing },
      { onSuccess: setDone, onError: () => setError("Importen misslyckades. Inget har ändrats.") }
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div
        className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-surface-border bg-surface-raised shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Importera trupp</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Stäng">
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          {done ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-emerald-500/10 p-4 text-emerald-300">
                <div className="text-lg font-semibold">Klart!</div>
                <div>
                  {done.summary.created} nya spelare, {done.summary.updated} uppdaterade
                  {done.summary.removed > 0 && `, ${done.summary.removed} borttagna`}.
                </div>
              </div>
              {done.notRemoved && done.notRemoved.length > 0 && (
                <p className="text-sm text-amber-300">
                  Kunde inte tas bort (används i matchtrupper): {done.notRemoved.join(", ")}.
                </p>
              )}
              <p className="text-sm text-slate-400">
                Tips: gå till Laguppställningar och placera ut spelarna. Positionerna i filen används som förslag.
              </p>
            </div>
          ) : (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) void handleFile(file);
                }}
                onClick={() => fileInput.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
                  dragging ? "border-accent bg-accent/10" : "border-surface-border hover:border-slate-500"
                }`}
              >
                <div className="text-base font-medium text-white">
                  {fileName ? fileName : "Dra hit en fil eller klicka för att välja"}
                </div>
                <div className="mt-1 text-sm text-slate-400">CSV, TSV, textfil eller Excel (.xlsx)</div>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".csv,.tsv,.txt,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                    e.target.value = "";
                  }}
                />
              </div>

              <details className="rounded-lg border border-surface-border px-4 py-3">
                <summary className="cursor-pointer text-sm text-slate-300">Eller klistra in från Excel / Google Kalkylark</summary>
                <textarea
                  className="input mt-3 h-32 font-mono text-xs"
                  placeholder={"Namn\tNr\tPosition\nOscar Lindberg\t1\tMV"}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
                <button
                  disabled={!pasteText.trim()}
                  onClick={() => {
                    setFileName("Inklistrad text");
                    setPreview(null);
                    accept(parseSquadText(pasteText));
                  }}
                  className="mt-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-slate-950 disabled:opacity-40"
                >
                  Läs in
                </button>
              </details>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                <span>
                  Rubriker som känns igen: Namn, Nr, Position, Sekundär position, Fot, Längd, Målvakt, Status,
                  Duellspel, Huvudspel, Anteckningar.
                </span>
                <button onClick={downloadSquadTemplate} className="text-accent hover:underline">
                  Ladda ner mall (CSV)
                </button>
              </div>

              {error && <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

              {parsed && (
                <div className="space-y-3">
                  {parsed.ignored.length > 0 && (
                    <p className="text-xs text-slate-500">Ignorerade kolumner: {parsed.ignored.join(", ")}</p>
                  )}
                  {!preview ? (
                    <p className="text-sm text-slate-400">Kontrollerar {parsed.rows.length} rader…</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-400">
                          {preview.summary.created} nya
                        </span>
                        <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-sky-300">
                          {preview.summary.updated} uppdateras
                        </span>
                        {preview.summary.errors > 0 && (
                          <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-red-400">
                            {preview.summary.errors} hoppas över
                          </span>
                        )}
                      </div>
                      <div className="max-h-72 overflow-auto rounded-lg border border-surface-border">
                        <table className="w-full text-left text-sm">
                          <thead className="sticky top-0 bg-surface-raised text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-3 py-2">#</th>
                              <th className="px-3 py-2">Namn</th>
                              <th className="px-3 py-2">Position</th>
                              <th className="px-3 py-2">Åtgärd</th>
                              <th className="px-3 py-2">Kommentar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border">
                            {preview.rows.map((r) => (
                              <tr key={r.index}>
                                <td className="px-3 py-1.5 font-mono text-slate-300">{r.shirtNumber ?? "–"}</td>
                                <td className="px-3 py-1.5 text-white">{r.name || "–"}</td>
                                <td className="px-3 py-1.5 text-slate-300">{parsed.rows[r.index]?.position || "–"}</td>
                                <td className="px-3 py-1.5">
                                  <span className={`rounded-full px-2 py-0.5 text-xs ${ACTION_STYLE[r.action]}`}>
                                    {ACTION_LABEL[r.action]}
                                  </span>
                                </td>
                                <td className="px-3 py-1.5 text-xs text-amber-300">{r.messages.join(". ")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input type="checkbox" checked={removeMissing} onChange={(e) => setRemoveMissing(e.target.checked)} />
                        Ta bort spelare i truppen som inte finns i filen
                        {removeMissing && ` (${preview.summary.removed} st)`}
                      </label>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-surface-border px-6 py-4">
          {done ? (
            <button onClick={onClose} className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-slate-950">
              Stäng
            </button>
          ) : (
            <>
              <button onClick={onClose} className="rounded-md border border-surface-border px-4 py-2 text-sm text-slate-300">
                Avbryt
              </button>
              <button
                onClick={runImport}
                disabled={!preview || importable === 0 || importPlayers.isPending}
                className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"
              >
                {importPlayers.isPending ? "Importerar…" : `Importera ${importable || ""} spelare`.replace("  ", " ")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
