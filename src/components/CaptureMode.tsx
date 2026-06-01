import React, { useEffect, useState, useCallback, useRef } from 'react';
import { toPng } from 'html-to-image';
import type { DrawShape, DrawTool, SubmitBugPayload } from '../types';
import { DrawingCanvas } from './DrawingCanvas';
import { collectTechContext } from '../lib/collector';

interface CaptureModeProps {
  initialTool: DrawTool;
  apiKey: string;
  onSend: (payload: SubmitBugPayload) => void;
  onCancel: () => void;
}

function ToolBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={title} style={{ width: '34px', height: '34px', borderRadius: '8px', background: active ? '#1f1f1f' : 'transparent', border: 'none', cursor: 'pointer', color: active ? 'white' : '#9a9a9a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </button>
  );
}

export function CaptureMode({ initialTool, apiKey, onSend, onCancel }: CaptureModeProps) {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [tool, setTool] = useState<DrawTool>(initialTool);
  const [shapes, setShapes] = useState<DrawShape[]>([]);
  const [description, setDescription] = useState('');
  const [showSendPanel, setShowSendPanel] = useState(false);
  const techContextRef = useRef(collectTechContext());
  const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const dataUrl = await toPng(document.body, {
          filter: (el: Element) => el.getAttribute?.('data-buggy-bag') !== 'true',
          width: window.innerWidth, height: window.innerHeight,
          pixelRatio: 1, skipFonts: true,
        });
        if (!cancelled) setScreenshotUrl(dataUrl);
      } catch (err) {
        console.error('[BuggyBag] screenshot failed:', err);
        if (!cancelled) onCancel();
      }
    }, 80);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [onCancel]);

  const handleShapeComplete = useCallback((shape: DrawShape) => {
    setShapes(prev => [...prev, shape]);
  }, []);

  const handleSend = useCallback(() => {
    if (!screenshotUrl) return;
    onSend({
      api_key: apiKey,
      base64_image: screenshotUrl,
      shapes,
      annotations: {},
      description: description.trim() || 'Без опису',
      tech_context: techContextRef.current,
    });
  }, [screenshotUrl, shapes, description, apiKey, onSend]);

  return (
    <div data-buggy-bag="true" style={{ position: 'fixed', inset: 0, zIndex: 10000, userSelect: 'none' }}>

      {/* Screenshot or loading */}
      {screenshotUrl ? (
        <img src={screenshotUrl} alt="screenshot" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} draggable={false} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px', fontWeight: '600' }}>⏸ Заморожую сторінку...</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Збираю технічний контекст</span>
        </div>
      )}

      {/* Drawing canvas */}
      {screenshotUrl && !showSendPanel && (
        <DrawingCanvas width={w} height={h} tool={tool} shapes={shapes} onShapeComplete={handleShapeComplete} />
      )}

      {/* Mini toolbar bottom-right */}
      {screenshotUrl && !showSendPanel && (
        <div data-buggy-bag="true" style={{ position: 'fixed', bottom: '24px', right: '24px', background: 'white', borderRadius: '14px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', padding: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ToolBtn active={tool === 'rect'} onClick={() => setTool('rect')} title="Область">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          </ToolBtn>
          <ToolBtn active={tool === 'arrow'} onClick={() => setTool('arrow')} title="Стрілка">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 19L19 5"/><path d="M8 5h11v11"/></svg>
          </ToolBtn>
          <ToolBtn active={tool === 'pin'} onClick={() => setTool('pin')} title="Пін">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="2.5"/></svg>
          </ToolBtn>
          <div style={{ width: '1px', height: '20px', background: '#e9e9e9', margin: '0 2px' }} />
          <button type="button" onClick={() => setShowSendPanel(true)} style={{ height: '32px', padding: '0 14px', borderRadius: '8px', background: '#1f1f1f', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
            Далі →
          </button>
          <button type="button" onClick={onCancel} style={{ height: '32px', padding: '0 10px', borderRadius: '8px', background: 'transparent', color: '#9a9a9a', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
            ✕
          </button>
        </div>
      )}

      {/* Send panel — appears once, single description field */}
      {screenshotUrl && showSendPanel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '24px' }}>
          <div style={{ width: '100%', maxWidth: '480px', margin: '0 16px', background: '#1c1c1e', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', padding: '16px' }}>

            {/* Auto-collected context chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                {techContextRef.current.route}
              </span>
              {techContextRef.current.component && (
                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#a5b4fc', background: 'rgba(99,102,241,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                  {techContextRef.current.component.name}
                </span>
              )}
              {techContextRef.current.networkRequests.filter(r => r.isError).slice(0, 2).map((r, i) => (
                <span key={i} style={{ fontSize: '10px', fontFamily: 'monospace', color: '#fca5a5', background: 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                  {r.status} {r.url.split('/').slice(-1)[0]}
                </span>
              ))}
              {techContextRef.current.consoleErrors.length > 0 && (
                <span style={{ fontSize: '10px', color: '#fcd34d', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                  {techContextRef.current.consoleErrors.length} console error
                </span>
              )}
            </div>

            {/* Single description field */}
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Опишіть що не так..."
              autoFocus
              rows={3}
              style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', color: 'white', resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />

            {/* Steps from event log */}
            {techContextRef.current.eventLog.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                  Кроки відтворення (авто)
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '7px 10px', maxHeight: '72px', overflowY: 'auto' }}>
                  {techContextRef.current.eventLog.slice(-5).map((e, i) => (
                    <div key={i} style={{ fontSize: '11px', fontFamily: 'monospace', color: e.type === 'console_error' || e.type === 'network_error' ? '#fca5a5' : 'rgba(255,255,255,0.4)', lineHeight: '1.6' }}>
                      {i + 1}. {e.description}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button type="button" onClick={() => setShowSendPanel(false)} style={{ padding: '9px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)' }}>
                ← Назад
              </button>
              <button type="button" onClick={onCancel} style={{ padding: '9px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)' }}>
                ✕
              </button>
              <button type="button" onClick={handleSend} style={{ flex: 1, padding: '9px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer' }}>
                Надіслати на портал →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
