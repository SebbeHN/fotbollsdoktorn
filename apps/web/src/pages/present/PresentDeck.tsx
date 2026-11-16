import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useVariants } from "../../api/hooks";
import type { SetPieceRole, SetPieceVariant } from "../../api/types";
import { PitchCanvas, ARROW_LABELS } from "../editor/PitchCanvas";
import { defaultViewFor, effectivePositions } from "../../lib/setPieceView";
import { useElementSize } from "../../lib/useElementSize";

interface Frame {
  variantIndex: number;
  stageIndex: number;
}

/** Full-screen, TV-friendly walkthrough of one or more set pieces, step by step. */
export function PresentDeck() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ids = useMemo(() => (params.get("v") ?? "").split(",").filter(Boolean), [params]);
  const lineupId = params.get("lineup") ?? undefined;

  const results = useVariants(ids, lineupId);
  const loading = results.some((r) => r.isLoading);
  const failed = results.some((r) => r.isError);

  const frames: Frame[] = [];
  results.forEach((r, variantIndex) => {
    (r.data as SetPieceVariant | undefined)?.stages.forEach((_, stageIndex) =>
      frames.push({ variantIndex, stageIndex })
    );
  });

  const [frameIndex, setFrameIndex] = useState(0);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [pitchRef, pitchSize] = useElementSize<HTMLDivElement>();

  const frame = frames[Math.min(frameIndex, Math.max(0, frames.length - 1))];
  const variant = frame ? results[frame.variantIndex]?.data : undefined;
  const stage = variant && frame ? variant.stages[frame.stageIndex] : undefined;
  const roles = variant?.roles ?? [];
  const focusedRole = focusIndex !== null ? roles[focusIndex] : undefined;
  const lastFrame = frames.length - 1;

  const goTo = useCallback(
    (index: number) => {
      setFrameIndex(Math.min(Math.max(0, index), Math.max(0, lastFrame)));
      setFocusIndex(null);
    },
    [lastFrame]
  );

  const exit = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    if (window.history.length > 1) navigate(-1);
    else navigate("/genomgang");
  }, [navigate]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  }, []);

  // The whole UI is sized in rem, so scaling the root font makes it fit any TV resolution.
  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.fontSize;
    html.style.fontSize = "clamp(15px, calc(0.55vw + 0.85vh), 30px)";
    return () => {
      html.style.fontSize = previous;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
        case "Enter":
          e.preventDefault();
          goTo(frameIndex + 1);
          break;
        case "ArrowLeft":
        case "PageUp":
        case "Backspace":
          e.preventDefault();
          goTo(frameIndex - 1);
          break;
        case "Home":
          goTo(0);
          break;
        case "End":
          goTo(lastFrame);
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusIndex((i) => (i === null ? (roles.length ? 0 : null) : i + 1 >= roles.length ? null : i + 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusIndex((i) => (i === null ? (roles.length ? roles.length - 1 : null) : i - 1 < 0 ? null : i - 1));
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "Escape":
          if (focusIndex !== null) setFocusIndex(null);
          else exit();
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [frameIndex, lastFrame, roles.length, focusIndex, goTo, exit, toggleFullscreen]);

  useEffect(() => {
    let timer: number | undefined;
    const show = () => {
      setControlsVisible(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setControlsVisible(false), 3500);
    };
    show();
    window.addEventListener("mousemove", show);
    window.addEventListener("keydown", show);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", show);
      window.removeEventListener("keydown", show);
    };
  }, []);

  if (ids.length === 0) {
    return (
      <DeckMessage>
        Ingen situation vald.
        <button
          onClick={() => navigate("/genomgang")}
          className="mt-6 rounded-lg bg-amber-400 px-5 py-2 text-base font-semibold text-slate-950"
        >
          Välj situationer
        </button>
      </DeckMessage>
    );
  }
  if (failed) return <DeckMessage>Kunde inte hämta situationerna.</DeckMessage>;
  if (loading) return <DeckMessage>Laddar genomgång…</DeckMessage>;
  if (!variant || !stage || !frame) return <DeckMessage>Situationen saknar steg att visa.</DeckMessage>;

  const view = defaultViewFor(variant.setPiece?.name, variant.setPiece?.type);
  const positions = effectivePositions(variant.stages, frame.stageIndex);
  const isDefensive = variant.setPiece?.type === "DEFENSIVE";

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden text-white"
      style={{
        background: "radial-gradient(ellipse at top, #0f2a1b 0%, #06120b 70%)",
        cursor: controlsVisible ? "default" : "none",
      }}
    >
      <header className="flex items-end justify-between gap-8 px-10 pt-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.25em]">
            <span className={isDefensive ? "text-sky-300" : "text-amber-300"}>
              {isDefensive ? "Defensivt" : "Offensivt"}
            </span>
            {ids.length > 1 && (
              <span className="text-slate-400">
                Situation {frame.variantIndex + 1} av {ids.length}
              </span>
            )}
            {variant.signal && (
              <span className="rounded-full bg-amber-400 px-3 py-0.5 text-xs font-bold tracking-wider text-slate-950">
                Signal: {variant.signal}
              </span>
            )}
          </div>
          <h1 className="mt-1 truncate text-5xl font-black uppercase tracking-tight">
            {variant.setPiece?.name} <span className="text-slate-500">–</span> {variant.name}
          </h1>
          {variant.tacticalPurpose && <p className="mt-1 text-lg text-slate-300">{variant.tacticalPurpose}</p>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
            Steg {frame.stageIndex + 1} av {variant.stages.length}
          </div>
          <div className="text-3xl font-bold text-emerald-300">{stage.name}</div>
          {stage.triggerDescription && (
            <div className="mt-0.5 text-base text-slate-300">Startar när: {stage.triggerDescription}</div>
          )}
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_28rem] gap-8 px-10 py-5">
        <div ref={pitchRef} className="flex min-h-0 min-w-0 items-center justify-center">
          {pitchSize.width > 0 && (
            <PitchCanvas
              roles={roles}
              positions={positions}
              movements={stage.movements}
              zones={variant.zones}
              view={view}
              readOnly
              animateKey={stage.id}
              focusRoleId={focusedRole?.id ?? null}
              maxWidth={pitchSize.width}
              maxHeight={pitchSize.height}
            />
          )}
        </div>

        <aside className="flex min-h-0 flex-col gap-4">
          {focusedRole ? (
            <FocusCard role={focusedRole} onClose={() => setFocusIndex(null)} />
          ) : (
            <RoleList roles={roles} onFocus={setFocusIndex} />
          )}
          {stage.note && (
            <div className="rounded-xl border-2 border-amber-400/80 bg-amber-400/10 px-5 py-3">
              <div className="text-sm font-black uppercase tracking-widest text-amber-300">OBS</div>
              <div className="mt-0.5 text-xl font-semibold leading-snug">{stage.note}</div>
            </div>
          )}
          <Legend types={[...new Set(stage.movements.map((m) => m.type))]} />
        </aside>
      </main>

      <footer
        className="flex items-center justify-between gap-6 px-10 pb-5 transition-opacity duration-500"
        style={{ opacity: controlsVisible ? 1 : 0.35 }}
      >
        <button
          onClick={() => goTo(frameIndex - 1)}
          disabled={frameIndex === 0}
          className="rounded-lg border border-white/20 px-5 py-2 text-base font-semibold disabled:opacity-25"
        >
          ← Föregående
        </button>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          {frames.map((f, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Gå till bild ${i + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                i === frameIndex
                  ? "w-8 bg-amber-400"
                  : f.variantIndex === frame.variantIndex
                    ? "w-2.5 bg-white/60"
                    : "w-2.5 bg-white/20"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-400 2xl:block">
            ← → byt steg · ↑ ↓ en spelare i taget · F helskärm · Esc avsluta
          </span>
          <button onClick={toggleFullscreen} className="rounded-lg border border-white/20 px-4 py-2 text-base">
            Helskärm
          </button>
          <button onClick={exit} className="rounded-lg border border-white/20 px-4 py-2 text-base">
            Avsluta
          </button>
          <button
            onClick={() => goTo(frameIndex + 1)}
            disabled={frameIndex >= lastFrame}
            className="rounded-lg bg-amber-400 px-6 py-2 text-base font-bold text-slate-950 disabled:opacity-25"
          >
            Nästa →
          </button>
        </div>
      </footer>
    </div>
  );
}

function DeckMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#06120b] text-2xl text-slate-200">
      {children}
    </div>
  );
}

function roleName(role: SetPieceRole) {
  return role.label ?? role.tacticalRole.name;
}

function RoleList({ roles, onFocus }: { roles: SetPieceRole[]; onFocus: (index: number) => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl bg-black/35 p-4">
      <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-slate-400">Uppgifter</h2>
      <div className="scrollbar-thin mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {roles.map((role, i) => (
          <button
            key={role.id}
            onClick={() => onFocus(i)}
            className="flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/10"
          >
            <PlayerBadge role={role} />
            <span className="min-w-0">
              <span className="block text-lg font-bold leading-tight">
                {role.resolvedPlayer?.name ?? roleName(role)}
                {role.resolvedPlayer && <span className="font-medium text-slate-400"> · {roleName(role)}</span>}
              </span>
              {role.instruction?.primary && (
                <span className="mt-0.5 block text-base leading-snug text-slate-200">{role.instruction.primary}</span>
              )}
            </span>
          </button>
        ))}
        {roles.length === 0 && <p className="text-lg text-slate-400">Inga spelare är utplacerade ännu.</p>}
      </div>
    </div>
  );
}

function PlayerBadge({ role, large = false }: { role: SetPieceRole; large?: boolean }) {
  const color = role.colorOverride ?? role.tacticalRole.color ?? "#38bdf8";
  return (
    <span
      className={`mt-0.5 flex shrink-0 items-center justify-center rounded-full border-2 border-white font-bold ${
        large ? "h-16 w-16 text-3xl" : "h-9 w-9 text-base"
      }`}
      style={{ backgroundColor: color }}
    >
      {role.resolvedPlayer?.shirtNumber ?? "?"}
    </span>
  );
}

function FocusCard({ role, onClose }: { role: SetPieceRole; onClose: () => void }) {
  const ins = role.instruction;
  const sections: { label: string; text: string | null | undefined; tone: string }[] = [
    { label: "Din uppgift", text: ins?.primary, tone: "text-amber-300" },
    { label: "Sedan", text: ins?.secondary, tone: "text-emerald-300" },
    { label: "Om vi tappar bollen", text: ins?.onLossOfBall, tone: "text-sky-300" },
    { label: "Timing", text: ins?.timing, tone: "text-slate-300" },
  ];
  const filled = sections.filter((s) => s.text);
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl bg-black/45 p-5 ring-2 ring-amber-400/70">
      <div className="flex items-center gap-4">
        <PlayerBadge role={role} large />
        <div className="min-w-0">
          <div className="truncate text-3xl font-black leading-tight">
            {role.resolvedPlayer?.name ?? "Ingen spelare vald"}
          </div>
          <div className="text-lg text-slate-300">{roleName(role)}</div>
        </div>
      </div>
      <div className="scrollbar-thin mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto">
        {filled.map((s) => (
          <div key={s.label}>
            <div className={`text-sm font-bold uppercase tracking-widest ${s.tone}`}>{s.label}</div>
            <div className="mt-0.5 text-2xl font-semibold leading-snug">{s.text}</div>
          </div>
        ))}
        {filled.length === 0 && <p className="text-xl text-slate-400">Ingen instruktion skriven för den här rollen.</p>}
      </div>
      <button onClick={onClose} className="mt-3 self-start text-sm text-slate-400 hover:text-white">
        ← Visa alla (Esc)
      </button>
    </div>
  );
}

function Legend({ types }: { types: (keyof typeof ARROW_LABELS)[] }) {
  if (types.length === 0) return null;
  const swatch: Record<string, string> = {
    RUN: "border-yellow-300",
    ALT_RUN: "border-yellow-300 border-dashed",
    PASS: "border-white",
    BLOCK: "border-orange-400 border-dotted",
  };
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-base text-slate-300">
      {types.map((t) => (
        <span key={t} className="flex items-center gap-2">
          <span className={`inline-block w-8 border-t-[3px] ${swatch[t]}`} />
          {ARROW_LABELS[t]}
        </span>
      ))}
    </div>
  );
}
