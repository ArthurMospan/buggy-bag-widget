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

function BuggyBagInner({ apiEndpoint, apiKey, portalUrl }: BuggyBagProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTool, setActiveTool] = useState<DrawTool | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => { initCollector(); }, []);

  // Listen for keyboard shortcut dispatched from OUTER component (main document context)
  useEffect(() => {
    const handler = () => {
      setExpanded(v => !v);
      setActiveTool(null);
    };
    const escHandler = () => {
      setExpanded(false);
      setActiveTool(null);
    };
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
        <div data-buggy-bag="true" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9997, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
              {tools.map(({ tool, icon, title }) => (
                <button key={tool} type="button" onClick={() => handleToolSelect(tool)} title={title}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'white', border: '1px solid rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#1f1f1f', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  {icon}
                </button>
              ))}
            </div>
          )}
          <span style={{ fontSize: '10px', fontFamily: 'monospace', background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.85)', padding: '2px 6px', borderRadius: '4px', userSelect: 'none' }}>
            Alt+B
          </span>
          <button type="button" onClick={() => setExpanded(v => !v)} title="Зафіксувати баг (Alt+B)"
            style={{ width: '48px', height: '48px', borderRadius: '50%', background: expanded ? '#4f46e5' : '#1c1c1e', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', boxShadow: '0 8px 28px rgba(0,0,0,0.4)', transition: 'background 0.15s' }}>
            <BugIcon />
          </button>
        </div>
      )}

      {activeTool && (
        <CaptureMode initialTool={activeTool} apiKey={apiKey ?? ''} onSend={handleSend} onCancel={() => setActiveTool(null)} />
      )}

      {toast && (
        <div data-buggy-bag="true" style={{ position: 'fixed', bottom: '90px', right: '24px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', background: toast.ok ? '#1c1c1e' : '#3f1c1c', color: toast.ok ? 'white' : '#fca5a5', border: `1px solid ${toast.ok ? 'rgba(255,255,255,0.1)' : '#7f1d1d'}`, fontSize: '13px', fontWeight: '600' }}>
          {toast.msg}
          {toast.ok && portalUrl && (
            <a href={portalUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', marginLeft: '4px', fontSize: '12px' }}>
              Відкрити →
            </a>
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

    // ── Keyboard shortcut in main document context ──
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'b' || e.key === 'B' || e.key === 'і' || e.key === 'І')) {
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
      document.removeEventListener('keydown', handleKeyDown);
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
