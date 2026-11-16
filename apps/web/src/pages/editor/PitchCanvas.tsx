import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Circle, Text, Group, Arc, Arrow } from "react-konva";
import Konva from "konva";
import type { SetPieceMovement, SetPiecePosition, SetPieceRole, SetPieceZone } from "../../api/types";

/** "full" shows the whole pitch; "attack"/"defend" zoom into the penalty area at the
 * x=1 / x=0 goal and rotate the pitch so the goal is at the top (attack) or bottom
 * (defend), like the coaching slides. In both, y=0 is on the left. */
export type PitchView = "full" | "attack" | "defend";

const PITCH_LENGTH_M = 105;
const PITCH_WIDTH_M = 68;

interface ViewDef {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  /** Konva rotation (degrees, clockwise) applied to the pitch. */
  rotation: 0 | -90;
}

const VIEWS: Record<PitchView, ViewDef> = {
  full: { xMin: -0.03, xMax: 1.03, yMin: -0.04, yMax: 1.04, rotation: 0 },
  attack: { xMin: 0.55, xMax: 1.04, yMin: -0.05, yMax: 1.05, rotation: -90 },
  defend: { xMin: -0.04, xMax: 0.45, yMin: -0.05, yMax: 1.05, rotation: -90 },
};

type Point = { x: number; y: number };
type ToScreen = (nx: number, ny: number) => Point;

export type PitchTool = "select" | "arrow" | "zone";

/** What an arrow starts from: a player (role), the ball, or an opponent marker. */
export type ArrowSource =
  | { kind: "role"; roleId: string }
  | { kind: "ball" }
  | { kind: "opponent"; positionId: string };

const ARROW_STYLE: Record<SetPieceMovement["type"], { stroke: string; dash?: number[] }> = {
  RUN: { stroke: "#fde047" },
  ALT_RUN: { stroke: "#fde047", dash: [10, 7] },
  PASS: { stroke: "#ffffff" },
  BLOCK: { stroke: "#fb923c", dash: [3, 6] },
};

export const ARROW_LABELS: Record<SetPieceMovement["type"], string> = {
  RUN: "Löpning",
  ALT_RUN: "Alternativ löpning",
  PASS: "Passning/inlägg",
  BLOCK: "Block/skärm",
};

const GRASS_A = "#2f7d3b";
const GRASS_B = "#2a7335";
const LINE = "rgba(255,255,255,0.88)";

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function fitSize(view: PitchView, maxW: number, maxH: number) {
  const v = VIEWS[view];
  const alongX = (v.xMax - v.xMin) * PITCH_LENGTH_M;
  const alongY = (v.yMax - v.yMin) * PITCH_WIDTH_M;
  const [wM, hM] = v.rotation === 0 ? [alongX, alongY] : [alongY, alongX];
  const scale = Math.min(maxW / wM, maxH / hM);
  return { width: Math.floor(wM * scale), height: Math.floor(hM * scale) };
}

export interface PitchCanvasProps {
  roles: SetPieceRole[];
  positions: SetPiecePosition[];
  movements: SetPieceMovement[];
  zones: SetPieceZone[];
  view: PitchView;
  maxWidth?: number;
  maxHeight?: number;
  /** Presentation mode: nothing is draggable/selectable and markers are larger. */
  readOnly?: boolean;
  /** When this key changes (e.g. the stage id), markers glide to their new positions. */
  animateKey?: string;
  /** Dims everything except this role so one player's task can be explained. */
  focusRoleId?: string | null;
  /** "none": numbers only (names live in the side list); "selected": name only for the selected player. */
  labelMode?: "none" | "selected";
  selectedRoleId?: string | null;
  selectedZoneId?: string | null;
  selectedMovementId?: string | null;
  /** "arrow": press on a player/ball/opponent and drag to where the arrow should point. */
  tool?: PitchTool;
  /** Type used for the arrow preview while dragging in arrow mode. */
  arrowType?: SetPieceMovement["type"];
  selectedOpponentId?: string | null;
  onSelectRole?: (id: string) => void;
  onSelectZone?: (id: string) => void;
  onSelectMovement?: (id: string) => void;
  onSelectOpponent?: (id: string) => void;
  onMoveRole?: (id: string, x: number, y: number) => void;
  onMoveBall?: (x: number, y: number) => void;
  onMoveOpponent?: (id: string, x: number, y: number) => void;
  onMoveZone?: (id: string, points: Point[]) => void;
  onDrawArrow?: (source: ArrowSource, from: Point, to: Point) => void;
  /** Zone tool: called with two opposite corners of the rectangle that was dragged out. */
  onDrawZone?: (a: Point, b: Point) => void;
  onUpdateMovement?: (id: string, data: { fromX?: number; fromY?: number; toX?: number; toY?: number }) => void;
}

export interface PitchCanvasHandle {
  /** Renders the pitch to an image (used for PDF export). */
  toDataURL: () => { dataUrl: string; width: number; height: number } | null;
}

export const PitchCanvas = forwardRef<PitchCanvasHandle, PitchCanvasProps>(function PitchCanvas(
  {
    roles,
    positions,
    movements,
    zones,
    view,
    maxWidth = 720,
    maxHeight = 560,
    readOnly = false,
    animateKey,
    focusRoleId = null,
    labelMode = "none",
    selectedRoleId = null,
    selectedZoneId = null,
    selectedMovementId = null,
    selectedOpponentId = null,
    tool = "select",
    arrowType = "RUN",
    onSelectRole,
    onSelectZone,
    onSelectMovement,
    onSelectOpponent,
    onMoveRole,
    onMoveBall,
    onMoveOpponent,
    onMoveZone,
    onDrawArrow,
    onDrawZone,
    onUpdateMovement,
  },
  ref
) {
  const stageRef = useRef<Konva.Stage>(null);
  const vp = VIEWS[view];
  const { width, height } = fitSize(view, Math.max(200, maxWidth), Math.max(150, maxHeight));
  const ui = clamp(Math.sqrt(width * height) / 520, 0.8, 2.4) * (readOnly ? 1.1 : 1);
  const arrowTool = tool === "arrow" && !readOnly;
  const zoneTool = tool === "zone" && !readOnly;
  const [draft, setDraft] = useState<{ source: ArrowSource; from: Point; to: Point } | null>(null);
  const [zoneDraft, setZoneDraft] = useState<{ from: Point; to: Point } | null>(null);

  useEffect(() => {
    const container = stageRef.current?.container();
    if (container) container.style.cursor = arrowTool || zoneTool ? "crosshair" : "default";
  }, [arrowTool, zoneTool]);

  useImperativeHandle(ref, () => ({
    toDataURL: () => {
      const stage = stageRef.current;
      if (!stage) return null;
      const dataUrl = stage.toDataURL({ pixelRatio: 1.6, mimeType: "image/jpeg", quality: 0.92 });
      return { dataUrl, width: stage.width(), height: stage.height() };
    },
  }));

  const toScreen: ToScreen = (nx, ny) => {
    const u = (nx - vp.xMin) / (vp.xMax - vp.xMin);
    const v = (ny - vp.yMin) / (vp.yMax - vp.yMin);
    if (vp.rotation === -90) return { x: v * width, y: (1 - u) * height };
    return { x: u * width, y: v * height };
  };
  const fromScreen = (sx: number, sy: number): Point => {
    let u: number;
    let v: number;
    if (vp.rotation === -90) {
      v = sx / width;
      u = 1 - sy / height;
    } else {
      u = sx / width;
      v = sy / height;
    }
    return { x: vp.xMin + u * (vp.xMax - vp.xMin), y: vp.yMin + v * (vp.yMax - vp.yMin) };
  };
  const toNormalized = (sx: number, sy: number): Point => {
    const p = fromScreen(sx, sy);
    return { x: clamp(p.x, 0, 1), y: clamp(p.y, 0, 1) };
  };

  const ballPos = positions.find((p) => p.entityType === "BALL");
  const opponents = positions.filter((p) => p.entityType === "OPPONENT");
  // Markers are sized in metres (~0.95 m radius) so they stay clear of each other at any zoom.
  const pxPerMeter = Math.hypot(
    toScreen(0.5 + 1 / PITCH_LENGTH_M, 0.5).x - toScreen(0.5, 0.5).x,
    toScreen(0.5 + 1 / PITCH_LENGTH_M, 0.5).y - toScreen(0.5, 0.5).y
  );
  const markerR = clamp(pxPerMeter * 0.95, 9, 26 * Math.max(1, ui / 1.2));
  const edit = !readOnly;
  const interactive = edit && tool === "select";

  function pointer(): Point | null {
    const pos = stageRef.current?.getPointerPosition();
    return pos ? { x: pos.x, y: pos.y } : null;
  }

  function startDraft(source: ArrowSource, from: Point) {
    const p = pointer();
    setDraft({ source, from, to: p ? toNormalized(p.x, p.y) : from });
  }

  function startZoneDraft() {
    const p = pointer();
    if (!p) return;
    const n = toNormalized(p.x, p.y);
    setZoneDraft({ from: n, to: n });
  }

  function updateDraft() {
    const p = pointer();
    if (!p) return;
    if (zoneDraft) setZoneDraft({ ...zoneDraft, to: toNormalized(p.x, p.y) });
    else if (draft) setDraft({ ...draft, to: toNormalized(p.x, p.y) });
  }

  function finishDraft() {
    if (zoneDraft) {
      const a = toScreen(zoneDraft.from.x, zoneDraft.from.y);
      const b = toScreen(zoneDraft.to.x, zoneDraft.to.y);
      if (Math.abs(a.x - b.x) > 14 && Math.abs(a.y - b.y) > 14) onDrawZone?.(zoneDraft.from, zoneDraft.to);
      setZoneDraft(null);
      return;
    }
    if (!draft) return;
    const a = toScreen(draft.from.x, draft.from.y);
    const b = toScreen(draft.to.x, draft.to.y);
    // A plain click (no drag) just selects the thing that was pressed.
    if (Math.hypot(a.x - b.x, a.y - b.y) > markerR * 1.2) {
      onDrawArrow?.(draft.source, draft.from, draft.to);
    } else if (draft.source.kind === "role") {
      onSelectRole?.(draft.source.roleId);
    }
    setDraft(null);
  }

  function handleBackgroundPress() {
    if (!edit || arrowTool || zoneTool) return;
    onSelectRole?.("");
    onSelectZone?.("");
    onSelectMovement?.("");
    onSelectOpponent?.("");
  }

  const draftStyle = ARROW_STYLE[arrowType];
  const draftFrom = draft ? toScreen(draft.from.x, draft.from.y) : null;
  const draftTo = draft ? toScreen(draft.to.x, draft.to.y) : null;

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      style={{ borderRadius: readOnly ? 12 : 8, overflow: "hidden", boxShadow: "0 6px 30px rgba(0,0,0,0.45)" }}
      onMouseDown={(e) => {
        if (zoneTool) startZoneDraft();
        else if (e.target === e.target.getStage()) handleBackgroundPress();
      }}
      onTouchStart={(e) => {
        if (zoneTool) startZoneDraft();
        else if (e.target === e.target.getStage()) handleBackgroundPress();
      }}
      onMouseMove={updateDraft}
      onTouchMove={updateDraft}
      onMouseUp={finishDraft}
      onTouchEnd={finishDraft}
      onMouseLeave={() => {
        setDraft(null);
        setZoneDraft(null);
      }}
    >
      <Layer listening={false}>
        <PitchMarkings toScreen={toScreen} rotation={vp.rotation} width={width} height={height} ui={ui} />
      </Layer>

      <Layer>
        {zones.map((zone) => (
          <ZoneShape
            key={zone.id}
            zone={zone}
            toScreen={toScreen}
            fromScreen={fromScreen}
            ui={ui}
            selected={zone.id === selectedZoneId}
            interactive={interactive && !!onMoveZone}
            dimmed={!!focusRoleId}
            onSelect={() => onSelectZone?.(zone.id)}
            onMove={(points) => onMoveZone?.(zone.id, points)}
          />
        ))}
      </Layer>

      <Layer listening={interactive}>
        {movements.map((m) => (
          <MovementArrow
            key={m.id}
            movement={m}
            toScreen={toScreen}
            fromScreen={fromScreen}
            ui={ui}
            markerR={markerR}
            animate={!!animateKey}
            animateKey={animateKey}
            selected={m.id === selectedMovementId}
            interactive={interactive}
            dimmed={!!focusRoleId && m.setPieceRoleId !== focusRoleId}
            onSelect={() => onSelectMovement?.(m.id)}
          />
        ))}
      </Layer>

      <Layer>
        {opponents.map((opp) => {
          const s = toScreen(opp.x, opp.y);
          const selected = opp.id === selectedOpponentId;
          return (
            <Group
              key={opp.id}
              x={s.x}
              y={s.y}
              opacity={focusRoleId ? 0.3 : 1}
              draggable={interactive}
              onClick={() => interactive && onSelectOpponent?.(opp.id)}
              onTap={() => interactive && onSelectOpponent?.(opp.id)}
              onMouseDown={(e) => {
                if (!arrowTool) return;
                e.cancelBubble = true;
                startDraft({ kind: "opponent", positionId: opp.id }, { x: opp.x, y: opp.y });
              }}
              onTouchStart={(e) => {
                if (!arrowTool) return;
                e.cancelBubble = true;
                startDraft({ kind: "opponent", positionId: opp.id }, { x: opp.x, y: opp.y });
              }}
              onDragEnd={(e) => {
                const n = toNormalized(e.target.x(), e.target.y());
                onMoveOpponent?.(opp.id, n.x, n.y);
              }}
              dragBoundFunc={(pt) => ({ x: clamp(pt.x, 10, width - 10), y: clamp(pt.y, 10, height - 10) })}
            >
              <Circle
                radius={markerR * 0.85}
                fill="#dc2626"
                stroke={selected ? "#fde047" : "white"}
                strokeWidth={(selected ? 3.2 : 2) * ui}
                shadowColor="black"
                shadowBlur={6}
                shadowOpacity={0.45}
              />
              <Text
                text={opp.label || "M"}
                fontSize={12 * ui}
                fontStyle="bold"
                fill="white"
                width={markerR * 1.7}
                height={markerR * 1.7}
                align="center"
                verticalAlign="middle"
                offsetX={markerR * 0.85}
                offsetY={markerR * 0.85}
                listening={false}
              />
            </Group>
          );
        })}

        {ballPos && (
          <Group
            x={toScreen(ballPos.x, ballPos.y).x}
            y={toScreen(ballPos.x, ballPos.y).y}
            draggable={interactive}
            onMouseDown={(e) => {
              if (!arrowTool) return;
              e.cancelBubble = true;
              startDraft({ kind: "ball" }, { x: ballPos.x, y: ballPos.y });
            }}
            onTouchStart={(e) => {
              if (!arrowTool) return;
              e.cancelBubble = true;
              startDraft({ kind: "ball" }, { x: ballPos.x, y: ballPos.y });
            }}
            onDragEnd={(e) => {
              const n = toNormalized(e.target.x(), e.target.y());
              onMoveBall?.(n.x, n.y);
            }}
            dragBoundFunc={(pt) => ({
              x: clamp(pt.x, 8, width - 8),
              y: clamp(pt.y, 8, height - 8),
            })}
          >
            <Circle radius={9 * ui} fill="#f8fafc" stroke="#0f172a" strokeWidth={1.6 * ui} shadowColor="black" shadowBlur={6} shadowOpacity={0.5} />
            {Array.from({ length: 6 }).map((_, i) => (
              <Line
                key={i}
                points={[0, 0, 8.4 * ui * Math.cos((i * Math.PI) / 3), 8.4 * ui * Math.sin((i * Math.PI) / 3)]}
                stroke="#0f172a"
                strokeWidth={0.9 * ui}
              />
            ))}
          </Group>
        )}

        {roles.map((role) => {
          const rolePos = positions.find((p) => p.entityType === "OWN_ROLE" && p.setPieceRoleId === role.id);
          if (!rolePos && readOnly) return null;
          const pos = rolePos ?? { x: 0.5, y: 0.5 };
          const screenPos = toScreen(pos.x, pos.y);
          const color = role.colorOverride ?? role.tacticalRole.color ?? "#38bdf8";
          return (
            <RoleMarker
              key={role.id}
              role={role}
              x={screenPos.x}
              y={screenPos.y}
              color={color}
              ui={ui}
              radius={markerR}
              labelMode={labelMode}
              selected={role.id === selectedRoleId}
              focused={role.id === focusRoleId}
              dimmed={!!focusRoleId && role.id !== focusRoleId}
              draggable={interactive}
              animateKey={animateKey}
              bounds={{ width, height }}
              onClick={() => interactive && onSelectRole?.(role.id)}
              onPress={arrowTool ? () => startDraft({ kind: "role", roleId: role.id }, pos) : undefined}
              onDragEnd={(sx, sy) => {
                const n = toNormalized(sx, sy);
                onMoveRole?.(role.id, n.x, n.y);
              }}
            />
          );
        })}
      </Layer>

      <Layer listening={false}>
        {zoneDraft && (
          <Rect
            x={Math.min(toScreen(zoneDraft.from.x, zoneDraft.from.y).x, toScreen(zoneDraft.to.x, zoneDraft.to.y).x)}
            y={Math.min(toScreen(zoneDraft.from.x, zoneDraft.from.y).y, toScreen(zoneDraft.to.x, zoneDraft.to.y).y)}
            width={Math.abs(toScreen(zoneDraft.from.x, zoneDraft.from.y).x - toScreen(zoneDraft.to.x, zoneDraft.to.y).x)}
            height={Math.abs(toScreen(zoneDraft.from.x, zoneDraft.from.y).y - toScreen(zoneDraft.to.x, zoneDraft.to.y).y)}
            fill="#38bdf8"
            opacity={0.3}
            stroke="white"
            strokeWidth={2}
            dash={[8, 6]}
          />
        )}
        {draft && draftFrom && draftTo && (
          <Arrow
            points={[draftFrom.x, draftFrom.y, draftTo.x, draftTo.y]}
            stroke={draftStyle.stroke}
            fill={draftStyle.stroke}
            strokeWidth={3.2 * ui}
            dash={draftStyle.dash?.map((d) => d * ui)}
            pointerLength={12 * ui}
            pointerWidth={11 * ui}
            opacity={0.8}
            lineCap="round"
          />
        )}
      </Layer>

      <Layer>
        {interactive && selectedMovementId && onUpdateMovement &&
          movements
            .filter((m) => m.id === selectedMovementId)
            .map((m) => {
              const from = toScreen(m.fromX, m.fromY);
              const to = toScreen(m.toX, m.toY);
              return (
                <Group key={m.id}>
                  {(
                    [
                      ["to", to],
                      ["from", from],
                    ] as const
                  ).map(([end, pt]) => (
                    <Circle
                      key={end}
                      x={pt.x}
                      y={pt.y}
                      radius={7 * ui}
                      fill="#38bdf8"
                      stroke="white"
                      strokeWidth={2}
                      draggable
                      onMouseEnter={(e) => {
                        const c = e.target.getStage()?.container();
                        if (c) c.style.cursor = "grab";
                      }}
                      onMouseLeave={(e) => {
                        const c = e.target.getStage()?.container();
                        if (c) c.style.cursor = "default";
                      }}
                      onDragEnd={(e) => {
                        const n = toNormalized(e.target.x(), e.target.y());
                        onUpdateMovement(m.id, end === "to" ? { toX: n.x, toY: n.y } : { fromX: n.x, fromY: n.y });
                      }}
                    />
                  ))}
                </Group>
              );
            })}
      </Layer>
    </Stage>
  );
});

function RoleMarker({
  role,
  x,
  y,
  color,
  ui,
  radius,
  labelMode,
  selected,
  focused,
  dimmed,
  draggable,
  animateKey,
  bounds,
  onClick,
  onPress,
  onDragEnd,
}: {
  role: SetPieceRole;
  x: number;
  y: number;
  color: string;
  ui: number;
  radius: number;
  labelMode: "none" | "selected";
  selected: boolean;
  focused: boolean;
  dimmed: boolean;
  draggable: boolean;
  animateKey: string | undefined;
  bounds: { width: number; height: number };
  onClick: () => void;
  onPress?: () => void;
  onDragEnd: (sx: number, sy: number) => void;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const lastKey = useRef<string | undefined>(undefined);
  const placed = useRef(false);

  // Position is driven imperatively so that a stage change can glide instead of jump.
  useLayoutEffect(() => {
    const node = groupRef.current;
    if (!node) return;
    const stageChanged = placed.current && animateKey !== undefined && lastKey.current !== animateKey;
    lastKey.current = animateKey;
    placed.current = true;
    if (!stageChanged) {
      node.position({ x, y });
      node.getLayer()?.batchDraw();
      return;
    }
    const tween = new Konva.Tween({
      node,
      x,
      y,
      duration: 1.0,
      easing: Konva.Easings.EaseInOut,
    });
    tween.play();
    return () => tween.destroy();
  }, [x, y, animateKey]);

  const number = role.resolvedPlayer ? String(role.resolvedPlayer.shirtNumber) : "?";
  const roleName = role.label ?? role.tacticalRole.name;
  const showLabel = labelMode === "selected" && selected;
  const primary = roleName;
  const secondary = role.resolvedPlayer?.name ?? null;
  const r = focused ? radius * 1.25 : radius;
  const labelW = 190 * ui;

  return (
    <Group
      ref={groupRef}
      opacity={dimmed ? 0.3 : 1}
      draggable={draggable}
      onClick={onClick}
      onTap={onClick}
      onMouseDown={(e) => {
        if (onPress) {
          e.cancelBubble = true;
          onPress();
        }
      }}
      onTouchStart={(e) => {
        if (onPress) {
          e.cancelBubble = true;
          onPress();
        }
      }}
      onDragEnd={(e) => onDragEnd(e.target.x(), e.target.y())}
      dragBoundFunc={(pt) => ({
        x: clamp(pt.x, 12, bounds.width - 12),
        y: clamp(pt.y, 12, bounds.height - 12),
      })}
    >
      {focused && <Circle radius={r + 7 * ui} stroke="#fde047" strokeWidth={3 * ui} opacity={0.9} listening={false} />}
      <Circle
        radius={r}
        fill={color}
        stroke={selected ? "#fde047" : "white"}
        strokeWidth={(selected ? 3 : 1.6) * Math.min(ui, 1.4)}
        shadowColor={selected ? "#fde047" : "black"}
        shadowBlur={selected ? 12 : 6}
        shadowOpacity={selected ? 1 : 0.45}
      />
      <Text
        text={number}
        fontSize={r * 0.95}
        fontStyle="bold"
        fill="white"
        width={r * 2}
        height={r * 2}
        align="center"
        verticalAlign="middle"
        offsetX={r}
        offsetY={r}
        listening={false}
      />
      {showLabel && (
      <Text
        text={primary}
        fontSize={12 * ui}
        fontStyle="bold"
        fill="white"
        stroke="#052e16"
        strokeWidth={3 * ui}
        fillAfterStrokeEnabled
        width={labelW}
        align="center"
        offsetX={labelW / 2}
        y={r + 4 * ui}
        listening={false}
      />
      )}
      {showLabel && secondary && (
        <Text
          text={secondary}
          fontSize={11 * ui}
          fill="#fef9c3"
          stroke="#052e16"
          strokeWidth={2.5 * ui}
          fillAfterStrokeEnabled
          width={labelW}
          align="center"
          offsetX={labelW / 2}
          y={r + 4 * ui + 16 * ui}
          listening={false}
        />
      )}
    </Group>
  );
}

function MovementArrow({
  movement: m,
  toScreen,
  fromScreen,
  ui,
  markerR,
  animate,
  animateKey,
  selected,
  interactive,
  dimmed,
  onSelect,
}: {
  movement: SetPieceMovement;
  toScreen: ToScreen;
  fromScreen: (sx: number, sy: number) => Point;
  ui: number;
  markerR: number;
  animate: boolean;
  animateKey: string | undefined;
  selected: boolean;
  interactive: boolean;
  dimmed: boolean;
  onSelect: () => void;
}) {
  const ref = useRef<Konva.Arrow>(null);
  const style = ARROW_STYLE[m.type];
  const rawFrom = toScreen(m.fromX, m.fromY);
  const to = toScreen(m.toX, m.toY);
  const dx = to.x - rawFrom.x;
  const dy = to.y - rawFrom.y;
  const len = Math.hypot(dx, dy) || 1;
  // Start the arrow at the edge of the player marker instead of under it.
  const trim = len > markerR * 2.5 ? markerR * 1.05 : 0;
  const from = { x: rawFrom.x + (dx / len) * trim, y: rawFrom.y + (dy / len) * trim };

  let points = [from.x, from.y, to.x, to.y];
  let tension = 0;
  if (m.type === "PASS" && len > 40) {
    // Passes/crosses are drawn as an in-swinging curve, like the slides: the ball bows out away from
    // the goal line and bends back in towards the goal.
    const nx = -dy / len;
    const ny = dx / len;
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const a = fromScreen(mid.x + nx * 10, mid.y + ny * 10);
    const b = fromScreen(mid.x - nx * 10, mid.y - ny * 10);
    const goalX = m.toX > 0.5 ? 1 : 0;
    const depthGap = Math.abs(goalX - a.x) - Math.abs(goalX - b.x);
    // Along the goal line the depth is equal, so bow outwards from the middle of the pitch instead.
    const useA = Math.abs(depthGap) > 0.004 ? depthGap > 0 : Math.abs(a.y - 0.5) > Math.abs(b.y - 0.5);
    const sign = useA ? 1 : -1;
    const bulge = len * 0.2 * sign;
    points = [from.x, from.y, mid.x + nx * bulge, mid.y + ny * bulge, to.x, to.y];
    tension = 0.5;
  }

  const targetOpacity = dimmed ? 0.18 : 1;
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!animate) {
      node.opacity(targetOpacity);
      node.getLayer()?.batchDraw();
      return;
    }
    node.opacity(0);
    const tween = new Konva.Tween({ node, opacity: targetOpacity, duration: 0.6, delay: 0.7 });
    tween.play();
    return () => tween.destroy();
  }, [animate, animateKey, targetOpacity]);

  return (
    <Arrow
      ref={ref}
      points={points}
      tension={tension}
      stroke={selected ? "#38bdf8" : style.stroke}
      fill={selected ? "#38bdf8" : style.stroke}
      strokeWidth={(selected ? 4.5 : 3.2) * ui}
      dash={style.dash?.map((d) => d * ui)}
      pointerLength={Math.min(12 * ui, len * 0.45)}
      pointerWidth={Math.min(11 * ui, len * 0.4)}
      lineCap="round"
      shadowColor="black"
      shadowBlur={4}
      shadowOpacity={0.5}
      hitStrokeWidth={interactive ? 16 : 0}
      listening={interactive}
      onClick={onSelect}
      onTap={onSelect}
    />
  );
}

function ZoneShape({
  zone,
  toScreen,
  fromScreen,
  ui,
  selected,
  interactive,
  dimmed,
  onSelect,
  onMove,
}: {
  zone: SetPieceZone;
  toScreen: ToScreen;
  fromScreen: (sx: number, sy: number) => Point;
  ui: number;
  selected: boolean;
  interactive: boolean;
  dimmed: boolean;
  onSelect: () => void;
  onMove: (points: Point[]) => void;
}) {
  const [p0, p1] = zone.points;
  const a = toScreen(p0.x, p0.y);
  const b = toScreen(p1.x, p1.y);
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const right = Math.max(a.x, b.x);
  const bottom = Math.max(a.y, b.y);

  // Numbered zones ("Zon 21") that are too narrow for their name show just the number inside the
  // zone; every other zone keeps its full name above it, shrunk a little if the zone is narrow.
  const zoneW = right - left;
  const fullName = zone.name.toUpperCase();
  const charW = 0.78;
  const baseSize = 13 * ui;
  const fullW = fullName.length * charW * baseSize;
  const lastWord = fullName.split(/\s+/).pop() ?? fullName;
  let label = { text: fullName, fontSize: baseSize, width: Math.max(zoneW, fullW), inside: false };
  if (fullW > zoneW * 0.95) {
    if (/^\d+$/.test(lastWord) && fullName !== lastWord) {
      label = { text: lastWord, fontSize: Math.min(baseSize, zoneW / (lastWord.length * charW + 0.6)), width: zoneW, inside: true };
    } else {
      label = { text: fullName, fontSize: Math.max(10 * ui, Math.min(baseSize, zoneW / (fullName.length * charW))), width: Math.max(zoneW, fullW * 0.8), inside: false };
    }
  }

  return (
    <>
      <Group
        x={left}
        y={top}
        opacity={dimmed ? 0.35 : 1}
        draggable={interactive}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          const dx = e.target.x() - left;
          const dy = e.target.y() - top;
          onMove(
            zone.points.map((p) => {
              const s = toScreen(p.x, p.y);
              const n = fromScreen(s.x + dx, s.y + dy);
              return { x: clamp(n.x, 0, 1), y: clamp(n.y, 0, 1) };
            })
          );
        }}
      >
        <Rect
          width={right - left}
          height={bottom - top}
          fill={zone.color}
          opacity={0.24}
          stroke={zone.color}
          strokeWidth={(selected ? 3 : 2) * ui}
          cornerRadius={4}
        />
        <Rect
          width={right - left}
          height={bottom - top}
          stroke="white"
          strokeWidth={(selected ? 2.5 : 1.5) * ui}
          dash={[8 * ui, 6 * ui]}
          cornerRadius={4}
          opacity={0.85}
          listening={false}
        />
        <Text
          text={label.text}
          fontSize={label.fontSize}
          fontStyle="bold"
          fill="white"
          stroke="#052e16"
          strokeWidth={3 * ui}
          fillAfterStrokeEnabled
          width={label.width}
          align="center"
          offsetX={(label.width - zoneW) / 2}
          y={label.inside ? 3 * ui : -(label.fontSize + 5 * ui)}
          listening={false}
        />
      </Group>
      {selected && interactive && (
        <Circle
          x={right}
          y={bottom}
          radius={7 * ui}
          fill="#fde047"
          stroke="#1e293b"
          strokeWidth={1}
          draggable
          onDragEnd={(e) => {
            const anchor = fromScreen(left, top);
            const corner = fromScreen(e.target.x(), e.target.y());
            onMove([
              { x: clamp(anchor.x, 0, 1), y: clamp(anchor.y, 0, 1) },
              { x: clamp(corner.x, 0, 1), y: clamp(corner.y, 0, 1) },
            ]);
          }}
        />
      )}
    </>
  );
}

function PitchMarkings({
  toScreen,
  rotation,
  width,
  height,
  ui,
}: {
  toScreen: ToScreen;
  rotation: number;
  width: number;
  height: number;
  ui: number;
}) {
  const lw = 2.2 * Math.max(1, ui * 0.9);
  const flat = (pts: Point[]) =>
    pts.flatMap((p) => {
      const s = toScreen(p.x, p.y);
      return [s.x, s.y];
    });
  const rect = (x0: number, y0: number, x1: number, y1: number): Point[] => [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ];

  const boxDepth = 16.5 / PITCH_LENGTH_M;
  const boxHalf = 20.16 / PITCH_WIDTH_M;
  const sixDepth = 5.5 / PITCH_LENGTH_M;
  const sixHalf = 9.16 / PITCH_WIDTH_M;
  const spotX = 11 / PITCH_LENGTH_M;
  const goalHalf = 3.66 / PITCH_WIDTH_M;
  const goalDepth = 2.2 / PITCH_LENGTH_M;
  const arcR = 9.15;

  const bands = 14;
  const stripes = Array.from({ length: bands }, (_, i) => {
    const x0 = i === 0 ? -1 : i / bands;
    const x1 = i === bands - 1 ? 2 : (i + 1) / bands;
    return { x0, x1, fill: i % 2 === 0 ? GRASS_A : GRASS_B };
  });

  // Distances on the pitch are isotropic on screen, so a metre can be measured along either axis.
  const metersToPx = (m: number) => {
    const c = toScreen(0.5, 0.5);
    const e = toScreen(0.5 + m / PITCH_LENGTH_M, 0.5);
    return Math.hypot(e.x - c.x, e.y - c.y);
  };

  const circle = (nx: number, ny: number, r: number) => {
    const c = toScreen(nx, ny);
    return <Circle x={c.x} y={c.y} radius={metersToPx(r)} stroke={LINE} strokeWidth={lw} />;
  };
  const dot = (nx: number, ny: number) => {
    const c = toScreen(nx, ny);
    return <Circle x={c.x} y={c.y} radius={3 * ui} fill={LINE} />;
  };
  const arc = (nx: number, ny: number, r: number, rot: number, angle: number) => {
    const c = toScreen(nx, ny);
    const px = metersToPx(r);
    return (
      <Arc x={c.x} y={c.y} innerRadius={px} outerRadius={px} angle={angle} rotation={rot + rotation} stroke={LINE} strokeWidth={lw} />
    );
  };
  const goal = (side: 0 | 1) => {
    const dir = side === 1 ? 1 : -1;
    const x0 = side;
    const x1 = side + dir * goalDepth;
    const pts = rect(Math.min(x0, x1), 0.5 - goalHalf, Math.max(x0, x1), 0.5 + goalHalf);
    const netLines: number[][] = [];
    for (let i = 1; i < 6; i++) {
      const y = 0.5 - goalHalf + (2 * goalHalf * i) / 6;
      netLines.push(flat([{ x: x0, y }, { x: x1, y }]));
    }
    for (let i = 1; i < 3; i++) {
      const x = x0 + ((x1 - x0) * i) / 3;
      netLines.push(flat([{ x, y: 0.5 - goalHalf }, { x, y: 0.5 + goalHalf }]));
    }
    return (
      <>
        <Line points={flat(pts)} closed fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.95)" strokeWidth={lw * 1.3} />
        {netLines.map((l, i) => (
          <Line key={i} points={l} stroke="rgba(255,255,255,0.45)" strokeWidth={1} />
        ))}
      </>
    );
  };

  return (
    <>
      <Rect width={width} height={height} fill={GRASS_A} />
      {stripes.map((s, i) => (
        <Line key={i} points={flat(rect(s.x0, -1, s.x1, 2))} closed fill={s.fill} />
      ))}

      <Line points={flat(rect(0, 0, 1, 1))} closed stroke={LINE} strokeWidth={lw} />
      <Line points={flat([{ x: 0.5, y: 0 }, { x: 0.5, y: 1 }])} stroke={LINE} strokeWidth={lw} />
      {circle(0.5, 0.5, arcR)}
      {dot(0.5, 0.5)}

      {[0, 1].map((side) => {
        const sgn = side === 0 ? 1 : -1;
        return (
          <Group key={side}>
            <Line points={flat(rect(side, 0.5 - boxHalf, side + sgn * boxDepth, 0.5 + boxHalf))} closed stroke={LINE} strokeWidth={lw} />
            <Line points={flat(rect(side, 0.5 - sixHalf, side + sgn * sixDepth, 0.5 + sixHalf))} closed stroke={LINE} strokeWidth={lw} />
            {dot(side + sgn * spotX, 0.5)}
            {arc(side + sgn * boxDepth, 0.5, arcR, side === 0 ? -53 : 127, 106)}
            {goal(side as 0 | 1)}
          </Group>
        );
      })}

      {arc(0, 0, 1, 0, 90)}
      {arc(1, 0, 1, 90, 90)}
      {arc(1, 1, 1, 180, 90)}
      {arc(0, 1, 1, 270, 90)}
    </>
  );
}
