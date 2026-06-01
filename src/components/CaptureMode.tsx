import React, { useEffect, useState, useCallback } from 'react';
import type { Bug, DrawShape, DrawTool } from '../types';
import { DrawingCanvas } from './DrawingCanvas';
import { DrawingToolbar } from './DrawingToolbar';
import { ShapeAnnotation } from './ShapeAnnotation';

interface CaptureModeProps {
  onSave: (data: Omit<Bug, 'id' | 'createdAt' | 'status'>) => void;
  onCancel: () => void;
}

export function CaptureMode({ onSave, onCancel }: CaptureModeProps) {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [tool, setTool] = useState<DrawTool>('rect');
  const [shapes, setShapes] = useState<DrawShape[]>([]);
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  const [pendingShape, setPendingShape] = useState<DrawShape | null>(null);

  // Compute dimensions inside the component for SSR safety
  const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(document.body, {
          useCORS: true,
          allowTaint: true,
          logging: false,
          ignoreElements: (el: Element) =>
            el.getAttribute('data-buggy-bag') === 'true',
        });
        if (!cancelled) {
          setScreenshotUrl(canvas.toDataURL('image/png'));
        }
      } catch {
        if (!cancelled) {
          // Screenshot failed — close the capture mode gracefully
          onCancel();
        }
      }
    }, 80);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [onCancel]);

  const handleShapeComplete = useCallback((shape: DrawShape) => {
    setShapes((prev) => [...prev, shape]);
    setPendingShape(shape);
  }, []);

  const handleAnnotationConfirm = useCallback(
    (shapeId: string, text: string) => {
      setAnnotations((prev) => ({ ...prev, [shapeId]: text }));
      setPendingShape(null);
    },
    []
  );

  const handleAnnotationDismiss = useCallback(() => {
    // Remove the pending shape (user cancelled the annotation)
    setPendingShape((pending) => {
      if (pending) {
        setShapes((prev) => prev.filter((s) => s.id !== pending.id));
      }
      return null;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!screenshotUrl) return;
    onSave({ screenshotDataUrl: screenshotUrl, shapes, annotations });
  }, [screenshotUrl, shapes, annotations, onSave]);

  return (
    <div
      data-buggy-bag="true"
      className="fixed inset-0 z-[10000]"
      style={{ userSelect: 'none' }}
    >
      {/* Screenshot background */}
      {screenshotUrl ? (
        <img
          src={screenshotUrl}
          alt="Page screenshot"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <span
          role="status"
          aria-live="polite"
          className="text-white text-[16px] font-bold animate-pulse"
        >
            Знімок екрану...
          </span>
        </div>
      )}

      {/* Drawing canvas — hidden while annotation popup is open */}
      {screenshotUrl && !pendingShape && (
        <DrawingCanvas
          width={w}
          height={h}
          tool={tool}
          shapes={shapes}
          onShapeComplete={handleShapeComplete}
        />
      )}

      {/* Annotation popup — appears when a shape has just been drawn */}
      {pendingShape && (
        <ShapeAnnotation
          shape={pendingShape}
          containerWidth={w}
          containerHeight={h}
          onConfirm={handleAnnotationConfirm}
          onDismiss={handleAnnotationDismiss}
        />
      )}

      {/* Toolbar — always visible while screenshot is ready */}
      {screenshotUrl && (
        <DrawingToolbar
          activeTool={tool}
          onToolChange={setTool}
          onSave={handleSave}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}
