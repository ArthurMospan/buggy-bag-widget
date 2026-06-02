import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect, Arrow, Circle, Text, Group, Line } from 'react-konva';
import type Konva from 'konva';
import type { DrawShape, DrawTool } from '../types';

interface DrawingCanvasProps {
  width: number;
  height: number;
  tool: DrawTool;
  shapes: DrawShape[];
  onShapeComplete: (shape: DrawShape) => void;
  onMouseMove?: (x: number, y: number) => void;
}

// Module-level counter so pin numbers are unique across re-renders
let pinCounter = 1;

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function getStagePos(e: Konva.KonvaEventObject<MouseEvent>): { x: number; y: number } {
  const pos = e.target.getStage()?.getPointerPosition();
  return pos ?? { x: 0, y: 0 };
}

export function DrawingCanvas({
  width,
  height,
  tool,
  shapes,
  onShapeComplete,
  onMouseMove,
}: DrawingCanvasProps) {
  // useRef for values that change on every mouse event but must NOT trigger re-renders
  const isDrawing = useRef(false);
  const origin = useRef({ x: 0, y: 0 });

  // useState only for the in-progress draft shape (triggers Konva re-render)
  const [draft, setDraft] = useState<DrawShape | null>(null);
  const draftRef = useRef<DrawShape | null>(null);

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Ignore right-click
      if (e.evt.button !== 0) return;

      const { x, y } = getStagePos(e);
      isDrawing.current = true;
      origin.current = { x, y };

      // Pins are single-click — complete immediately, no drag needed
      if (tool === 'pin') {
        onShapeComplete({
          id: uid(),
          type: 'pin',
          x,
          y,
          pinNumber: pinCounter++,
        });
        isDrawing.current = false;
        return;
      }

      // Start a rect, arrow, or measure draft
      const newDraft: DrawShape = {
        id: uid(),
        type: tool,
        x,
        y,
        ...(tool === 'rect'
          ? { width: 0, height: 0 }
          : { points: [x, y, x, y] as [number, number, number, number] }),
      };
      draftRef.current = newDraft;
      setDraft(newDraft);
    },
    [tool, onShapeComplete]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const { x, y } = getStagePos(e);
      onMouseMove?.(Math.round(x), Math.round(y));

      if (!isDrawing.current || !draftRef.current) return;

      let updated: DrawShape | null = null;

      if (tool === 'rect') {
        updated = { ...draftRef.current, width: x - origin.current.x, height: y - origin.current.y };
      } else if (tool === 'arrow' || tool === 'measure') {
        updated = {
          ...draftRef.current,
          points: [origin.current.x, origin.current.y, x, y] as [number, number, number, number],
        };
      }

      if (updated) {
        draftRef.current = updated;
        setDraft(updated);
      }
    },
    [tool, onMouseMove]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current || !draftRef.current) return;
    isDrawing.current = false;
    const current = draftRef.current;
    draftRef.current = null;

    const tooSmall =
      (current.type === 'rect' &&
        Math.abs(current.width ?? 0) < 8 &&
        Math.abs(current.height ?? 0) < 8) ||
      (current.type === 'arrow' &&
        current.points !== undefined &&
        Math.hypot(
          current.points[2] - current.points[0],
          current.points[3] - current.points[1]
        ) < 8);

    if (!tooSmall) onShapeComplete(current);
    setDraft(null);
  }, [onShapeComplete]);

  // Also handle mouse-up outside the stage (prevents ghost drafts if user releases outside)
  const handleMouseLeave = useCallback(() => {
    if (!isDrawing.current || !draftRef.current) return;
    isDrawing.current = false;
    const current = draftRef.current;
    draftRef.current = null;

    const tooSmall =
      (current.type === 'rect' &&
        Math.abs(current.width ?? 0) < 8 &&
        Math.abs(current.height ?? 0) < 8) ||
      (current.type === 'arrow' &&
        current.points !== undefined &&
        Math.hypot(
          current.points[2] - current.points[0],
          current.points[3] - current.points[1]
        ) < 8);

    if (!tooSmall) onShapeComplete(current);
    setDraft(null);
  }, [onShapeComplete]);

  // Clean up draft if mouse is released outside the browser window
  useEffect(() => {
    const onWindowMouseUp = () => {
      if (isDrawing.current && draftRef.current) {
        isDrawing.current = false;
        const current = draftRef.current;
        draftRef.current = null;
        const tooSmall =
          (current.type === 'rect' &&
            Math.abs(current.width ?? 0) < 8 &&
            Math.abs(current.height ?? 0) < 8) ||
          (current.type === 'arrow' &&
            current.points !== undefined &&
            Math.hypot(
              current.points[2] - current.points[0],
              current.points[3] - current.points[1]
            ) < 8);
        if (!tooSmall) onShapeComplete(current);
        setDraft(null);
      }
    };
    window.addEventListener('mouseup', onWindowMouseUp);
    return () => window.removeEventListener('mouseup', onWindowMouseUp);
  }, [onShapeComplete]);

  return (
    <Stage
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, cursor: 'crosshair' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <Layer>
        {/* Committed shapes */}
        {shapes.map(renderShape)}
        {/* Live draft shape while dragging */}
        {draft && renderShape(draft)}
      </Layer>
    </Stage>
  );
}

function renderShape(s: DrawShape): React.ReactElement | null {
  if (s.type === 'rect') {
    return (
      <Rect
        key={s.id}
        x={s.x}
        y={s.y}
        width={s.width ?? 0}
        height={s.height ?? 0}
        stroke="#ef4444"
        strokeWidth={2}
        fill="rgba(239,68,68,0.08)"
        dash={[6, 3]}
        listening={false}
      />
    );
  }

  if (s.type === 'arrow') {
    return (
      <Arrow
        key={s.id}
        points={s.points ? [...s.points] : []}
        stroke="#ef4444"
        strokeWidth={2.5}
        fill="#ef4444"
        pointerLength={10}
        pointerWidth={8}
        listening={false}
      />
    );
  }

  if (s.type === 'pin') {
    return (
      <Group key={s.id} x={s.x} y={s.y} listening={false}>
        <Circle radius={14} fill="#ef4444" />
        <Text
          text={String(s.pinNumber ?? '?')}
          fontSize={12}
          fontStyle="bold"
          fill="white"
          align="center"
          verticalAlign="middle"
          x={-14}
          y={-8}
          width={28}
          height={16}
        />
      </Group>
    );
  }

  if (s.type === 'measure' && s.points) {
    const [x1, y1, x2, y2] = s.points;
    const dist = Math.round(Math.hypot(x2 - x1, y2 - y1));
    const dx = Math.abs(Math.round(x2 - x1));
    const dy = Math.abs(Math.round(y2 - y1));
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const label = `${dist}px  (${dx} × ${dy})`;
    return (
      <Group key={s.id} listening={false}>
        <Line points={[x1, y1, x2, y2]} stroke="#f59e0b" strokeWidth={2} dash={[6, 3]} />
        {/* end caps */}
        <Line points={[x1 - 5, y1, x1 + 5, y1]} stroke="#f59e0b" strokeWidth={2} rotation={Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI} offsetX={0} />
        <Line points={[x2 - 5, y2, x2 + 5, y2]} stroke="#f59e0b" strokeWidth={2} />
        {/* label background */}
        <Rect x={mx - 52} y={my - 11} width={104} height={22} fill="rgba(0,0,0,0.7)" cornerRadius={6} />
        <Text text={label} x={mx - 50} y={my - 8} fontSize={11} fontStyle="bold" fill="#f59e0b" fontFamily="monospace" align="center" width={100} />
      </Group>
    );
  }

  return null;
}
