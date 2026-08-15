import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAppStore } from "../../state/appStore";
import { useUndoRedo } from "../../state/useUndoRedo";
import {
  useCreateMovement,
  useCreateRole,
  useCreateStage,
  useCreateZone,
  useDeleteMovement,
  useDeleteRole,
  useDeleteStage,
  useLineups,
  useRemoveStageBallPosition,
  useUpdateStage,
  useUpdateZone,
  useUpsertStageBallPosition,
  useUpsertStageRolePosition,
  useSuggestSpecialRoles,
  useVariant,
} from "../../api/hooks";
import { PitchCanvas, type PitchCanvasHandle, type PitchView } from "./PitchCanvas";
import { RoleInspector } from "./RoleInspector";
import { ZoneInspector } from "./ZoneInspector";
import { ToolPalette } from "./ToolPalette";
import { SavingIndicator } from "../../components/common/SavingIndicator";
import { exportVariantPdf } from "../../lib/exportVariantPdf";

/** Corner kicks and free kicks near the box default to the zoomed penalty-area view. */
function defaultViewFor(name: string | undefined): PitchView {
  if (!name) return "full";
  return /hörn|corner|frispark|free.?kick/i.test(name) ? "box" : "full";
}

export function SetPieceEditor() {
  const { variantId } = useParams<{ variantId: string }>();
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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const createRole = useCreateRole(variantId);
  const deleteRole = useDeleteRole(variantId);
  const updatePosition = useUpsertStageRolePosition(variantId);
  const updateBall = useUpsertStageBallPosition(variantId);
  const removeBall = useRemoveStageBallPosition(variantId);
  const createStage = useCreateStage(variantId);
  const updateStage = useUpdateStage(variantId);
  const deleteStage = useDeleteStage(variantId);
  const createMovement = useCreateMovement(variantId);
  const deleteMovement = useDeleteMovement(variantId);
  const createZone = useCreateZone(variantId);
  const updateZone = useUpdateZone(variantId);
  const suggestSpecialRoles = useSuggestSpecialRoles(variantId);
  const { record, undo, redo, canUndo, canRedo } = useUndoRedo();

  const [view, setView] = useState<PitchView | null>(null);
  const effectiveView = view ?? defaultViewFor(variant?.setPiece?.name);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<PitchCanvasHandle>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [drawMode, setDrawMode] = useState(false);

  const stages = variant?.stages ?? [];
  const activeStage = stages.find((s) => s.id === activeStageId) ?? stages[0] ?? null;

  useEffect(() => {
    if (!activeStageId && stages.length > 0) setActiveStageId(stages[0].id);
  }, [activeStageId, stages]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if (!selectedRoleId) return;
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const step = e.shiftKey ? 0.02 : 0.005;
      const deltas: Record<string, [number, number]> = {
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
      };
      const delta = deltas[e.key];
      if (!delta) return;
      e.preventDefault();
      const rolePos = activeStage?.positions.find(
        (p) => p.entityType === "OWN_ROLE" && p.setPieceRoleId === selectedRoleId
      );
      const current = rolePos ?? { x: 0.5, y: 0.5 };
      const x = Math.min(1, Math.max(0, current.x + delta[0]));
      const y = Math.min(1, Math.max(0, current.y + delta[1]));
      handleMoveRole(selectedRoleId, x, y);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, selectedRoleId, activeStage]);

  function flashSaved() {
    setSaveStatus("saving");
    setTimeout(() => setSaveStatus("saved"), 150);
    setTimeout(() => setSaveStatus("idle"), 1500);
  }

  function handleMoveRole(roleId: string, x: number, y: number) {
    if (!activeStage) return;
    const stageId = activeStage.id;
    const prevPos = activeStage.positions.find(
      (p) => p.entityType === "OWN_ROLE" && p.setPieceRoleId === roleId
    );
    const prev = prevPos ?? { x: 0.5, y: 0.5 };
    flashSaved();
    updatePosition.mutate({ stageId, roleId, x, y });
    record({
      undo: () => updatePosition.mutate({ stageId, roleId, x: prev.x, y: prev.y }),
      redo: () => updatePosition.mutate({ stageId, roleId, x, y }),
    });
  }

  function handleAddZone() {
    if (!variantId) return;
    // Default rectangle placed inside whichever crop is currently visible,
    // so a new zone always appears on-screen instead of off in the cropped-out half of the pitch.
    const points =
      effectiveView === "box"
        ? [
            { x: 0.74, y: 0.06 },
            { x: 0.94, y: 0.18 },
          ]
        : [
            { x: 0.35, y: 0.05 },
            { x: 0.65, y: 0.15 },
          ];
    createZone.mutate(
      { name: "Ny zon", color: "#38bdf8", points },
      { onSuccess: (created: any) => setSelectedZoneId(created.id) }
    );
  }

  function handleMoveZone(zoneId: string, points: { x: number; y: number }[]) {
    flashSaved();
    updateZone.mutate({ id: zoneId, data: { points } });
  }

  function handleSuggestSpecialRoles() {
    const hasSpecialRoles = variant?.roles.some((r) => r.tacticalRole.type === "SPECIAL");
    if (!hasSpecialRoles) {
      alert("Den här varianten har inga specialroller att föreslå placering för.");
      return;
    }
    const alreadyAssigned = variant?.roles.some(
      (r) => r.tacticalRole.type === "SPECIAL" && r.assignedPositionId
    );
    if (
      alreadyAssigned &&
      !confirm(
        "Detta ersätter befintlig positionstilldelning för alla specialroller i denna variant. Fortsätta?"
      )
    ) {
      return;
    }
    flashSaved();
    suggestSpecialRoles.mutate(lineupId);
  }

  function handleDrawArrow(roleId: string, from: { x: number; y: number }, to: { x: number; y: number }) {
    if (!activeStage) return;
    const stageId = activeStage.id;
    flashSaved();
    createMovement.mutate(
      { stageId, data: { setPieceRoleId: roleId, type: "RUN", fromX: from.x, fromY: from.y, toX: to.x, toY: to.y } },
      {
        onSuccess: (created: any) => {
          record({
            undo: () => deleteMovement.mutate(created.id),
            redo: () => {},
          });
        },
      }
    );
  }

  function handleAddStage() {
    if (!variantId) return;
    const nextName = `Steg ${stages.length + 1}`;
    createStage.mutate(
      { name: nextName },
      {
        onSuccess: (created: any) => setActiveStageId(created.id),
      }
    );
  }

  function handleRenameStage(id: string, name: string) {
    updateStage.mutate({ id, data: { name } });
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
          record({
            undo: () => deleteRole.mutate(created.id),
            redo: () => createRole.mutate({ tacticalRoleId, x: 0.5, y: 0.5 }),
          });
        },
      }
    );
  }

  function handleRoleDeleted() {
    setSelectedRoleId(null);
  }

  function handleMoveBall(x: number, y: number) {
    if (!activeStage) return;
    const stageId = activeStage.id;
    const prevPos = activeStage.positions.find((p) => p.entityType === "BALL");
    const prev = prevPos ?? { x, y };
    flashSaved();
    updateBall.mutate({ stageId, x, y });
    record({
      undo: () => updateBall.mutate({ stageId, x: prev.x, y: prev.y }),
      redo: () => updateBall.mutate({ stageId, x, y }),
    });
  }

  function handlePlaceBall() {
    if (!activeStage) return;
    const stageId = activeStage.id;
    const x = 0.97;
    const y = 0.03;
    flashSaved();
    updateBall.mutate({ stageId, x, y });
    record({
      undo: () => removeBall.mutate(stageId),
      redo: () => updateBall.mutate({ stageId, x, y }),
    });
  }

  function handleRemoveBall() {
    if (!activeStage) return;
    const stageId = activeStage.id;
    const prev = activeStage.positions.find((p) => p.entityType === "BALL");
    flashSaved();
    removeBall.mutate(stageId);
    if (prev) {
      record({
        undo: () => updateBall.mutate({ stageId, x: prev.x, y: prev.y }),
        redo: () => removeBall.mutate(stageId),
      });
    }
  }

  function handleExportPdf() {
    if (!variant) return;
    setExporting(true);
    const previousView = view;
    // Force the full-pitch view for the export diagram so the PDF always
    // shows the whole picture, regardless of what the coach currently has open.
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

  if (isLoading || !variant) {
    return <div className="p-8 text-slate-500">Laddar taktiktavla...</div>;
  }

  const selectedRole = variant.roles.find((r) => r.id === selectedRoleId);
  const hasBall = !!activeStage?.positions.find((p) => p.entityType === "BALL");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-surface-border px-6 py-3">
        <div>
          <Link to="/fasta-situationer" className="text-xs text-slate-500 hover:text-accent">
            ← Fasta situationer
          </Link>
          <h1 className="text-lg font-semibold text-white">
            {variant.setPiece?.name} — {variant.name}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <SavingIndicator status={saveStatus} />
          <div className="flex gap-1 rounded-md border border-surface-border p-0.5">
            <button
              onClick={() => setView("full")}
              className={`rounded px-2 py-1 text-xs ${
                effectiveView === "full" ? "bg-accent text-slate-950" : "text-slate-300"
              }`}
            >
              Helplan
            </button>
            <button
              onClick={() => setView("box")}
              className={`rounded px-2 py-1 text-xs ${
                effectiveView === "box" ? "bg-accent text-slate-950" : "text-slate-300"
              }`}
            >
              Straffområde
            </button>
          </div>
          {hasBall ? (
            <button
              onClick={handleRemoveBall}
              className="rounded-md border border-surface-border px-2 py-1 text-xs text-slate-300 hover:text-red-400"
            >
              ⚽ Ta bort boll
            </button>
          ) : (
            <button
              onClick={handlePlaceBall}
              className="rounded-md border border-surface-border px-2 py-1 text-xs text-slate-300 hover:text-accent"
            >
              ⚽ Placera boll
            </button>
          )}
          <button
            onClick={() => setDrawMode((d) => !d)}
            className={`rounded-md border border-surface-border px-2 py-1 text-xs ${
              drawMode ? "bg-accent text-slate-950" : "text-slate-300 hover:text-accent"
            }`}
            title="Klicka en spelare, sedan en punkt på planen, för att rita en löplinje"
          >
            ➜ Rörelsepil
          </button>
          <button
            onClick={handleAddZone}
            className="rounded-md border border-surface-border px-2 py-1 text-xs text-slate-300 hover:text-accent"
            title="Lägg till en namngiven zon, t.ex. ’Andra boll’ eller ’Stanna hemma’"
          >
            ▢ Ny zon
          </button>
          <button
            onClick={handleSuggestSpecialRoles}
            disabled={suggestSpecialRoles.isPending}
            className="rounded-md border border-surface-border px-2 py-1 text-xs text-slate-300 hover:text-accent disabled:opacity-30"
            title="Föreslår vilken spelare i startelvan som passar bäst för varje specialroll, baserat på huvudspel/duellspel/längd"
          >
            🪄 Föreslå placering
          </button>
          <div className="flex gap-1">
            <button
              disabled={!canUndo}
              onClick={undo}
              className="rounded-md border border-surface-border px-2 py-1 text-xs text-slate-300 disabled:opacity-30"
              title="Ångra (Cmd/Ctrl+Z)"
            >
              ↶ Ångra
            </button>
            <button
              disabled={!canRedo}
              onClick={redo}
              className="rounded-md border border-surface-border px-2 py-1 text-xs text-slate-300 disabled:opacity-30"
              title="Gör om (Cmd/Ctrl+Shift+Z)"
            >
              ↷ Gör om
            </button>
          </div>
          <button
            disabled={exporting}
            onClick={handleExportPdf}
            className="rounded-md border border-surface-border px-2 py-1 text-xs text-slate-300 hover:text-accent disabled:opacity-30"
          >
            {exporting ? "Exporterar..." : "📄 Exportera PDF"}
          </button>
          <select
            className="input max-w-[220px]"
            value={lineupId ?? ""}
            onChange={(e) => setLineupId(e.target.value)}
          >
            {lineups?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} {l.isDefault ? "(standard)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-surface-border px-6 py-2">
        {stages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => setActiveStageId(stage.id)}
            onDoubleClick={() => {
              const name = window.prompt("Namn på steget", stage.name);
              if (name && name.trim()) handleRenameStage(stage.id, name.trim());
            }}
            className={`group flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
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
                  handleDeleteStage(stage.id);
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
          className="rounded-md border border-dashed border-surface-border px-2 py-1 text-xs text-slate-400 hover:text-accent"
        >
          + Lägg till steg
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <ToolPalette existingRoles={variant.roles} onAddRole={handleAddRole} />

        <div className="flex flex-1 items-center justify-center overflow-auto p-6">
          <PitchCanvas
            ref={canvasRef}
            roles={variant.roles}
            positions={activeStage?.positions ?? []}
            movements={activeStage?.movements ?? []}
            zones={variant.zones}
            view={effectiveView}
            selectedRoleId={selectedRoleId}
            selectedZoneId={selectedZoneId}
            drawMode={drawMode}
            onSelectRole={(id) => {
              setSelectedRoleId(id || null);
              if (id) setSelectedZoneId(null);
            }}
            onSelectZone={(id) => {
              setSelectedZoneId(id || null);
              if (id) setSelectedRoleId(null);
            }}
            onMoveRole={handleMoveRole}
            onMoveBall={handleMoveBall}
            onMoveZone={handleMoveZone}
            onDrawArrow={handleDrawArrow}
          />
        </div>

        {selectedZoneId && variant.zones.find((z) => z.id === selectedZoneId) ? (
          <ZoneInspector
            zone={variant.zones.find((z) => z.id === selectedZoneId)!}
            variantId={variant.id}
            onDeleted={() => setSelectedZoneId(null)}
          />
        ) : (
          <RoleInspector
            role={selectedRole}
            variantId={variant.id}
            onDeleted={handleRoleDeleted}
          />
        )}
      </div>
    </div>
  );
}
