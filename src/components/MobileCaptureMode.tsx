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
  const [localAttachments, setLocalAttachments] = useState<{ name: string; type: string; base64: string }[]>([]);
  const [showHint, setShowHint] = useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 5000);
    return () => clearTimeout(timer);
  }, []);

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
      const { imageUrl, fallbackUsed, renderer } = await capturePageScreenshot();
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
      techContext.screenshotRenderer = renderer;
      let text = description.trim() || 'Без опису';
      if (fallbackUsed) {
        text += '\n\n⚠️ Увага: Цей скріншот було зроблено у спрощеному режимі (fallback), тому деякі шрифти або картинки можуть бути відсутні через налаштування безпеки сайту (CORS).';
      }
      
      onSend({
        api_key: apiKey,
        base64_image: imageUrl,
        shapes: [shape],
        annotations: { [shapeId]: text },
        shape_attachments: localAttachments.length > 0 ? { [shapeId]: localAttachments } : undefined,
        description: text,
        tech_context: techContext,
      });
    } finally {
      setSending(false);
    }
  }, [pin, description, sending, apiKey, onSend, localAttachments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    Promise.all(files.map(file => new Promise<{ name: string; type: string; base64: string }>(resolve => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve({ name: file.name, type: file.type, base64: ev.target?.result as string });
      reader.readAsDataURL(file);
    }))).then(newAttachments => {
      setLocalAttachments(prev => [...prev, ...newAttachments]);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
          position: 'fixed', bottom: '24px', right: '24px', width: '48px', height: '48px',
          borderRadius: '50%', background: 'rgba(28,28,30,0.85)', color: 'white', 
          border: '1px solid rgba(255,255,255,0.15)', fontSize: '20px', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer', 
          backdropFilter: 'blur(6px)', boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
          zIndex: 9999
        }}
      >
        ✕
      </button>

      {!pin && showHint && (
        <div style={{
          position: 'fixed', bottom: '30px', left: '24px', right: '84px',
          background: 'rgba(28,28,30,0.85)', color: 'white', borderRadius: '12px',
          padding: '10px 14px', fontSize: '13px', fontWeight: 600, lineHeight: 1.4,
          backdropFilter: 'blur(6px)', textAlign: 'center'
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

            {localAttachments.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                {localAttachments.map((att, i) => (
                  <div key={i} style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {att.type.startsWith('image/') ? (
                      <img src={att.base64} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '11px', color: 'white', fontWeight: 'bold' }}>{att.name.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setLocalAttachments(p => p.filter((_, idx) => idx !== i))}
                      style={{ position: 'absolute', top: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '0 0 0 6px', width: '20px', height: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple onChange={handleFileChange} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                title="Прикріпити файли"
                style={{
                  flex: '0 0 auto', background: 'rgba(255,255,255,0.08)', color: 'white',
                  border: 'none', borderRadius: '12px', width: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: sending ? 'default' : 'pointer',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
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
