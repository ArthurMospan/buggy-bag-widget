import React, { useCallback, useState } from 'react';
import type { DrawShape, PinElementContext, SubmitBugPayload } from '../types';
import { collectTechContext, getPinElementContext } from '../lib/collector';
import { capturePageScreenshot } from '../lib/screenshot';

interface MobileCaptureModeProps {
  apiKey: string;
  portalUrl?: string;
  onSend: (payload: SubmitBugPayload) => void;
  onCancel: () => void;
}

interface PendingPin {
  x: number;
  y: number;
  elementContext: PinElementContext | null;
  element: HTMLElement | null;
}

function resolvePageElement(x: number, y: number): HTMLElement | null {
  const els = document.elementsFromPoint(x, y);
  return (els.find(el =>
    !(el as HTMLElement).closest?.('[data-buggy-bag]') &&
    el !== document.documentElement &&
    el !== document.body
  ) as HTMLElement) ?? null;
}

/**
 * Minimal real-mobile capture flow: tap once on the page to drop a single
 * pin, write a short description, send. No rect/arrow/eraser/measure tools,
 * no kebab menu, no debug overlays — those are mouse-driven and don't carry
 * over to touch input. Reuses the same SubmitBugPayload / tech_context
 * pipeline as the full desktop CaptureMode (via collectTechContext /
 * getPinElementContext / capturePageScreenshot), so the portal renders these
 * reports identically to desktop ones.
 */
export function MobileCaptureMode({ apiKey, onSend, onCancel }: MobileCaptureModeProps) {
  const [pin, setPin] = useState<PendingPin | null>(null);
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  const handleTap = useCallback((e: React.MouseEvent) => {
    if (pin) return; // pin already placed — use "Назад" to retarget instead of jumping on stray taps
    const { clientX: x, clientY: y } = e;
    setPin({ x, y, elementContext: getPinElementContext(x, y), element: resolvePageElement(x, y) });
  }, [pin]);

  const handleBack = useCallback(() => setPin(null), []);

  const handleConfirm = useCallback(async () => {
    if (!pin || sending) return;
    setSending(true);
    try {
      // capturePageScreenshot hides the whole widget host (this UI included)
      // while it snapshots, so the pin marker / sheet never end up in the shot.
      const imageUrl = await capturePageScreenshot();
      const shapeId = `pin-${Date.now()}`;
      const shape: DrawShape = {
        id: shapeId,
        type: 'pin',
        x: pin.x,
        y: pin.y,
        pinNumber: 1,
        elementContext: pin.elementContext ?? undefined,
      };
      const techContext = collectTechContext(pin.element);
      const text = description.trim() || 'Без опису';
      onSend({
        api_key: apiKey,
        base64_image: imageUrl,
        shapes: [shape],
        annotations: { [shapeId]: text },
        description: text,
        tech_context: techContext,
      });
    } finally {
      setSending(false);
    }
  }, [pin, description, sending, apiKey, onSend]);

  return (
    <div data-buggy-bag="true" style={{ position: 'fixed', inset: 0, zIndex: 9998, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Tap-catcher — transparent, lets the real page show through */}
      <div
        onClick={handleTap}
        style={{ position: 'absolute', inset: 0, background: 'transparent', cursor: pin ? 'default' : 'crosshair' }}
      />

      {/* Close button — always available */}
      <button
        type="button"
        onClick={onCancel}
        aria-label="Скасувати"
        style={{
          position: 'fixed', top: '12px', right: '12px', width: '36px', height: '36px',
          borderRadius: '50%', background: 'rgba(28,28,30,0.85)', color: 'white', border: 'none',
          fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', backdropFilter: 'blur(6px)',
        }}
      >
        ✕
      </button>

      {!pin && (
        <div style={{
          position: 'fixed', top: '12px', left: '12px', right: '56px',
          background: 'rgba(28,28,30,0.85)', color: 'white', borderRadius: '12px',
          padding: '10px 14px', fontSize: '13px', fontWeight: 600, lineHeight: 1.4,
          backdropFilter: 'blur(6px)',
        }}>
          Натисніть на місце проблеми на сторінці
        </div>
      )}

      {pin && (
        <>
          {/* Pin marker over the live page */}
          <div style={{
            position: 'fixed', left: pin.x, top: pin.y, width: '36px', height: '36px',
            marginLeft: '-18px', marginTop: '-18px', borderRadius: '50%',
            background: 'rgba(79,70,229,0.25)', border: '3px solid rgb(79,70,229)',
            pointerEvents: 'none', boxShadow: '0 0 0 4px rgba(79,70,229,0.15)',
          }} />

          {/* Bottom sheet — description + actions */}
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: 0,
            background: '#1c1c1e', borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
            padding: '16px 16px calc(16px + env(safe-area-inset-bottom, 0px))',
            boxShadow: '0 -8px 24px rgba(0,0,0,0.3)',
          }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
              Що не так?
            </div>
            <textarea
              autoFocus
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Опишіть проблему…"
              rows={3}
              style={{
                width: '100%', resize: 'none', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.08)', color: 'white',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
                padding: '10px 12px', fontSize: '14px', fontFamily: 'inherit',
                outline: 'none', marginBottom: '12px',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleBack}
                disabled={sending}
                style={{
                  flex: '0 0 auto', background: 'transparent', color: 'rgba(255,255,255,0.6)',
                  border: 'none', padding: '12px 14px', fontSize: '14px', fontWeight: 600,
                  cursor: sending ? 'default' : 'pointer',
                }}
              >
                Назад
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={sending}
                style={{
                  flex: 1, background: sending ? 'rgba(79,70,229,0.5)' : 'rgb(79,70,229)', color: 'white',
                  border: 'none', borderRadius: '12px', padding: '12px 14px', fontSize: '14px', fontWeight: 700,
                  cursor: sending ? 'default' : 'pointer',
                }}
              >
                {sending ? 'Надсилання…' : 'Відправити'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
