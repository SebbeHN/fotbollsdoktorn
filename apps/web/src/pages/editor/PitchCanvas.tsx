import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Circle, Text, Group, Arc, Arrow } from "react-konva";
import type Konva from "konva";
import type { SetPieceMovement, SetPiecePosition, SetPieceRole, SetPieceZone } from "../../api/types";

export type PitchView = "full" | "box";

// Real FIFA-standard pitch proportions, used so every view (full pitch or a
// cropped-in zone) renders with the correct aspect ratio instead of stretching.
const PITCH_LENGTH_M = 105;
const PITCH_WIDTH_M = 68;
const MAX_CANVAS_W = 720;
const MAX_CANVAS_H = 560;

/** Visible normalized-coordinate window for each view. "box" zooms into the
 * attacking penalty area (goal on the right) so corner/free-kick markers and
 * the ball can be placed precisely; "full" shows the whole pitch. */
const CROPS: Record<PitchView, { xMin: number; xMax: number; yMin: number; yMax: number }> = {
  full: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
  box: { xMin: 0.68, xMax: 1, yMin: 0, yMax: 1 },
};

/** Fits a crop (given in real-world meters) into the max canvas box while
 * preserving its true aspect ratio, so circles stay circles and distances
 * stay proportional in both axes. */
function stageSizeFor(view: PitchView) {
  const crop = CROPS[view];
  const widthM = (crop.xMax - crop.xMin) * PITCH_LENGTH_M;
  const heightM = (crop.yMax - crop.yMin) * PITCH_WIDTH_M;
  const ratio = widthM / heightM;
  if (ratio >= MAX_CANVAS_W / MAX_CANVAS_H) {
    return { width: MAX_CANVAS_W, height: MAX_CANVAS_W / ratio };
  }
  return { width: MAX_CANVAS_H * ratio, height: MAX_CANVAS_H };
}

type ToScreen = (nx: number, ny: number) => { x: number; y: number };

const ARROW_STYLE: Record<SetPieceMovement["type"], { stroke: string; dash?: number[] }> = {
  RUN: { stroke: "#facc15" },
  ALT_RUN: { stroke: "#facc15", dash: [8, 6] },
  PASS: { stroke: "#38bdf8" },
  BLOCK: { stroke: "#f87171", dash: [2, 4] },
};

interface PitchCanvasProps {
  roles: SetPieceRole[];
  positions: SetPiecePosition[];
  movements: SetPieceMovement[];
  zones: SetPieceZone[];
  view: PitchView;
  selectedRoleId: string | null;
  selectedZoneId?: string | null;
  /** When true, clicking a role then clicking a spot on the pitch draws a run arrow. */
  drawMode: boolean;
  onSelectRole: (id: string) => void;
  onSelectZone?: (id: string) => void;
  onMoveRole: (id: string, x: number, y: number) => void;
  onMoveBall: (x: number, y: number) => void;
  onMoveZone?: (id: string, points: { x: number; y: number }[]) => void;
  onDrawArrow: (roleId: string, from: { x: number; y: number }, to: { x: number; y: number }) => void;
}

export interface PitchCanvasHandle {
  /** Renders the current stage to a PNG data URL (used for PDF export). */
  toDataURL: () => string | null;
}

export const PitchCanvas = forwardRef<PitchCanvasHandle, PitchCanvasProps>(function PitchCanvas(
  {
    roles,
    positions,
    movements,
    zones,
    view,
    selectedRoleId,
    selectedZoneId,
    drawMode,
    onSelectRole,
    onSelectZone,
    onMoveRole,
    onMoveBall,
    onMoveZone,
    onDrawArrow,
  },
  ref
) {
  const stageRef = useRef<Konva.Stage>(null);
  const vp = CROPS[view];
  const { width, height } = stageSizeFor(view);
  const [pendingArrow, setPendingArrow] = useState<{ roleId: string; from: { x: number; y: number } } | null>(
    null
  );

  useImperativeHandle(ref, () => ({
    toDataURL: () => stageRef.current?.toDataURL({ pixelRatio: 2 }) ?? null,
  }));

  const toScreen: ToScreen = (nx, ny) => ({
    x: ((nx - vp.xMin) / (vp.xMax - vp.xMin)) * width,
    y: ((ny - vp.yMin) / (vp.yMax - vp.yMin)) * height,
  });
  const toNormalized = (sx: number, sy: number) => ({
    x: clamp(vp.xMin + (sx / width) * (vp.xMax - vp.xMin), 0, 1),
    y: clamp(vp.yMin + (sy / height) * (vp.yMax - vp.yMin), 0, 1),
  });

  const ballPos = positions.find((p) => p.entityType === "BALL");

  function handleBackgroundClick(sx: number, sy: number) {
    if (drawMode && pendingArrow) {
      const to = toNormalized(sx, sy);
      onDrawArrow(pendingArrow.roleId, pendingArrow.from, to);
      setPendingArrow(null);
      return;
    }
    if (!drawMode) {
      onSelectRole("");
      onSelectZone?.("");
    }
  }

  return (
    <div className="inline-block rounded-lg border border-surface-border bg-surface-raised p-3">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) {
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) handleBackgroundClick(pos.x, pos.y);
          }
        }}
      >
        <Layer listening={false}>
          <PitchMarkings toScreen={toScreen} />
        </Layer>

        <Layer>
          {zones.map((zone) => (
            <ZoneShape
              key={zone.id}
              zone={zone}
              toScreen={toScreen}
              toNormalized={toNormalized}
              selected={zone.id === selectedZoneId}
              interactive={!drawMode && !!onMoveZone}
              onSelect={() => onSelectZone?.(zone.id)}
              onMove={(points) => onMoveZone?.(zone.id, points)}
            />
          ))}
        </Layer>

        <Layer listening={false}>
          {movements.map((m) => {
            const from = toScreen(m.fromX, m.fromY);
            const to = toScreen(m.toX, m.toY);
            const style = ARROW_STYLE[m.type];
            return (
              <Arrow
                key={m.id}
                points={[from.x, from.y, to.x, to.y]}
                stroke={style.stroke}
                fill={style.stroke}
                strokeWidth={2.5}
                dash={style.dash}
                pointerLength={9}
                pointerWidth={8}
              />
            );
          })}
        </Layer>

        <Layer>
          {ballPos && (
            <Group
              x={toScreen(ballPos.x, ballPos.y).x}
              y={toScreen(ballPos.x, ballPos.y).y}
              draggable={!drawMode}
              onDragEnd={(e) => {
                const n = toNormalized(e.target.x(), e.target.y());
                onMoveBall(n.x, n.y);
              }}
              dragBoundFunc={(pt) => ({
                x: clamp(pt.x, 8, width - 8),
                y: clamp(pt.y, 8, height - 8),
              })}
            >
              <Circle radius={9} fill="#f8fafc" stroke="#1e293b" strokeWidth={1.5} />
              {Array.from({ length: 6 }).map((_, i) => (
                <Line
                  key={i}
                  points={[0, 0, 8 * Math.cos((i * Math.PI) / 3), 8 * Math.sin((i * Math.PI) / 3)]}
                  stroke="#1e293b"
                  strokeWidth={0.75}
                />
              ))}
            </Group>
          )}

          {pendingArrow && (
            <Circle
              x={toScreen(pendingArrow.from.x, pendingArrow.from.y).x}
              y={toScreen(pendingArrow.from.x, pendingArrow.from.y).y}
              radius={22}
              stroke="#facc15"
              strokeWidth={2}
              dash={[4, 4]}
              listening={false}
            />
          )}

          {roles.map((role) => {
            const rolePos = positions.find((p) => p.entityType === "OWN_ROLE" && p.setPieceRoleId === role.id);
            const pos = rolePos ?? { x: 0.5, y: 0.5 };
            const screenPos = toScreen(pos.x, pos.y);
            const label = role.resolvedPlayer ? String(role.resolvedPlayer.shirtNumber) : "?";
            const color = role.colorOverride ?? role.tacticalRole.color ?? "#38bdf8";
            const selected = role.id === selectedRoleId;
            return (
              <Group
                key={role.id}
                x={screenPos.x}
                y={screenPos.y}
                draggable={!drawMode}
                onClick={() => {
                  if (drawMode) {
                    setPendingArrow({ roleId: role.id, from: pos });
                  } else {
                    onSelectRole(role.id);
                  }
                }}
                onTap={() => onSelectRole(role.id)}
                onDragEnd={(e) => {
                  const n = toNormalized(e.target.x(), e.target.y());
                  onMoveRole(role.id, n.x, n.y);
                }}
                dragBoundFunc={(pt) => ({
                  x: clamp(pt.x, 12, width - 12),
                  y: clamp(pt.y, 12, height - 12),
                })}
              >
                <Circle
                  radius={16}
                  fill={color}
                  stroke={selected ? "#facc15" : "white"}
                  strokeWidth={selected ? 3 : 1.5}
                  shadowBlur={selected ? 8 : 0}
                  shadowColor="#facc15"
                />
                <Text
                  text={label}
                  fontSize={13}
                  fontStyle="bold"
                  fill="white"
                  width={32}
                  height={32}
                  align="center"
                  verticalAlign="middle"
                  offsetX={16}
                  offsetY={16}
                  listening={false}
                />
                <Text
                  text={role.label ?? role.tacticalRole.name}
                  fontSize={10}
                  fill="#e2e8f0"
                  width={130}
                  align="center"
                  offsetX={65}
                  y={20}
                  listening={false}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
});

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function ZoneShape({
  zone,
  toScreen,
  toNormalized,
  selected,
  interactive,
  onSelect,
  onMove,
}: {
  zone: SetPieceZone;
  toScreen: ToScreen;
  toNormalized: (sx: number, sy: number) => { x: number; y: number };
  selected: boolean;
  interactive: boolean;
  onSelect: () => void;
  onMove: (points: { x: number; y: number }[]) => void;
}) {
  const [p0, p1] = zone.points;
  const topLeftN = { x: Math.min(p0.x, p1.x), y: Math.min(p0.y, p1.y) };
  const bottomRightN = { x: Math.max(p0.x, p1.x), y: Math.max(p0.y, p1.y) };
  const topLeft = toScreen(topLeftN.x, topLeftN.y);
  const bottomRight = toScreen(bottomRightN.x, bottomRightN.y);
  const w = bottomRight.x - topLeft.x;
  const h = bottomRight.y - topLeft.y;

  return (
    <>
      <Group
        x={topLeft.x}
        y={topLeft.y}
        draggable={interactive}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          const newTopLeftN = toNormalized(e.target.x(), e.target.y());
          const dx = newTopLeftN.x - topLeftN.x;
          const dy = newTopLeftN.y - topLeftN.y;
          onMove([
            { x: topLeftN.x + dx, y: topLeftN.y + dy },
            { x: bottomRightN.x + dx, y: bottomRightN.y + dy },
          ]);
        }}
      >
        <Rect
          width={w}
          height={h}
          fill={zone.color}
          opacity={0.16}
          stroke={zone.color}
          strokeWidth={selected ? 2.5 : 1.5}
          dash={[7, 5]}
          cornerRadius={4}
        />
        <Text
          text={zone.name.toUpperCase()}
          fontSize={11}
          fontStyle="bold"
          fill={zone.color}
          x={5}
          y={5}
          listening={false}
        />
      </Group>
      {selected && interactive && (
        <Circle
          x={bottomRight.x}
          y={bottomRight.y}
          radius={6}
          fill="#facc15"
          stroke="#1e293b"
          strokeWidth={1}
          draggable
          onDragEnd={(e) => {
            const newBottomRightN = toNormalized(e.target.x(), e.target.y());
            onMove([topLeftN, newBottomRightN]);
          }}
        />
      )}
    </>
  );
}

function PitchMarkings({ toScreen }: { toScreen: ToScreen }) {
  const line = (p1: { x: number; y: number }, p2: { x: number; y: number }) => [p1.x, p1.y, p2.x, p2.y];

  const boxDepth = 16.5 / PITCH_LENGTH_M;
  const boxWidth = 40.32 / PITCH_WIDTH_M;
  const goalAreaDepth = 5.5 / PITCH_LENGTH_M;
  const goalAreaWidth = 18.32 / PITCH_WIDTH_M;
  const penaltySpotX = 11 / PITCH_LENGTH_M;
  const centerCircleR = 9.15 / PITCH_LENGTH_M;
  const cornerArc = 1 / PITCH_LENGTH_M;

  const topLeft = toScreen(0, 0);
  const bottomRight = toScreen(1, 1);

  return (
    <>
      <Rect
        x={Math.min(topLeft.x, bottomRight.x) - 400}
        y={Math.min(topLeft.y, bottomRight.y) - 400}
        width={Math.abs(bottomRight.x - topLeft.x) + 800}
        height={Math.abs(bottomRight.y - topLeft.y) + 800}
        fill="#0b3d24"
      />
      <Rect
        x={topLeft.x}
        y={topLeft.y}
        width={bottomRight.x - topLeft.x}
        height={bottomRight.y - topLeft.y}
        stroke="rgba(255,255,255,0.55)"
        strokeWidth={2}
      />

      <Line points={line(toScreen(0.5, 0), toScreen(0.5, 1))} stroke="rgba(255,255,255,0.55)" strokeWidth={2} />
      <CircleAt toScreen={toScreen} nx={0.5} ny={0.5} r={centerCircleR} />
      <DotAt toScreen={toScreen} nx={0.5} ny={0.5} />

      {/* Left goal */}
      <BoxAt toScreen={toScreen} x0={0} x1={boxDepth} y0={0.5 - boxWidth / 2} y1={0.5 + boxWidth / 2} />
      <BoxAt
        toScreen={toScreen}
        x0={0}
        x1={goalAreaDepth}
        y0={0.5 - goalAreaWidth / 2}
        y1={0.5 + goalAreaWidth / 2}
      />
      <DotAt toScreen={toScreen} nx={penaltySpotX} ny={0.5} />
      <ArcAt toScreen={toScreen} nx={boxDepth} ny={0.5} r={centerCircleR} rotation={-53} angle={106} />

      {/* Right goal (default attacking direction) */}
      <BoxAt toScreen={toScreen} x0={1 - boxDepth} x1={1} y0={0.5 - boxWidth / 2} y1={0.5 + boxWidth / 2} />
      <BoxAt
        toScreen={toScreen}
        x0={1 - goalAreaDepth}
        x1={1}
        y0={0.5 - goalAreaWidth / 2}
        y1={0.5 + goalAreaWidth / 2}
      />
      <DotAt toScreen={toScreen} nx={1 - penaltySpotX} ny={0.5} />
      <ArcAt toScreen={toScreen} nx={1 - boxDepth} ny={0.5} r={centerCircleR} rotation={127} angle={106} />

      {/* Corner arcs */}
      <ArcAt toScreen={toScreen} nx={0} ny={0} r={cornerArc} rotation={0} angle={90} />
      <ArcAt toScreen={toScreen} nx={1} ny={0} r={cornerArc} rotation={90} angle={90} />
      <ArcAt toScreen={toScreen} nx={0} ny={1} r={cornerArc} rotation={270} angle={90} />
      <ArcAt toScreen={toScreen} nx={1} ny={1} r={cornerArc} rotation={180} angle={90} />
    </>
  );
}

function BoxAt({
  toScreen,
  x0,
  x1,
  y0,
  y1,
}: {
  toScreen: ToScreen;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}) {
  const a = toScreen(x0, y0);
  const b = toScreen(x1, y1);
  return (
    <Rect
      x={Math.min(a.x, b.x)}
      y={Math.min(a.y, b.y)}
      width={Math.abs(b.x - a.x)}
      height={Math.abs(b.y - a.y)}
      stroke="rgba(255,255,255,0.55)"
      strokeWidth={2}
    />
  );
}

function DotAt({ toScreen, nx, ny }: { toScreen: ToScreen; nx: number; ny: number }) {
  const p = toScreen(nx, ny);
  return <Circle x={p.x} y={p.y} radius={3} fill="rgba(255,255,255,0.55)" />;
}

function CircleAt({ toScreen, nx, ny, r }: { toScreen: ToScreen; nx: number; ny: number; r: number }) {
  const center = toScreen(nx, ny);
  const edge = toScreen(nx + r, ny);
  return (
    <Circle
      x={center.x}
      y={center.y}
      radius={Math.abs(edge.x - center.x)}
      stroke="rgba(255,255,255,0.55)"
      strokeWidth={2}
    />
  );
}

function ArcAt({
  toScreen,
  nx,
  ny,
  r,
  rotation,
  angle,
}: {
  toScreen: ToScreen;
  nx: number;
  ny: number;
  r: number;
  rotation: number;
  angle: number;
}) {
  const center = toScreen(nx, ny);
  const edge = toScreen(nx + r, ny);
  return (
    <Arc
      x={center.x}
      y={center.y}
      innerRadius={Math.abs(edge.x - center.x)}
      outerRadius={Math.abs(edge.x - center.x)}
      angle={angle}
      rotation={rotation}
      stroke="rgba(255,255,255,0.55)"
      strokeWidth={2}
    />
  );
}
