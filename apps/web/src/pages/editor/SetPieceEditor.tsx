import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAppStore } from "../../state/appStore";
import { useUndoRedo } from "../../state/useUndoRedo";
import {
  useCreateMovement,
  useCreateOpponent,
  useCreateRole,
  useCreateStage,
  useCreateZone,
  useDeleteMovement,
  useDeleteOpponent,
  useDeleteRole,
  useDeleteStage,
  useLineups,
  useRemoveStageBallPosition,
  useSuggestSpecialRoles,
  useUpdateMovement,
  useUpdateOpponent,
  useUpdateStage,
  useUpdateZone,
  useUpsertStageBallPosition,
  useUpsertStageRolePosition,
  useVariant,
} from "../../api/hooks";
import type { ArrowType } from "../../api/types";
import { PitchCanvas, type ArrowSource, type PitchCanvasHandle, type PitchTool, type PitchView } from "./PitchCanvas";
import { RoleInspector } from "./RoleInspector";
import { ZoneInspector } from "./ZoneInspector";
import { ToolPalette } from "./ToolPalette";
import { ARROW_ORDER, ArrowTypeChips, MovementInspector, OpponentInspector } from "./Inspectors";
import { SavingIndicator } from "../../components/common/SavingIndicator";
import { exportVariantPdf } from "../../lib/exportVariantPdf";
import { defaultViewFor, effectivePositions } from "../../lib/setPieceView";
import { genomgangUrl } from "../../lib/library";
import { useElementSize } from "../../lib/useElementSize";

type Point = { x: number; y: number };

const toolBtn =
  "rounded-md border border-surface-border px-2.5 py-1.5 text-xs text-slate-300 hover:text-accent disabled:opacity-30";

export function SetPieceEditor() {
  const { variantId } = useParams<{ variantId: string }>();
  const navigate = useNavigate();
  const teamId = useAppStore((s) => s.currentTeamId);
  const defaultLineupId = useAppStore((s) => s.currentLineupId);
  const { data: lineups } = useLineups(teamId ?? undefined);

  const [lineupId, setLineupId] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!lineupId && defaultLineupId) setLineupId(defaultLineupId);
  }, [defaultLineupId, lineupId]);

  const { data: variant, isLoading } = useVariant(variantId, lineupId);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [tool, setTool] = useState<PitchTool>("select");
  const [arrowType, setArrowType] = useState<ArrowType>("RUN");
  const [view, setView] = useState<PitchView | null>(null);
  const [exporting, setExporting] = useState(false);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [showPlayers, setShowPlayers] = useState(true);
  const canvasRef = useRef<PitchCanvasHandle>(null);
  const [canvasBoxRef, canvasBox] = useElementSize<HTMLDivElement>();

  const createRole = useCreateRole(variantId);
  const deleteRole = useDeleteRole(variantId);
  const updatePosition = useUpsertStageRolePosition(variantId);
  const updateBall = useUpsertStageBallPosition(variantId);
  const removeBall = useRemoveStageBallPosition(variantId);
  const createOpponent = useCreateOpponent(variantId);
  const updateOpponent = useUpdateOpponent(variantId);
  const deleteOpponent = useDeleteOpponent(variantId);
  const createStage = useCreateStage(variantId);
  const updateStage = useUpdateStage(variantId);
  const deleteStage = useDeleteStage(variantId);
  const createMovement = useCreateMovement(variantId);
  const updateMovement = useUpdateMovement(variantId);
  const deleteMovement = useDeleteMovement(variantId);
  const createZone = useCreateZone(variantId);
  const updateZone = useUpdateZone(variantId);
  const suggestSpecialRoles = useSuggestSpecialRoles(variantId);
  const { record, undo, redo, canUndo, canRedo } = useUndoRedo();

  const stages = variant?.stages ?? [];
  const activeStage = stages.find((s) => s.id === activeStageId) ?? stages[0] ?? null;
  const activeIndex = activeStage ? stages.indexOf(activeStage) : 0;
  const positions = activeStage ? effectivePositions(stages, activeIndex) : [];
  const effectiveView = view ?? defaultViewFor(variant?.setPiece?.name, variant?.setPiece?.type);
  const ball = positions.find((p) => p.entityType === "BALL");

  useEffect(() => {
    if (!activeStageId && stages.length > 0) setActiveStageId(stages[0].id);
  }, [activeStageId, stages]);

  function flashSaved() {
    setSaveStatus("saving");
    setTimeout(() => setSaveStatus("saved"), 150);
    setTimeout(() => setSaveStatus("idle"), 1500);
  }

  function clearSelection() {
    setSelectedRoleId(null);
    setSelectedZoneId(null);
    setSelectedMovementId(null);
    setSelectedOpponentId(null);
  }

  function select(kind: "role" | "zone" | "movement" | "opponent", id: string) {
    clearSelection();
    if (!id) return;
    if (kind === "role") setSelectedRoleId(id);
    if (kind === "zone") setSelectedZoneId(id);
    if (kind === "movement") setSelectedMovementId(id);
    if (kind === "opponent") setSelectedOpponentId(id);
  }

  function selectRelativeRole(step: number) {
    const roles = variant?.roles ?? [];
    if (roles.length === 0) return;
    const i = roles.findIndex((r) => r.id === selectedRoleId);
    const next = roles[(i + step + roles.length) % roles.length];
    select("role", next.id);
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || meta) return;

      const key = e.key.toLowerCase();
      if (key === "v") setTool("select");
      else if (key === "a") setTool("arrow");
      else if (key === "z") setTool("zone");
      else if (["1", "2", "3", "4"].includes(key)) {
        setArrowType(ARROW_ORDER[Number(key) - 1]);
        setTool("arrow");
      } else if (key === "escape") {
        setTool("select");
        clearSelection();
      } else if (key === "delete" || key === "backspace") {
        if (selectedMovementId) {
          e.preventDefault();
          handleDeleteMovement(selectedMovementId);
        } else if (selectedOpponentId) {
          e.preventDefault();
          handleDeleteOpponent(selectedOpponentId);
        }
      } else if (selectedRoleId && key.startsWith("arrow")) {
        const step = e.shiftKey ? 0.02 : 0.005;
        const deltas: Record<string, [number, number]> = {
          arrowup: [0, -step],
          arrowdown: [0, step],
          arrowleft: [-step, 0],
          arrowright: [step, 0],
        };
        const delta = deltas[key];
        if (!delta) return;
        e.preventDefault();
        const current = positions.find((p) => p.entityType === "OWN_ROLE" && p.setPieceRoleId === selectedRoleId);
        const base = current ?? { x: 0.5, y: 0.5 };
        handleMoveRole(selectedRoleId, clamp01(base.x + delta[0]), clamp01(base.y + delta[1]));
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, selectedRoleId, selectedMovementId, selectedOpponentId, activeStage, positions.length]);

  function handleMoveRole(roleId: string, x: number, y: number) {
    if (!activeStage) return;
    const stageId = activeStage.id;
    const prev = positions.find((p) => p.entityType === "OWN_ROLE" && p.setPieceRoleId === roleId) ?? { x: 0.5, y: 0.5 };
    flashSaved();
    updatePosition.mutate({ stageId, roleId, x, y });
    record({
      undo: () => updatePosition.mutate({ stageId, roleId, x: prev.x, y: prev.y }),
      redo: () => updatePosition.mutate({ stageId, roleId, x, y }),
    });
  }

  function handleMoveBall(x: number, y: number) {
    if (!activeStage) return;
    const stageId = activeStage.id;
    const prev = ball ?? { x, y };
    flashSaved();
    updateBall.mutate({ stageId, x, y });
    record({
      undo: () => updateBall.mutate({ stageId, x: prev.x, y: prev.y }),
      redo: () => updateBall.mutate({ stageId, x, y }),
    });
  }

  function placeBall(): Point | null {
    if (!activeStage) return null;
    const p = {
      x: effectiveView === "defend" ? 0.015 : 0.985,
      y: 0.02,
    };
    flashSaved();
    updateBall.mutate({ stageId: activeStage.id, ...p });
    return p;
  }

  function handleRemoveBall() {
    if (!activeStage) return;
    flashSaved();
    removeBall.mutate(activeStage.id);
  }

  function handleAddOpponent() {
    if (!activeStage) return;
    const base = ball ?? (effectiveView === "defend" ? { x: 0.06, y: 0.45 } : { x: 0.94, y: 0.45 });
    const offset = (positions.filter((p) => p.entityType === "OPPONENT").length % 6) * 0.03;
    flashSaved();
    createOpponent.mutate(
      { stageId: activeStage.id, x: clamp01(base.x + (effectiveView === "defend" ? 0.05 : -0.05)), y: clamp01(base.y + 0.06 + offset), label: "M" },
      { onSuccess: (created: any) => select("opponent", created.id) }
    );
    setTool("select");
  }

  function handleMoveOpponent(id: string, x: number, y: number) {
    const prev = positions.find((p) => p.id === id);
    flashSaved();
    updateOpponent.mutate({ id, data: { x, y } });
    if (prev) {
      record({
        undo: () => updateOpponent.mutate({ id, data: { x: prev.x, y: prev.y } }),
        redo: () => updateOpponent.mutate({ id, data: { x, y } }),
      });
    }
  }

  function handleDeleteOpponent(id: string) {
    flashSaved();
    deleteOpponent.mutate(id);
    setSelectedOpponentId(null);
  }

  function handleDrawArrow(source: ArrowSource, from: Point, to: Point) {
    if (!activeStage) return;
    const stageId = activeStage.id;
    // An arrow from the ball always shows where the ball is played.
    const type: ArrowType = source.kind === "ball" ? "PASS" : arrowType;
    flashSaved();
    createMovement.mutate(
      {
        stageId,
        data: {
          setPieceRoleId: source.kind === "role" ? source.roleId : null,
          type,
          fromX: from.x,
          fromY: from.y,
          toX: to.x,
          toY: to.y,
        },
      },
      {
        onSuccess: (created: any) => {
          select("movement", created.id);
          record({ undo: () => deleteMovement.mutate(created.id), redo: () => {} });
        },
      }
    );
  }

  function handleUpdateMovement(id: string, data: { fromX?: number; fromY?: number; toX?: number; toY?: number }) {
    const prev = activeStage?.movements.find((m) => m.id === id);
    flashSaved();
    updateMovement.mutate({ id, data });
    if (prev) {
      const before = { fromX: prev.fromX, fromY: prev.fromY, toX: prev.toX, toY: prev.toY };
      record({
        undo: () => updateMovement.mutate({ id, data: before }),
        redo: () => updateMovement.mutate({ id, data }),
      });
    }
  }

  function handleDeleteMovement(id: string) {
    flashSaved();
    deleteMovement.mutate(id);
    setSelectedMovementId(null);
  }

  function handleDrawZone(a: Point, b: Point) {
    flashSaved();
    createZone.mutate(
      { name: "Ny zon", color: "#38bdf8", points: [a, b] },
      {
        onSuccess: (created: any) => {
          select("zone", created.id);
          setTool("select");
        },
      }
    );
  }

  function handleMoveZone(zoneId: string, points: Point[]) {
    flashSaved();
    updateZone.mutate({ id: zoneId, data: { points } });
  }

  /** New step = copy of the current last step, but players/ball/opponents that have a run/pass arrow
   * stand where the arrow points, so the coach only draws the next movement. */
  async function handleAddStage() {
    if (!variantId || stages.length === 0) return;
    const last = stages[stages.length - 1];
    const lastPositions = effectivePositions(stages, stages.length - 1);
    const created: any = await createStage.mutateAsync({ name: `Steg ${stages.length + 1}` });
    const moves: Promise<unknown>[] = [];
    const ballNow = lastPositions.find((p) => p.entityType === "BALL");
    for (const m of last.movements) {
      if (m.type !== "RUN" && m.type !== "PASS") continue;
      if (m.setPieceRoleId) {
        if (m.type === "RUN") {
          moves.push(updatePosition.mutateAsync({ stageId: created.id, roleId: m.setPieceRoleId, x: m.toX, y: m.toY }));
        }
      } else if (ballNow && m.type === "PASS" && near(m.fromX, m.fromY, ballNow)) {
        moves.push(updateBall.mutateAsync({ stageId: created.id, x: m.toX, y: m.toY }));
      } else {
        const opp = lastPositions.find((p) => p.entityType === "OPPONENT" && near(m.fromX, m.fromY, p));
        const copy = opp && (created.positions as any[]).find(
          (p) => p.entityType === "OPPONENT" && near(opp.x, opp.y, p)
        );
        if (copy) moves.push(updateOpponent.mutateAsync({ id: copy.id, data: { x: m.toX, y: m.toY } }));
      }
    }
    await Promise.all(moves);
    setActiveStageId(created.id);
    clearSelection();
    flashSaved();
  }

  function handleDeleteStage(id: string) {
    if (stages.length <= 1) return;
    deleteStage.mutate(id, {
      onSuccess: () => {
        if (activeStageId === id) setActiveStageId(null);
      },
    });
  }

  function handleAddRole(tacticalRoleId: string) {
    flashSaved();
    createRole.mutate(
      { tacticalRoleId, x: 0.5, y: 0.5 },
      {
        onSuccess: (created: any) => {
          select("role", created.id);
          record({
            undo: () => deleteRole.mutate(created.id),
            redo: () => createRole.mutate({ tacticalRoleId, x: 0.5, y: 0.5 }),
          });
        },
      }
    );
  }

  function handleSuggestSpecialRoles() {
    const hasSpecialRoles = variant?.roles.some((r) => r.tacticalRole.type === "SPECIAL");
    if (!hasSpecialRoles) {
      alert("Den här situationen har inga egna roller att föreslå spelare för.");
      return;
    }
    const alreadyAssigned = variant?.roles.some((r) => r.tacticalRole.type === "SPECIAL" && r.assignedPositionId);
    if (
      alreadyAssigned &&
      !confirm("Detta ersätter vilken position som fyller varje egen roll i den här situationen. Fortsätta?")
    ) {
      return;
    }
    flashSaved();
    suggestSpecialRoles.mutate(lineupId, {
      onSuccess: (r) => {
        if (r.updated === 0 && r.message) alert(r.message);
      },
    });
  }

  function handleExportPdf() {
    if (!variant) return;
    setExporting(true);
    const previousView = view;
    setView("full");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const dataUrl = canvasRef.current?.toDataURL() ?? null;
        exportVariantPdf(variant, dataUrl);
        setView(previousView);
        setExporting(false);
      });
    });
  }

  function handlePlay() {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
    navigate(genomgangUrl([variant!.id], lineupId));
  }

  if (isLoading || !variant) {
    return <div className="p-8 text-slate-500">Laddar taktiktavla...</div>;
  }

  const selectedRole = variant.roles.find((r) => r.id === selectedRoleId);
  const selectedZone = variant.zones.find((z) => z.id === selectedZoneId);
  const selectedMovement = activeStage?.movements.find((m) => m.id === selectedMovementId);
  const selectedOpponent = positions.find((p) => p.id === selectedOpponentId && p.entityType === "OPPONENT");

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-border px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/fasta-situationer" className="text-xs text-slate-500 hover:text-accent">
            ← Fasta situationer
          </Link>
          <h1 className="truncate text-base font-semibold text-white">
            {variant.setPiece?.name} — {variant.name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SavingIndicator status={saveStatus} />
          <select
            className="input !w-auto max-w-[200px] !py-1"
            value={lineupId ?? ""}
            onChange={(e) => setLineupId(e.target.value)}
            title="Laguppställning som avgör vilka spelare som syns"
          >
            {lineups?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} {l.isDefault ? "(standard)" : ""}
              </option>
            ))}
          </select>
          <button disabled={exporting} onClick={handleExportPdf} className={toolBtn}>
            {exporting ? "Exporterar..." : "📄 PDF"}
          </button>
          <button
            onClick={handlePlay}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-bold text-slate-950 hover:brightness-110"
          >
            ▶ Spela på TV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-surface-border px-4 py-2">
        <div className="flex gap-1 rounded-md border border-surface-border p-0.5">
          {(
            [
              ["select", "↖ Flytta", "V"],
              ["arrow", "➜ Pil", "A"],
              ["zone", "▢ Zon", "Z"],
            ] as [PitchTool, string, string][]
          ).map(([t, label, key]) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={`rounded px-3 py-1 text-xs ${tool === t ? "bg-accent font-semibold text-slate-950" : "text-slate-300 hover:text-white"}`}
              title={`${label.slice(2)} (${key})`}
            >
              {label}
            </button>
          ))}
        </div>

        {tool === "arrow" && (
          <>
            <ArrowTypeChips value={arrowType} onChange={setArrowType} showKeys />
            <span className="text-xs text-slate-500">Dra från en spelare, motståndare eller bollen</span>
          </>
        )}
        {tool === "zone" && <span className="text-xs text-slate-500">Dra en ruta på planen för att göra en zon</span>}

        <div className="ml-2 flex items-center gap-1">
          {ball ? (
            <>
              <button
                onClick={() => {
                  setArrowType("PASS");
                  setTool("arrow");
                }}
                className={toolBtn}
                title="Dra från bollen till dit den ska slås"
              >
                ⚽ Bollbana
              </button>
              <button onClick={handleRemoveBall} className={`${toolBtn} hover:!text-red-400`} title="Ta bort bollen">
                ✕
              </button>
            </>
          ) : (
            <button onClick={() => placeBall()} className={toolBtn}>
              ⚽ Placera boll
            </button>
          )}
          <button onClick={handleAddOpponent} className={toolBtn}>
            ＋ Motståndare
          </button>
          <button
            onClick={handleSuggestSpecialRoles}
            disabled={suggestSpecialRoles.isPending}
            className={toolBtn}
            title="Föreslår vilken spelare i startelvan som passar bäst för varje egen roll, baserat på huvudspel/duellspel/längd"
          >
            🪄 Föreslå spelare
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex gap-1 rounded-md border border-surface-border p-0.5">
            {(
              [
                ["full", "Helplan"],
                ["attack", "Anfall"],
                ["defend", "Försvar"],
              ] as [PitchView, string][]
            ).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded px-2.5 py-1 text-xs ${effectiveView === v ? "bg-accent text-slate-950" : "text-slate-300"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowPlayers((s) => !s)} className={toolBtn} title="Dölj/visa spelarlistan för en större plan">
            {showPlayers ? "◀ Dölj lista" : "▶ Spelarlista"}
          </button>
          <button disabled={!canUndo} onClick={undo} className={toolBtn} title="Ångra (Cmd/Ctrl+Z)">
            ↶
          </button>
          <button disabled={!canRedo} onClick={redo} className={toolBtn} title="Gör om (Cmd/Ctrl+Shift+Z)">
            ↷
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-surface-border px-4 py-1.5">
        <span className="text-xs uppercase tracking-wide text-slate-500">Steg</span>
        {stages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => {
              setActiveStageId(stage.id);
              clearSelection();
            }}
            className={`group flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs ${
              activeStage?.id === stage.id
                ? "border-accent bg-accent/10 text-accent"
                : "border-surface-border text-slate-300 hover:text-white"
            }`}
          >
            {stage.name}
            {stages.length > 1 && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Ta bort "${stage.name}"?`)) handleDeleteStage(stage.id);
                }}
                className="ml-1 text-slate-500 opacity-0 hover:text-red-400 group-hover:opacity-100"
                title="Ta bort steg"
              >
                ✕
              </span>
            )}
          </button>
        ))}
        <button
          onClick={handleAddStage}
          disabled={createStage.isPending}
          className="rounded-md border border-dashed border-surface-border px-2.5 py-1 text-xs text-slate-400 hover:text-accent"
          title="Nytt steg börjar där pilarna i förra steget pekar"
        >
          + Nytt steg
        </button>
        {activeStage && (
          <StageFields
            key={activeStage.id}
            stage={activeStage}
            onSave={(data) => {
              flashSaved();
              updateStage.mutate({ id: activeStage.id, data });
            }}
          />
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {showPlayers && (
          <ToolPalette
            existingRoles={variant.roles}
            selectedRoleId={selectedRoleId}
            onSelectRole={(id) => select("role", id)}
            onAddRole={handleAddRole}
          />
        )}

        <div ref={canvasBoxRef} className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-2">
          {canvasBox.width > 0 && (
            <PitchCanvas
              ref={canvasRef}
              roles={variant.roles}
              positions={positions}
              movements={activeStage?.movements ?? []}
              zones={variant.zones}
              view={effectiveView}
              maxWidth={canvasBox.width - 16}
              maxHeight={canvasBox.height - 16}
              tool={tool}
              labelMode="selected"
              arrowType={arrowType}
              selectedRoleId={selectedRoleId}
              selectedZoneId={selectedZoneId}
              selectedMovementId={selectedMovementId}
              selectedOpponentId={selectedOpponentId}
              onSelectRole={(id) => select("role", id)}
              onSelectZone={(id) => select("zone", id)}
              onSelectMovement={(id) => select("movement", id)}
              onSelectOpponent={(id) => select("opponent", id)}
              onMoveRole={handleMoveRole}
              onMoveBall={handleMoveBall}
              onMoveOpponent={handleMoveOpponent}
              onMoveZone={handleMoveZone}
              onDrawArrow={handleDrawArrow}
              onDrawZone={handleDrawZone}
              onUpdateMovement={handleUpdateMovement}
            />
          )}
        </div>

        {selectedZone ? (
          <ZoneInspector zone={selectedZone} variantId={variant.id} onDeleted={() => setSelectedZoneId(null)} />
        ) : selectedMovement ? (
          <MovementInspector
            movement={selectedMovement}
            roles={variant.roles}
            onChangeType={(type) => {
              flashSaved();
              updateMovement.mutate({ id: selectedMovement.id, data: { type } });
            }}
            onDelete={() => handleDeleteMovement(selectedMovement.id)}
          />
        ) : selectedOpponent ? (
          <OpponentInspector
            opponent={selectedOpponent}
            onChangeLabel={(label) => {
              flashSaved();
              updateOpponent.mutate({ id: selectedOpponent.id, data: { label } });
            }}
            onDelete={() => handleDeleteOpponent(selectedOpponent.id)}
          />
        ) : (
          <RoleInspector
            role={selectedRole}
            variantId={variant.id}
            onDeleted={() => setSelectedRoleId(null)}
            onPrev={() => selectRelativeRole(-1)}
            onNext={() => selectRelativeRole(1)}
            onSaved={flashSaved}
          />
        )}
      </div>
    </div>
  );
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function near(x: number, y: number, p: Point) {
  return Math.hypot(x - p.x, y - p.y) < 0.03;
}

/** Name, trigger and OBS note of the active step, inline so the pitch keeps the space. */
function StageFields({
  stage,
  onSave,
}: {
  stage: { name: string; triggerDescription: string | null; note: string | null };
  onSave: (data: { name?: string; triggerDescription?: string | null; note?: string | null }) => void;
}) {
  const [name, setName] = useState(stage.name);
  const [trigger, setTrigger] = useState(stage.triggerDescription ?? "");
  const [note, setNote] = useState(stage.note ?? "");
  return (
    <div className="ml-2 flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <input
        className="input !w-32 !py-1 text-xs"
        title="Namn på steget"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== stage.name && onSave({ name: name.trim() })}
      />
      <input
        className="input !w-56 !py-1 text-xs"
        placeholder="Startar när… (visas på TV)"
        value={trigger}
        onChange={(e) => setTrigger(e.target.value)}
        onBlur={() => trigger !== (stage.triggerDescription ?? "") && onSave({ triggerDescription: trigger.trim() || null })}
      />
      <input
        className="input !min-w-[14rem] !flex-1 !py-1 text-xs"
        placeholder="OBS-text (visas markerad på TV)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (stage.note ?? "") && onSave({ note: note.trim() || null })}
      />
    </div>
  );
}
