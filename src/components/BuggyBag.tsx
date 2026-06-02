import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GodModeGuard } from '../guard';
import { CaptureMode } from './CaptureMode';
import { initCollector } from '../lib/collector';
import type { SubmitBugPayload, DrawTool } from '../types';
import widgetStyles from '../styles.gen';

export interface BuggyBagProps {
  apiEndpoint?: string;
  apiKey?: string;
  portalUrl?: string;
}

function RectIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
}
function ArrowIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19L19 5"/><path d="M8 5h11v11"/></svg>;
}
function PinIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>;
}
function BugIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.88 1.88"/><path d="M14.12 3.88L16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>;
}

const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

function EyeDropperIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 1 3 3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1 3-3z"/>
      <path d="m19 11-8 8-1.5 1.5a1.5 1.5 0 0 1-2.1 0l-2.9-2.9a1.5 1.5 0 0 1 0-2.1L6 14l8-8"/>
      <path d="m17 9 2-2 2 2-2 2z"/>
      <path d="M4 20 2 22"/>
    </svg>
  );
}

function BuggyBagInner({ apiEndpoint, apiKey, portalUrl }: BuggyBagProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTool, setActiveTool] = useState<DrawTool | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean; color?: string } | null>(null);

  useEffect(() => { initCollector(); }, []);

  useEffect(() => {
    const handler = () => { setExpanded(v => !v); setActiveTool(null); };
    const escHandler = () => { setExpanded(false); setActiveTool(null); };
    window.addEventListener('buggy-bag:toggle', handler);
    window.addEventListener('buggy-bag:escape', escHandler);
    return () => {
      window.removeEventListener('buggy-bag:toggle', handler);
      window.removeEventListener('buggy-bag:escape', escHandler);
    };
  }, []);

  const handleToolSelect = (tool: DrawTool) => {
    setExpanded(false);
    setActiveTool(tool);
  };

  const handleEyeDropper = async () => {
    setExpanded(false);
    try {
      const dropper = new (window as any).EyeDropper();
      const result = await dropper.open();
      const hex = result.sRGBHex.toUpperCase();
      await navigator.clipboard.writeText(hex).catch(() => {});
      setToast({ msg: hex, ok: true, color: hex });
      setTimeout(() => setToast(null), 5000);
    } catch {
      // user cancelled — do nothing
    }
  };

  const handleSend = async (payload: SubmitBugPayload) => {
    setActiveTool(null);
    if (!apiEndpoint || !apiKey) { showToast('Відправлено (без API)', true); return; }
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, api_key: apiKey }),
      });
      showToast(res.ok ? '✓ Відправлено' : '⚠ Помилка сервера', res.ok);
    } catch {
      showToast('⚠ Не вдалось відправити', false);
    }
  };

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const tools: { tool: DrawTool; icon: React.ReactNode; title: string }[] = [
    { tool: 'rect',  icon: <RectIcon />,  title: 'Виділити область' },
    { tool: 'arrow', icon: <ArrowIcon />, title: 'Намалювати стрілку' },
    { tool: 'pin',   icon: <PinIcon />,   title: 'Поставити пін' },
  ];

  return (
    <>
      {!activeTool && (
        <div data-buggy-bag="true" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9997 }}>
          {expanded ? (
            // Same dark pill style as CaptureMode toolbar
            <div style={{
              background: 'rgba(31,31,31,0.95)', backdropFilter: 'blur(10px)',
              borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)',
              padding: '8px', display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              {tools.map(({ tool, icon, title }) => (
                <button key={tool} type="button" onClick={() => handleToolSelect(tool)} title={title}
                  style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9a9a9a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)', e.currentTarget.style.color = 'white')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = '#9a9a9a')}
                >
                  {icon}
                </button>
              ))}
              {hasEyeDropper && (
                <>
                  <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)', margin: '0 2px' }} />
                  <button key="eyedropper" type="button" onClick={handleEyeDropper} title="Піпетка кольору"
                    style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9a9a9a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)', e.currentTarget.style.color = 'white')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent', e.currentTarget.style.color = '#9a9a9a')}
                  >
                    <EyeDropperIcon />
                  </button>
                </>
              )}
              <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)', margin: '0 2px' }} />
              <button type="button" onClick={() => setExpanded(false)} title="Закрити"
                style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                ✕
              </button>
            </div>
          ) : (
            // Collapsed — just the bug button
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', background: 'rgba(0,0,0,0.35)', color: 'rgba(255,255,255,0.6)', padding: '2px 6px', borderRadius: '4px', userSelect: 'none' }}>
                Alt+B
              </span>
              <button type="button" onClick={() => setExpanded(true)} title="Зафіксувати баг (Alt+B)"
                style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(28,28,30,0.65)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', transition: 'all 0.15s', backdropFilter: 'blur(8px)' }}>
                <BugIcon />
              </button>
            </div>
          )}
        </div>
      )}

      {activeTool && (
        <CaptureMode initialTool={activeTool} apiKey={apiKey ?? ''} onSend={handleSend} onCancel={() => setActiveTool(null)} />
      )}

      {toast && (
        <div data-buggy-bag="true" style={{ position: 'fixed', bottom: '90px', right: '24px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: '12px', background: toast.ok ? '#1c1c1e' : '#3f1c1c', color: toast.ok ? 'white' : '#fca5a5', border: `1px solid ${toast.ok ? 'rgba(255,255,255,0.1)' : '#7f1d1d'}`, fontSize: '13px', fontWeight: '600' }}>
          {toast.color ? (
            <>
              <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: toast.color, border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', fontFamily: 'monospace' }}>{toast.color}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '500', marginTop: '1px' }}>скопійовано</div>
              </div>
            </>
          ) : (
            <>
              {toast.msg}
              {toast.ok && portalUrl && (
                <a href={portalUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', marginLeft: '4px', fontSize: '12px' }}>
                  Відкрити →
                </a>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

export function BuggyBag({ apiEndpoint, apiKey, portalUrl }: BuggyBagProps = {}) {
  useEffect(() => {
    // ── URL param ?bb=on — runs BEFORE guard, in main document context ──
    const params = new URLSearchParams(window.location.search);
    if (params.get('bb') === 'on') {
      localStorage.setItem('BUGGY_BAG_ACCESS', 'active');
      params.delete('bb');
      window.history.replaceState({}, '', window.location.pathname + (params.toString() ? '?' + params.toString() : ''));
    }


    // ── Voice bridge for Shadow DOM SpeechRecognition ──
    let _active = false;

    const dispatchTranscript = (text: string, isFinal: boolean) =>
      window.dispatchEvent(new CustomEvent('buggy-bag:transcript', { detail: { text, isFinal } }));

    const createRec = () => {
      const w = window as any;
      const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
      if (!SR || !_active) return;

      const rec = new SR();
      rec.lang = 'uk-UA';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (e: any) => {
        let finalText = '';
        let interimText = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText += t + ' ';
          else interimText += t;
        }
        if (finalText) dispatchTranscript(finalText.trim(), true);
        if (interimText) dispatchTranscript(interimText, false);
      };

      rec.onerror = (ev: any) => {
        if (ev.error === 'no-speech' || ev.error === 'aborted') return;
        _active = false;
        window.dispatchEvent(new CustomEvent('buggy-bag:voice-end'));
      };

      // Chrome stops after silence or ~60s — recreate a fresh instance to keep going
      rec.onend = () => {
        if (_active) setTimeout(createRec, 150); // fresh instance after short delay
        else window.dispatchEvent(new CustomEvent('buggy-bag:voice-end'));
      };

      try { rec.start(); } catch {
        _active = false;
        window.dispatchEvent(new CustomEvent('buggy-bag:voice-end'));
      }
    };

    const startVoice = () => {
      _active = true;
      createRec();
    };

    const stopVoice = () => {
      _active = false;
      // no need to call rec.stop() — onend will fire and see _active=false
    };

    window.addEventListener('buggy-bag:start-voice', startVoice);
    window.addEventListener('buggy-bag:stop-voice', stopVoice);

    // ── Keyboard shortcut in main document context ──
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'KeyB') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('buggy-bag:toggle'));
      }
      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('buggy-bag:escape'));
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // ── Shadow DOM mount ──
    const host = document.createElement('div');
    host.setAttribute('data-buggy-bag', 'true');
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const peStyle = document.createElement('style');
    peStyle.textContent = '* { pointer-events: auto; }';
    shadow.appendChild(peStyle);
    const styleEl = document.createElement('style');
    styleEl.textContent = widgetStyles;
    shadow.appendChild(styleEl);
    const mountPoint = document.createElement('div');
    shadow.appendChild(mountPoint);

    const root = createRoot(mountPoint);
    root.render(
      <GodModeGuard>
        <BuggyBagInner apiEndpoint={apiEndpoint} apiKey={apiKey} portalUrl={portalUrl} />
      </GodModeGuard>
    );

    return () => {
      _active = false;
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('buggy-bag:start-voice', startVoice);
      window.removeEventListener('buggy-bag:stop-voice', stopVoice);
      host.remove();
      setTimeout(() => root.unmount(), 0);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export function isActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('BUGGY_BAG_ACCESS') === 'active';
}
export function activateFromUrl(): void {}
