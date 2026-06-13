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
  onShapeDelete?: (id: string) => void;
  onMouseMove?: (x: number, y: number) => void;
  onMouseLeave?: () => void;
  onShapeClick?: (id: string) => void;
  onShapeMove?: (id: string, dx: number, dy: number) => void;
  /** When false, canvas renders shapes but ignores mouse events (e.g. when popup is open) */
  interactive?: boolean;
}



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
  onShapeDelete,
  onMouseMove,
  onMouseLeave,
  onShapeClick,
  onShapeMove,
  interactive = true,
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
      
      const target = e.target;
      const isPin = target.parent?.name() === 'pin-circle' || target.name() === 'pin-circle';
      if (isPin) return;

      const { x, y } = getStagePos(e);
      if (tool === 'eraser') return; // no drawing in eraser mode
      isDrawing.current = true;
      origin.current = { x, y };

      const nextPin = Math.max(0, ...shapes.map(s => s.pinNumber || 0)) + 1;

      if (tool === 'pin') {
        const newShape: DrawShape = { id: uid(), type: 'pin', x, y, pinNumber: nextPin };
        onShapeComplete(newShape);
        isDrawing.current = false;
      } else if (tool === 'rect') {
        const d: DrawShape = { id: uid(), type: 'rect', x, y, width: 0, height: 0, pinNumber: nextPin };
        draftRef.current = d;
        setDraft(d);
      } else if (tool === 'arrow') {
        const d: DrawShape = { id: uid(), type: 'arrow', x, y, points: [x, y, x, y], pinNumber: nextPin };
        draftRef.current = d;
        setDraft(d);
      } else if (tool === 'measure') {
        const d: DrawShape = { id: uid(), type: 'measure', x, y, points: [x, y, x, y], pinNumber: nextPin };
        draftRef.current = d;
        setDraft(d);
      }
    },
    [tool, onShapeComplete, shapes]
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
    onMouseLeave?.();
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
  }, [onShapeComplete, onMouseLeave]);

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

  let cursorStyle = 'default';
  if (interactive) {
    if (tool === 'eraser') {
      cursorStyle = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='8' fill='rgba(255,255,255,0.5)' stroke='black' stroke-width='2'/%3E%3C/svg%3E") 12 12, crosshair`;
    } else if (tool === 'measure') {
      cursorStyle = 'crosshair';
    } else if (tool === 'eyedropper') {
      cursorStyle = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m2 22 1-1h3l9-9' stroke='white' stroke-width='4'/%3E%3Cpath d='m2 22 1-1h3l9-9'/%3E%3Cpath d='M3 21v-3l9-9' stroke='white' stroke-width='4'/%3E%3Cpath d='M3 21v-3l9-9'/%3E%3Cpath d='m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z' fill='white'/%3E%3C/svg%3E") 2 22, crosshair`;
    } else {
      cursorStyle = 'crosshair';
    }
  }

  return (
    <Stage
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0, cursor: cursorStyle, pointerEvents: interactive ? 'auto' : 'none', zIndex: 10001 }}
      onMouseDown={interactive ? handleMouseDown : undefined}
      onMouseMove={interactive ? handleMouseMove : undefined}
      onMouseUp={interactive ? handleMouseUp : undefined}
      onMouseLeave={interactive ? handleMouseLeave : undefined}
    >
      <Layer>
        {/* Committed shapes */}
        {shapes.map(s => renderShape(s, tool, interactive, onShapeDelete, onShapeClick, onShapeMove))}
        {/* Live draft shape while dragging */}
        {interactive && draft && renderShape(draft, tool, interactive, undefined, onShapeClick, undefined)}
      </Layer>
    </Stage>
  );
}

function renderShape(
  s: DrawShape, 
  tool: DrawTool, 
  interactive: boolean,
  onDelete?: (id: string) => void, 
  onShapeClick?: (id: string) => void,
  onShapeMove?: (id: string, dx: number, dy: number) => void
): React.ReactElement | null {
  const isEraser = tool === 'eraser';
  const isDraggable = !isEraser && !!onShapeMove && interactive;
  
  // Main shape outline handlers
  const handleShapeEnter = (e: any) => { if (isEraser) { e.target.opacity(0.4); e.target.getLayer().draw(); e.target.getStage()!.container().style.cursor = 'pointer'; } };
  const handleShapeLeave = (e: any) => { if (isEraser) { e.target.opacity(1); e.target.getLayer().draw(); e.target.getStage()!.container().style.cursor = 'crosshair'; } };
  const handleShapeClickEvent = (e: any) => { if (isEraser && onDelete) { e.cancelBubble = true; onDelete(s.id); e.target.getStage()!.container().style.cursor = 'crosshair'; } };
  const shapeListeners = {
    listening: isEraser,
    onMouseEnter: handleShapeEnter,
    onMouseLeave: handleShapeLeave,
    onClick: handleShapeClickEvent,
    onTap: handleShapeClickEvent,
  };

  // Pin handlers (always interactive)
  const handlePinEnter = (e: any) => {
    e.target.getStage()!.container().style.cursor = 'pointer';
    const group = e.target.parent;
    if (group) {
      group.scale({ x: 1.15, y: 1.15 });
    }
    if (isEraser) { e.target.opacity(0.4); e.target.getLayer().draw(); }
  };
  const handlePinLeave = (e: any) => {
    e.target.getStage()!.container().style.cursor = 'crosshair';
    const group = e.target.parent;
    if (group) {
      group.scale({ x: 1, y: 1 });
    }
    if (isEraser) { e.target.opacity(1); e.target.getLayer().draw(); }
  };
  const handlePinClickEvent = (e: any) => {
    e.cancelBubble = true;
    if (e.evt) {
      e.evt.stopPropagation();
      e.evt.preventDefault();
    }
    if (isEraser && onDelete) { onDelete(s.id); e.target.getStage()!.container().style.cursor = 'crosshair'; }
    else if (!isEraser && onShapeClick) { onShapeClick(s.id); e.target.getStage()!.container().style.cursor = 'crosshair'; }
  };
  const pinListeners = {
    listening: true,
    onMouseEnter: handlePinEnter,
    onMouseLeave: handlePinLeave,
    onClick: handlePinClickEvent,
    onTap: handlePinClickEvent,
  };

  const handleDragEnd = (e: any) => {
    const dx = e.target.x();
    const dy = e.target.y();
    if (dx === 0 && dy === 0) return;
    
    e.target.position({ x: 0, y: 0 });
    e.target.getLayer().batchDraw();

    if (onShapeMove) onShapeMove(s.id, dx, dy);
  };

  let pinX = s.x;
  let pinY = s.y;
  if (s.type === 'arrow' || s.type === 'measure') {
    if (s.points && s.points.length >= 2) {
      pinX = s.points[0];
      pinY = s.points[1];
    }
  }

  const pinCircle = (
    <Group key={s.id + '_pin_inner'} name="pin-circle" x={pinX} y={pinY} {...pinListeners}>
      <Circle radius={14} fill="#ef4444" />
      <Text
        text={String(s.pinNumber ?? '?')}
        fontSize={13}
        fill="white"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontStyle="bold"
        align="center"
        verticalAlign="middle"
        x={-14} y={-6.5} width={28}
      />
    </Group>
  );

  if (s.type === 'pin') {
    return (
      <Group key={s.id} draggable={isDraggable} onDragEnd={handleDragEnd}>
        {pinCircle}
      </Group>
    );
  }

  if (s.type === 'rect') {
    return (
      <Group key={s.id} draggable={isDraggable} onDragEnd={handleDragEnd}>
        <Rect
          x={s.x} y={s.y} width={s.width ?? 0} height={s.height ?? 0}
          stroke="#ef4444" strokeWidth={4} dash={[8, 8]}
          {...shapeListeners}
        />
        {pinCircle}
      </Group>
    );
  }

  if (s.type === 'arrow') {
    return (
      <Group key={s.id} draggable={isDraggable} onDragEnd={handleDragEnd}>
        <Arrow
          points={s.points!} stroke="#ef4444" fill="#ef4444"
          strokeWidth={4} pointerLength={10} pointerWidth={10}
          {...shapeListeners}
        />
        {pinCircle}
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
      <Group key={s.id} draggable={isDraggable} onDragEnd={handleDragEnd}>
        <Group {...shapeListeners}>
          <Line points={[x1, y1, x2, y2]} stroke="#f59e0b" strokeWidth={2} dash={[6, 3]} />
          <Line points={[x1 - 5, y1, x1 + 5, y1]} stroke="#f59e0b" strokeWidth={2} rotation={Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI} offsetX={0} />
          <Line points={[x2 - 5, y2, x2 + 5, y2]} stroke="#f59e0b" strokeWidth={2} />
          <Rect x={mx - 52} y={my - 11} width={104} height={22} fill="rgba(0,0,0,0.7)" cornerRadius={6} />
          <Text text={label} x={mx - 50} y={my - 8} fontSize={11} fontStyle="bold" fill="#f59e0b" fontFamily="monospace" align="center" width={100} />
        </Group>
        {pinCircle}
      </Group>
    );
  }

  return null;
}
