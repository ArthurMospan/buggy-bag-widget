import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GodModeGuard } from '../guard';
import { CaptureMode } from './CaptureMode';
import { initCollector } from '../lib/collector';
import { detectFavicon } from '../lib/favicon';
import type { SubmitBugPayload, DrawTool } from '../types';
import widgetStyles from '../styles.gen';

export interface BuggyBagProps {
  apiEndpoint?: string;
  apiKey?: string;
  portalUrl?: string;
}

function BugIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 194 194" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.7365 18.4947C-0.604524 20.9451 -6.27503 -5.19299 10.7365 0.933186C24.3457 5.83418 36.659 21.4903 41.1144 28.7056L42.7999 31.4049C54.7817 28.0012 71.5545 27.9996 97.0001 27.9996C122.445 27.9996 139.218 28.0014 151.199 31.4049L152.886 28.7056C157.341 21.4903 169.655 5.83418 183.264 0.933186C200.275 -5.19278 194.605 20.9448 183.264 18.4947C174.191 16.5343 165.982 22.0348 163.012 25.0299L157.341 31.1558L156.075 33.0904C159.532 34.5302 162.546 36.377 165.248 38.7467C166.669 39.9929 168.008 41.3305 169.254 42.7515C180 55.0055 180 73.6704 180 111C180 148.329 180 166.994 169.254 179.248C168.008 180.669 166.669 182.007 165.248 183.253C152.994 194 134.33 194 97.0001 194C59.6708 194 41.006 194 28.7521 183.253C27.331 182.007 25.9925 180.669 24.7462 179.248C14.0002 166.994 14.0001 148.329 14.0001 111C14.0001 73.6703 13.9999 55.0054 24.7462 42.7515C25.9925 41.3304 27.331 39.9929 28.7521 38.7467C31.454 36.3772 34.4674 34.5302 37.924 33.0904L36.6593 31.1558L30.9884 25.0299C28.0181 22.0348 19.8093 16.5343 10.7365 18.4947Z" fill="#1F1F1F"/>
      <path d="M30.6001 102.7C30.6001 86.6564 43.6062 73.6503 59.6501 73.6503C75.6939 73.6503 88.7001 86.6564 88.7001 102.7V106.85C88.7001 122.894 75.6939 135.9 59.6501 135.9C43.6062 135.9 30.6001 122.894 30.6001 106.85V102.7Z" fill="white"/>
      <path d="M105.3 102.7C105.3 86.6564 118.306 73.6503 134.35 73.6503C150.394 73.6503 163.4 86.6564 163.4 102.7V106.85C163.4 122.894 150.394 135.9 134.35 135.9C118.306 135.9 105.3 122.894 105.3 106.85V102.7Z" fill="white"/>
      <path d="M126.05 97.512C126.05 88.917 133.018 81.9495 141.613 81.9495C150.208 81.9495 157.175 88.917 157.175 97.512C157.175 106.107 150.208 113.074 141.613 113.074C133.018 113.074 126.05 106.107 126.05 97.512Z" fill="#1F1F1F"/>
      <path d="M51.3501 97.512C51.3501 88.917 58.3176 81.9495 66.9126 81.9495C75.5075 81.9495 82.4751 88.917 82.4751 97.512C82.4751 106.107 75.5075 113.074 66.9126 113.074C58.3176 113.074 51.3501 106.107 51.3501 97.512Z" fill="#1F1F1F"/>
    </svg>
  );
}

function PinIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>;
}
function RectIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
}
function ArrowIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19L19 5"/><path d="M8 5h11v11"/></svg>;
}
function ExternalLinkIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
}

// Tool definitions — Pin is first
const toolsList: { tool: DrawTool; icon: React.ReactNode; title: string; hotkey: string }[] = [
  { tool: 'pin',     icon: <PinIcon />,    title: 'Поставити пін',   hotkey: '1' },
  { tool: 'rect',   icon: <RectIcon />,   title: 'Виділити область', hotkey: '2' },
  { tool: 'arrow',  icon: <ArrowIcon />,  title: 'Намалювати стрілку', hotkey: '3' },
  { tool: 'measure', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.55 6.45L17.55 2.45a1 1 0 0 0-1.41 0L2.45 16.14a1 1 0 0 0 0 1.41l4 4a1 1 0 0 0 1.41 0L21.55 7.86a1 1 0 0 0 0-1.41z"/><path d="M8 8l1.5 1.5"/><path d="M11.5 11.5l1.5 1.5"/><path d="M15 15l1.5 1.5"/></svg>, title: 'Лінійка', hotkey: '4' },
];

function BuggyBagInner({ apiEndpoint, apiKey, portalUrl }: BuggyBagProps) {
  const [activeTool, setActiveTool] = useState<DrawTool | null>(null);
  const [toast, setToast] = useState<{ msg?: string; ok: boolean; isBugReport?: boolean } | null>(null);
  const [projectUrl, setProjectUrl] = useState<string | null>(null);
  const [draftCount, setDraftCount] = useState(0);
  const [draftConflict, setDraftConflict] = useState<{ path: string; count: number } | null>(null);

  useEffect(() => { initCollector(); }, []);

  // Count drafts for badge
  useEffect(() => {
    const checkDraft = () => {
      try {
        const saved = localStorage.getItem(`BUGGY_BAG_DRAFT_${window.location.pathname}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.shapes && parsed.shapes.length > 0) {
            setDraftCount(parsed.shapes.length);
          } else {
            setDraftCount(0);
          }
        } else {
          setDraftCount(0);
        }
      } catch (e) {
        setDraftCount(0);
      }
    };
    checkDraft();
    window.addEventListener('buggy-bag:draft-changed', checkDraft);
    return () => window.removeEventListener('buggy-bag:draft-changed', checkDraft);
  }, []);

  const handleBugBtnClick = () => {
    if (activeTool) {
      window.dispatchEvent(new CustomEvent('buggy-bag:request-close'));
      return;
    }

    // Look for drafts on other pages
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('BUGGY_BAG_DRAFT_') && key !== `BUGGY_BAG_DRAFT_${window.location.pathname}`) {
        try {
          const parsed = JSON.parse(localStorage.getItem(key) || '{}');
          if (parsed.shapes && parsed.shapes.length > 0) {
            setDraftConflict({ path: key.replace('BUGGY_BAG_DRAFT_', ''), count: parsed.shapes.length });
            return;
          }
        } catch (e) {}
      }
    }
    setActiveTool('pin');
  };

  // Alt+B: toggle between capture mode and idle
  useEffect(() => {
    const handler = () => {
      if (activeTool) {
        window.dispatchEvent(new CustomEvent('buggy-bag:request-close'));
      } else {
        handleBugBtnClick();
      }
    };
    const toastHandler = (e: any) => {
      if (e.detail) {
        setToast({ msg: e.detail.msg, ok: e.detail.ok, isBugReport: false });
        setTimeout(() => setToast(null), 4000);
      }
    };
    
    window.addEventListener('buggy-bag:toggle', handler);
    window.addEventListener('buggy-bag:toast', toastHandler);
    return () => {
      window.removeEventListener('buggy-bag:toggle', handler);
      window.removeEventListener('buggy-bag:toast', toastHandler);
    };
  }, [activeTool]);

  const fireConfetti = () => {
    const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
    if (!document.getElementById('bb-cf-kf')) {
      const s = document.createElement('style');
      s.id = 'bb-cf-kf';
      s.textContent = '@keyframes bb-cf-fall { 0% { transform: translateY(0) rotate(0deg); opacity:1; } 100% { transform: translateY(-220px) rotate(540deg); opacity:0; } }';
      document.head.appendChild(s);
    }
    for (let i = 0; i < 48; i++) {
      const el = document.createElement('div');
      const size = Math.random() * 6 + 4;
      const isRect = Math.random() > 0.5;
      Object.assign(el.style, {
        position: 'fixed',
        width: size + 'px', height: isRect ? size * 2.2 + 'px' : size + 'px',
        background: colors[i % colors.length],
        borderRadius: isRect ? '2px' : '50%',
        right: (20 + Math.random() * 180) + 'px',
        bottom: (60 + Math.random() * 40) + 'px',
        zIndex: '2147483646',
        pointerEvents: 'none',
        animation: `bb-cf-fall ${Math.random() * 1 + 0.8}s ease-out ${Math.random() * 0.3}s forwards`,
      });
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2000);
    }
  };

  const handleSend = async (payload: SubmitBugPayload) => {
    setActiveTool(null);
    fireConfetti();
    const targetEndpoint = apiEndpoint || (portalUrl ? `${portalUrl}/api/bugs/submit` : null);
    if (!targetEndpoint || !apiKey) { showSuccessToast(null); return; }
    try {
      const res = await fetch(targetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, api_key: apiKey }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const pId = data?.bug?.project_id || null;
        const targetProjUrl = pId && portalUrl ? `${portalUrl}/projects/${pId}` : (portalUrl || null);
        showSuccessToast(targetProjUrl);
      }
      else showToast('⚠ Помилка сервера', false);
    } catch {
      showToast('⚠ Не вдалось відправити', false);
    }
  };

  const showSuccessToast = (projUrl: string | null) => {
    setProjectUrl(projUrl);
    setToast({ ok: true, isBugReport: true });
    setTimeout(() => setToast(null), 5000);
  };

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok, isBugReport: false });
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <>
      {/* Bug button — shown only when capture mode is NOT active */}
      {!activeTool && (
        <div data-buggy-bag="true" style={{ position: 'fixed', bottom: '12px', right: '12px', zIndex: 9997, fontFamily: 'system-ui, sans-serif' }}>
          {draftConflict && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
            }}>
              <div style={{ background: '#1c1c1e', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '320px', textAlign: 'center' }}>
                <div style={{ fontSize: '15px', color: 'white', fontWeight: '600', marginBottom: '16px', lineHeight: '1.4' }}>
                  Ви перейшли на іншу сторінку. Ваші останні мітки ({draftConflict.count}) залишились на минулій сторінці. Що робити?
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button onClick={() => window.location.href = draftConflict.path} style={{ background: 'rgb(79, 70, 229)', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                    Перейти на сторінку
                  </button>
                  <button onClick={() => { localStorage.removeItem(`BUGGY_BAG_DRAFT_${draftConflict.path}`); setDraftConflict(null); setActiveTool('pin'); }} style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                    Стерти всі мітки
                  </button>
                  <button onClick={() => setDraftConflict(null)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                    Скасувати
                  </button>
                </div>
              </div>
            </div>
          )}
          <div>
            <button
              type="button"
              className="bb-bug-btn"
              onClick={handleBugBtnClick}
              title="Зафіксувати баг (Alt+B)"
              style={{ width: '56px', height: '56px', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'transform 0.15s', animation: 'bb-bugbtn-entry 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards', position: 'relative' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            >
              <style>{`
                @keyframes bb-bugbtn-entry {
                  0% { transform: scale(0.1) rotate(-45deg); opacity: 0; }
                  100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes bb-wiggle {
                  0%, 100% { transform: rotate(0deg); }
                  25% { transform: rotate(-8deg) translateY(-2px); }
                  75% { transform: rotate(8deg) translateY(-2px); }
                }
                .bb-bug-btn:hover svg {
                  animation: bb-wiggle 0.25s ease-in-out infinite;
                  transform-origin: center bottom;
                }
                .bb-bug-btn:hover .bb-bug-hint {
                  opacity: 1 !important;
                }
              `}</style>
              <span className="bb-bug-hint" style={{ position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)', fontSize: '9px', fontFamily: 'monospace', background: 'rgba(28,28,30,0.6)', color: 'rgba(255,255,255,0.85)', padding: '2px 6px', borderRadius: '6px', userSelect: 'none', backdropFilter: 'blur(4px)', fontWeight: '600', opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                Alt+B
              </span>
              <BugIcon />
              {draftCount > 0 && (
                <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: 'rgb(79, 70, 229)', color: 'white', fontSize: '9px', fontWeight: 'bold', minWidth: '14px', height: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
                  {draftCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Capture mode with its own full toolbar */}
      {activeTool && (
        <CaptureMode
          initialTool={activeTool}
          apiKey={apiKey ?? ''}
          portalUrl={portalUrl}
          onSend={handleSend}
          onCancel={() => setActiveTool(null)}
        />
      )}

      {/* Toast — centered bottom, beautiful, compact, one-row, no shadow */}
      {toast && (
        <div data-buggy-bag="true" style={{
          position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 16px', borderRadius: '12px',
          background: toast.ok ? 'rgba(18,22,20,0.96)' : 'rgba(36,18,18,0.96)',
          border: `1px solid ${toast.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          whiteSpace: 'nowrap',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {toast.ok ? (
            // Success state
            <>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>{toast.msg || 'Баг репорт надіслано'}</span>
              {toast.isBugReport && (projectUrl || portalUrl) && (
                <a href={projectUrl || portalUrl} target="_blank" rel="noopener noreferrer" style={{
                  fontSize: '11px', color: '#1a1a1a', background: '#f4f4f5', textDecoration: 'none', fontWeight: '700',
                  padding: '5px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px',
                  marginLeft: '6px', transition: 'background 0.15s'
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#ffffff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#f4f4f5'; }}
                >
                  Перейти в проєкт
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              )}
              <button type="button" onClick={() => setToast(null)}
                style={{ marginLeft: '4px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '13px', display: 'flex', alignItems: 'center', padding: '2px' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.35)'; }}
              >✕</button>
            </>
          ) : (
            // Error state
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontSize: '13px', color: '#fca5a5', fontWeight: '600' }}>{toast.msg}</span>
            </>
          )}
        </div>
      )}
    </>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[BuggyBag] Crash:', error, errorInfo);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, background: 'red', color: 'white', padding: '10px', borderRadius: '8px', maxWidth: '300px', fontSize: '12px', fontFamily: 'monospace' }}>
          <strong>Widget Crashed!</strong><br />
          {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

export function BuggyBag({ apiEndpoint, apiKey, portalUrl }: BuggyBagProps = {}) {
  return (
    <ErrorBoundary>
      <BuggyBagWithHooks apiEndpoint={apiEndpoint} apiKey={apiKey} portalUrl={portalUrl} />
    </ErrorBoundary>
  );
}

function BuggyBagWithHooks({ apiEndpoint, apiKey, portalUrl }: BuggyBagProps) {
  const [isProjectActive, setIsProjectActive] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bbParam = params.get('bb');

    // ── Check presence and kill switch ──
    if (apiKey) {
      const pingUrl = apiEndpoint ? apiEndpoint.replace('/bugs/submit', '/ping') : `${portalUrl}/api/ping`;
      detectFavicon().then(favicon => {
        fetch(pingUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            api_key: apiKey,
            favicon_url: favicon.url,
            favicon_color: favicon.color,
            bb_param: bbParam || undefined
          }),
        })
        .then(r => r.json())
        .then(data => {
          if (data.ok) {
            if (data.grant_access) {
              localStorage.setItem('BUGGY_BAG_ACCESS', 'active');
              params.delete('bb');
              const searchStr = params.toString() ? '?' + params.toString() : '';
              window.history.replaceState({}, '', window.location.pathname + searchStr);
            }
            if (data.is_active === false) {
              setIsProjectActive(false);
            } else {
              setIsProjectActive(true);
            }
          } else {
            setIsProjectActive(true);
          }
        })
        .catch(() => setIsProjectActive(true));
      });
    } else {
      setIsProjectActive(true);
    }
  }, [apiEndpoint, apiKey, portalUrl]);

  useEffect(() => {
    if (isProjectActive !== true) return;


    // ── Voice bridge for Shadow DOM SpeechRecognition ──
    let _active = false;
    let _rec: any = null;

    const dispatchTranscript = (text: string, isFinal: boolean) =>
      window.dispatchEvent(new CustomEvent('buggy-bag:transcript', { detail: { text, isFinal } }));

    const createRec = () => {
      const w = window as any;
      const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
      if (!SR || !_active) return;

      _rec = new SR();
      _rec.lang = 'uk-UA';
      _rec.continuous = true;
      _rec.interimResults = true;

      _rec.onresult = (e: any) => {
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

      _rec.onerror = (ev: any) => {
        if (ev.error === 'no-speech' || ev.error === 'aborted') return;
        if (ev.error === 'not-allowed') {
          // Permission denied — signal UI
          _active = false;
          window.dispatchEvent(new CustomEvent('buggy-bag:voice-end'));
          return;
        }
        _active = false;
        window.dispatchEvent(new CustomEvent('buggy-bag:voice-end'));
      };

      // Chrome stops after silence or ~60s — recreate to keep going
      _rec.onend = () => {
        if (_active) setTimeout(createRec, 150);
        else window.dispatchEvent(new CustomEvent('buggy-bag:voice-end'));
      };

      try { _rec.start(); } catch {
        _active = false;
        window.dispatchEvent(new CustomEvent('buggy-bag:voice-end'));
      }
    };

    const startVoice = async () => {
      // Explicitly request microphone permission first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        window.dispatchEvent(new CustomEvent('buggy-bag:voice-end'));
        return;
      }
      _active = true;
      createRec();
    };

    const stopVoice = () => {
      _active = false;
      try { _rec?.stop(); } catch {}
      _rec = null;
    };

    window.addEventListener('buggy-bag:start-voice', startVoice);
    window.addEventListener('buggy-bag:stop-voice', stopVoice);

    // Eyedropper: hide/show the entire widget host so EyeDropper sees clean pixels
    const handleEyedropperOpen = () => { host.style.opacity = '0'; };
    const handleEyedropperClose = () => { host.style.opacity = ''; };
    window.addEventListener('buggy-bag:eyedropper-open', handleEyedropperOpen);
    window.addEventListener('buggy-bag:eyedropper-close', handleEyedropperClose);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'KeyB') { e.preventDefault(); window.dispatchEvent(new CustomEvent('buggy-bag:toggle')); }
      if (e.key === 'Escape') window.dispatchEvent(new CustomEvent('buggy-bag:escape'));
    };
    document.addEventListener('keydown', handleKeyDown);

    const host = document.createElement('div');
    host.id = 'buggy-bag-host';
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
      <ErrorBoundary>
        <GodModeGuard>
          <BuggyBagInner apiEndpoint={apiEndpoint} apiKey={apiKey} portalUrl={portalUrl} />
        </GodModeGuard>
      </ErrorBoundary>
    );

    return () => {
      _active = false;
      try { _rec?.stop(); } catch {}
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('buggy-bag:start-voice', startVoice);
      window.removeEventListener('buggy-bag:stop-voice', stopVoice);
      window.removeEventListener('buggy-bag:eyedropper-open', handleEyedropperOpen);
      window.removeEventListener('buggy-bag:eyedropper-close', handleEyedropperClose);
      host.remove();
      setTimeout(() => root.unmount(), 0);
    };
  }, [isProjectActive, apiEndpoint, apiKey, portalUrl]);

  return null;
}

export function isActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('BUGGY_BAG_ACCESS') === 'active';
}
