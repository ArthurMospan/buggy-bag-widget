import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import type { DrawShape, DrawTool, SubmitBugPayload, DebugOverlay } from '../types';
import { DrawingCanvas } from './DrawingCanvas';
import { ShapeAnnotation } from './ShapeAnnotation';
import { collectTechContext, getPinElementContext } from '../lib/collector';

interface CaptureModeProps {
  initialTool: DrawTool;
  apiKey: string;
  portalUrl?: string;
  onSend: (payload: SubmitBugPayload) => void;
  onCancel: () => void;
}

function ToolBtn({ active, onClick, title, hotkey, children }: {
  active: boolean; onClick: () => void; title: string; hotkey?: string; children: React.ReactNode
}) {
  return (
    <button
      type="button" onClick={onClick}
      title={hotkey ? `${title} (${hotkey})` : title}
      style={{
        width: '34px', height: '34px', borderRadius: '8px', position: 'relative',
        background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
        border: 'none',
        cursor: 'pointer', color: active ? 'white' : '#9a9a9a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
          (e.currentTarget as HTMLButtonElement).style.color = 'white';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = '#9a9a9a';
        }
      }}
    >
      {children}
      {hotkey && (
        <span style={{
          position: 'absolute', bottom: '2px', right: '3px',
          fontSize: '7px', fontFamily: 'monospace', fontWeight: '700',
          color: active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
          lineHeight: 1,
        }}>
          {hotkey}
        </span>
      )}
    </button>
  );
}

// ── Debug overlay helpers ──────────────────────────────────────────────────
const SPACING_STYLE_ID = 'buggy-bag-spacing-overlay';
const ZOOM_STYLE_ID = 'buggy-bag-zoom-overlay';

function enableSpacingOverlay() {
  if (document.getElementById(SPACING_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SPACING_STYLE_ID;
  style.textContent = `
    *:not([data-buggy-bag]) { outline: 1px solid rgba(99,102,241,0.35) !important; }
    *:not([data-buggy-bag]):hover { outline: 1px solid rgba(139,92,246,0.8) !important; background-color: rgba(139,92,246,0.04) !important; }
  `;
  document.head.appendChild(style);
}
function disableSpacingOverlay() {
  document.getElementById(SPACING_STYLE_ID)?.remove();
}

function runAutoBugScan(): string[] {
  const issues: string[] = [];
  // Broken images
  document.querySelectorAll('img').forEach((img, i) => {
    if (img.naturalWidth === 0 && img.complete) {
      issues.push(`🖼 Broken image: ${img.src.slice(0, 60) || `img[${i}]`}`);
    }
  });
  // Overflow issues
  document.querySelectorAll('*').forEach(el => {
    if ((el as HTMLElement).dataset?.buggyBag) return;
    const s = window.getComputedStyle(el);
    if (s.overflow === 'hidden' || s.overflowX === 'hidden' || s.overflowY === 'hidden') {
      if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) {
        const tag = el.tagName.toLowerCase();
        const cls = (el as HTMLElement).className?.toString?.().slice?.(0, 30) ?? '';
        issues.push(`📏 Overflow hidden with scroll: <${tag} class="${cls}">`);
      }
    }
  });
  // Console errors (collected by collector)
  try {
    const ctx = (window as any).__BUGGY_BAG_CONTEXT__;
    if (ctx?.consoleErrors?.length) {
      ctx.consoleErrors.slice(0, 5).forEach((e: any) => {
        issues.push(`❌ Console error: ${String(e.message).slice(0, 80)}`);
      });
    }
  } catch {}
  // Missing alt on images
  document.querySelectorAll('img:not([alt])').forEach((img, i) => {
    if (i < 3) issues.push(`♿ Missing alt: ${(img as HTMLImageElement).src.slice(0, 50)}`);
  });
  if (issues.length === 0) issues.push('✅ Проблем не знайдено!');
  return issues;
}

let _zoomActive = false;
let _zoomEl: HTMLDivElement | null = null;
let _zoomHandler: ((e: MouseEvent) => void) | null = null;

function enableZoom() {
  if (_zoomActive) return;
  _zoomActive = true;
  const el = document.createElement('div');
  el.setAttribute('data-buggy-bag', 'true');
  Object.assign(el.style, {
    position: 'fixed', width: '160px', height: '160px', borderRadius: '50%',
    border: '3px solid rgba(139,92,246,0.9)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3)',
    overflow: 'hidden', pointerEvents: 'none',
    zIndex: '2147483000', display: 'none',
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'rgba(18,18,20,0.95)',
    transition: 'opacity 0.2s',
    opacity: '0'
  });
  
  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#8b5cf6;font-family:monospace;font-size:11px;">Завантаження...</div>`;
  document.body.appendChild(el);
  _zoomEl = el;

  let bgUrl = '';
  const scale = 2;

  const handler = (e: MouseEvent) => {
    if (!bgUrl) {
      el.style.display = 'block';
      el.style.left = (e.clientX + 20) + 'px';
      el.style.top = (e.clientY - 80) + 'px';
      el.style.opacity = '1';
      return;
    }
    const x = e.clientX; const y = e.clientY;
    el.style.left = (x + 20) + 'px';
    el.style.top = (y - 80) + 'px';
    
    const bx = x * scale - 80;
    const by = y * scale - 80;
    el.style.backgroundPosition = `-${bx}px -${by}px`;
  };
  _zoomHandler = handler;
  document.addEventListener('mousemove', handler);

  const host = document.querySelector('[data-buggy-bag="true"]') as HTMLElement | null;
  let oldOpacity = '';
  if (host) { oldOpacity = host.style.opacity; host.style.opacity = '0'; }
  
  toPng(document.body, { skipFonts: true, filter: (n) => !(n as HTMLElement).closest?.('[data-buggy-bag]') })
    .then(dataUrl => {
      if (!_zoomActive) return;
      bgUrl = dataUrl;
      el.innerHTML = '';
      el.style.backgroundImage = `url(${dataUrl})`;
      el.style.backgroundSize = `${window.innerWidth * scale}px ${window.innerHeight * scale}px`;
    })
    .catch(err => {
      if (!_zoomActive) return;
      el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:red;font-size:11px;">Помилка</div>`;
    })
    .finally(() => {
      if (host) host.style.opacity = oldOpacity;
    });
}

function disableZoom() {
  _zoomActive = false;
  _zoomEl?.remove();
  _zoomEl = null;
  if (_zoomHandler) { document.removeEventListener('mousemove', _zoomHandler); _zoomHandler = null; }
}

// ──────────────────────────────────────────────────────────────────────────

export function CaptureMode({ initialTool, apiKey, portalUrl, onSend, onCancel }: CaptureModeProps) {
  const [tool, setTool]         = useState<DrawTool>(initialTool);
  const [shapes, setShapes]     = useState<DrawShape[]>([]);
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  const [pendingShape, setPendingShape] = useState<{ shape: DrawShape; isNew: boolean } | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [sending, setSending]   = useState(false);
  const [cursor, setCursor]     = useState<{ x: number; y: number } | null>(null);
  const [showKebab, setShowKebab] = useState(false);
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const [activeDebug, setActiveDebug] = useState<Set<DebugOverlay>>(new Set());
  const [autoBugResults, setAutoBugResults] = useState<string[] | null>(null);
  const [hoveredCode, setHoveredCode] = useState<string>('');
  const [hoveredStyle, setHoveredStyle] = useState<string>('');
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [codeWinPos, setCodeWinPos] = useState({ x: typeof window !== 'undefined' ? window.innerWidth - 440 : 800, y: 24 });
  const [bugWinPos, setBugWinPos] = useState({ x: 24, y: 24 });
  const [lastCopiedColor, setLastCopiedColor] = useState<string | null>(null);
  const dragRef = useRef<'code' | 'bug' | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const kebabRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const glowRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;

  const handleShapeComplete = useCallback(async (shape: DrawShape) => {
    // Compute anchor point per shape type so every annotation carries DOM context
    let anchorX: number | undefined;
    let anchorY: number | undefined;
    if (shape.type === 'pin') {
      anchorX = shape.x; anchorY = shape.y;
    } else if (shape.type === 'rect') {
      anchorX = shape.x + (shape.width ?? 0) / 2;
      anchorY = shape.y + (shape.height ?? 0) / 2;
    } else if ((shape.type === 'arrow' || shape.type === 'measure') && shape.points) {
      anchorX = (shape.points[0] + shape.points[2]) / 2;
      anchorY = (shape.points[1] + shape.points[3]) / 2;
    }
    const enrichedShape = anchorX !== undefined && anchorY !== undefined
      ? { ...shape, elementContext: getPinElementContext(anchorX, anchorY) ?? undefined }
      : shape;

    setShapes(prev => {
      const next = [...prev, enrichedShape];
      try { 
        localStorage.setItem(`BUGGY_BAG_DRAFT_${window.location.pathname}`, JSON.stringify({ shapes: next, annotations })); 
        window.dispatchEvent(new CustomEvent('buggy-bag:draft-changed'));
      } catch {}
      return next;
    });
    setPendingShape({ shape: enrichedShape, isNew: true });
  }, [annotations]);

  const handleShapeDelete = useCallback((id: string) => {
    setShapes(prev => prev.filter(s => s.id !== id));
    setAnnotations(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleShapeMove = useCallback((id: string, dx: number, dy: number) => {
    setShapes(prev => {
      const next = prev.map(s => {
        if (s.id !== id) return s;
        const moved = { ...s, x: s.x + dx, y: s.y + dy };
        if (s.points) {
          moved.points = s.points.map((p, i) => i % 2 === 0 ? p + dx : p + dy) as [number, number, number, number];
        }
        return moved;
      });
      try {
        localStorage.setItem(`BUGGY_BAG_DRAFT_${window.location.pathname}`, JSON.stringify({ shapes: next, annotations }));
        window.dispatchEvent(new CustomEvent('buggy-bag:draft-changed'));
      } catch {}
      return next;
    });
  }, [annotations]);

  const handleAnnotationConfirm = useCallback((shapeId: string, text: string) => {
    setAnnotations(prev => {
      const next = { ...prev, [shapeId]: text };
      try { 
        localStorage.setItem(`BUGGY_BAG_DRAFT_${window.location.pathname}`, JSON.stringify({ shapes, annotations: next })); 
        window.dispatchEvent(new CustomEvent('buggy-bag:draft-changed'));
      } catch {}
      return next;
    });
    setPendingShape(null);
  }, [shapes]);

  const handleAnnotationDismiss = useCallback(() => {
    setPendingShape(pending => {
      if (pending && pending.isNew) {
        setShapes(prev => {
          const next = prev.filter(s => s.id !== pending.shape.id);
          try {
            const draftKey = `BUGGY_BAG_DRAFT_${window.location.pathname}`;
            if (next.length > 0) { localStorage.setItem(draftKey, JSON.stringify({ shapes: next, annotations })); }
            else { localStorage.removeItem(draftKey); }
            window.dispatchEvent(new CustomEvent('buggy-bag:draft-changed'));
          } catch {}
          return next;
        });
      }
      return null;
    });
  }, [annotations]);

  const handleAnnotationDelete = useCallback((shapeId: string) => {
    handleShapeDelete(shapeId);
    setPendingShape(null);
  }, [handleShapeDelete]);

  const handleShapeClick = useCallback((shapeId: string) => {
    const shape = shapes.find(s => s.id === shapeId);
    if (shape) {
      setPendingShape({ shape, isNew: false });
    }
  }, [shapes]);

  const handleClearAll = useCallback(() => {
    setShapes([]); setAnnotations({});
    try { 
      localStorage.removeItem(`BUGGY_BAG_DRAFT_${window.location.pathname}`); 
      window.dispatchEvent(new CustomEvent('buggy-bag:draft-changed'));
    } catch {}
  }, []);

  const handleSend = useCallback(async () => {
    if (sending) return;
    setSending(true);
    setIsCapturing(true);
    // Give React time to hide the toolbar UI before we snapshot anything
    await new Promise(r => setTimeout(r, 80));

    const host = document.querySelector('#buggy-bag-host') as HTMLElement | null;

    // ── Step 1: capture Konva scene canvas BEFORE hiding the host ──────────
    // Konva renders two <canvas> per Layer: [0]=scene (visible), [1]=hit (transparent).
    // We always want the first one (scene canvas).
    let konvaDataUrl: string | null = null;
    if (host?.shadowRoot) {
      const canvas = host.shadowRoot.querySelector('canvas');
      if (canvas) {
        try { konvaDataUrl = canvas.toDataURL('image/png'); } catch { /* tainted */ }
      }
    }

    // ── Step 2: hide the widget so html-to-image only captures the page ────
    if (host) host.style.opacity = '0';

    let imageUrl = '';
    try {
      // Capture the host page without skipFonts so web fonts render correctly.
      // html-to-image fetches @font-face rules; Google Fonts & same-origin fonts
      // work fine. CORS-restricted fonts fall back gracefully.
      const pageDataUrl = await toPng(document.body, {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: 1,
        // Skip the widget host — html-to-image can't serialize Shadow DOM
        // and will throw or produce a corrupt blank image if it tries
        filter: (node: HTMLElement) => node.id !== 'buggy-bag-host',
      });

      if (konvaDataUrl) {
        // ── Step 3: composite page + Konva annotations via Canvas 2D API ───
        // This is the reliable path: html-to-image never touches <canvas> elements,
        // and we control the compositing precisely with pixel dimensions.
        const composite = document.createElement('canvas');
        composite.width = window.innerWidth;
        composite.height = window.innerHeight;
        const ctx = composite.getContext('2d');
        if (ctx) {
          // Draw the page screenshot first
          await new Promise<void>(resolve => {
            const img = new Image();
            img.onload = () => { ctx.drawImage(img, 0, 0); resolve(); };
            img.onerror = () => resolve();
            img.src = pageDataUrl;
          });
          // Draw annotations (arrows, rects, pins) on top
          await new Promise<void>(resolve => {
            const img = new Image();
            img.onload = () => { ctx.drawImage(img, 0, 0); resolve(); };
            img.onerror = () => resolve();
            img.src = konvaDataUrl!;
          });
          imageUrl = composite.toDataURL('image/png');
        } else {
          imageUrl = pageDataUrl;
        }
      } else {
        imageUrl = pageDataUrl;
      }
    } catch (e) {
      console.warn('[BuggyBag] screenshot failed', e);
    }

    if (host) host.style.opacity = '';

    setIsCapturing(false);
    try { 
      localStorage.removeItem(`BUGGY_BAG_DRAFT_${window.location.pathname}`); 
      window.dispatchEvent(new CustomEvent('buggy-bag:draft-changed'));
    } catch {}

    // Fresh snapshot at send time — captures everything that happened during drawing.
    // Resolve the DOM element under the last shape's anchor point so tech_context.component is populated.
    let lastElement: HTMLElement | null = null;
    if (shapes.length > 0) {
      const last = shapes[shapes.length - 1];
      let ax: number | undefined;
      let ay: number | undefined;
      if (last.type === 'pin') {
        ax = last.x; ay = last.y;
      } else if (last.type === 'rect') {
        ax = last.x + (last.width ?? 0) / 2;
        ay = last.y + (last.height ?? 0) / 2;
      } else if ((last.type === 'arrow' || last.type === 'measure') && last.points) {
        ax = (last.points[0] + last.points[2]) / 2;
        ay = (last.points[1] + last.points[3]) / 2;
      }
      if (ax !== undefined && ay !== undefined) {
        const els = document.elementsFromPoint(ax, ay);
        lastElement = (els.find(el =>
          !(el as HTMLElement).closest?.('[data-buggy-bag]') &&
          el !== document.documentElement &&
          el !== document.body
        ) as HTMLElement) ?? null;
      }
    }
    const freshTechContext = collectTechContext(lastElement);

    onSend({ api_key: apiKey, base64_image: imageUrl, shapes, annotations, description: Object.values(annotations).filter(Boolean).join(' | ') || 'Без опису', tech_context: freshTechContext });
  }, [shapes, annotations, apiKey, onSend, sending]);

  const handleCloseRequest = useCallback(() => {
    if (shapes.length > 0) { setShowExitConfirm(true); } 
    else { 
      onCancel(); 
      window.dispatchEvent(new CustomEvent('buggy-bag:close-confirmed')); 
    }
  }, [shapes, onCancel]);

  const handleClearAndExit = useCallback(() => { 
    handleClearAll(); 
    onCancel(); 
    window.dispatchEvent(new CustomEvent('buggy-bag:close-confirmed')); 
  }, [handleClearAll, onCancel]);

  // Load draft
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`BUGGY_BAG_DRAFT_${window.location.pathname}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.shapes && parsed.annotations) { setShapes(parsed.shapes); setAnnotations(parsed.annotations); }
      }
    } catch (e) { console.warn('[BuggyBag] failed to load draft', e); }
  }, []);

  // External close requests
  useEffect(() => {
    const handleOutsideClose = () => {
      handleCloseRequest();
    };
    window.addEventListener('buggy-bag:request-close', handleOutsideClose);
    return () => window.removeEventListener('buggy-bag:request-close', handleOutsideClose);
  }, [handleCloseRequest]);

  // Escape
  useEffect(() => {
    const handleEsc = () => {
      if (activeDebug.size > 0) {
        setActiveDebug(new Set());
        disableSpacingOverlay();
        disableZoom();
        document.body.style.filter = '';
        document.body.style.cursor = '';
        setAutoBugResults(null);
      }
    };
    window.addEventListener('buggy-bag:escape', handleEsc);
    return () => window.removeEventListener('buggy-bag:escape', handleEsc);
  }, [activeDebug]);

  // Beforeunload warning
  useEffect(() => {
    if (shapes.length === 0) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = 'У вас є невідправлені анотації.'; return e.returnValue; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [shapes]);
  // Toggle debug overlay
  const toggleDebug = useCallback((overlay: DebugOverlay) => {
    setActiveDebug(prev => {
      const next = new Set(prev);
      if (next.has(overlay)) {
        next.delete(overlay);
        if (overlay === 'spacing') disableSpacingOverlay();
        if (overlay === 'zoom') disableZoom();
        if (overlay === 'invert') document.body.style.filter = '';
        if (overlay === 'auto-bugs') setAutoBugResults(null);
        if (overlay === 'show-code') document.body.style.cursor = '';
      } else {
        next.add(overlay);
        if (overlay === 'spacing') enableSpacingOverlay();
        if (overlay === 'zoom') enableZoom();
        if (overlay === 'invert') document.body.style.filter = 'invert(1) hue-rotate(180deg)';
        if (overlay === 'auto-bugs') { setAutoBugResults(runAutoBugScan()); }
        if (overlay === 'show-code') document.body.style.cursor = 'crosshair';
      }
      return next;
    });
    setShowKebab(false);
  }, []);


  // Keyboard hotkeys: 1=pin 2=rect 3=arrow 4=measure, Ctrl+S=send
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'textarea' || tag === 'input') return;
      if (e.ctrlKey || e.metaKey) {
        if (e.code === 'KeyS' || e.key.toLowerCase() === 's') { e.preventDefault(); if (shapes.length > 0) handleSend(); }
        return;
      }
      if (!pendingShape && !showExitConfirm) {
        if (e.key === '1') { e.preventDefault(); setTool('pin'); }
        if (e.key === '2') { e.preventDefault(); setTool('rect'); }
        if (e.key === '3') { e.preventDefault(); setTool('arrow'); }
        if (e.key === '4') { e.preventDefault(); setTool('eraser'); }
        if (e.key === '5') { e.preventDefault(); setTool('measure'); }
      }
      if (e.altKey) {
        if (e.key.toLowerCase() === 'i') { e.preventDefault(); toggleDebug('invert'); }
        if (e.key.toLowerCase() === 's') { e.preventDefault(); toggleDebug('spacing'); }
        if (e.key.toLowerCase() === 'a') { e.preventDefault(); toggleDebug('auto-bugs'); }
        if (e.key.toLowerCase() === 'c') { e.preventDefault(); toggleDebug('show-code'); }
        if (e.key.toLowerCase() === 'l') { e.preventDefault(); toggleDebug('zoom'); }
        if (e.key.toLowerCase() === 't') { e.preventDefault(); toggleDebug('typography'); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pendingShape, showExitConfirm, shapes, handleSend, toggleDebug]);

  // Debug overlays cleanup on unmount
  useEffect(() => {
    return () => {
      disableSpacingOverlay();
      disableZoom();
      document.body.style.filter = '';
    };
  }, []);

  // Close kebab menu on outside click
  useEffect(() => {
    if (!showKebab) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (kebabRef.current && !e.composedPath().includes(kebabRef.current)) {
        setShowKebab(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showKebab]);



  const formatNode = useCallback((node: Element, depth = 0, maxDepth = 2): string => {
    if (depth > maxDepth) return '  '.repeat(depth) + '...\n';
    const indent = '  '.repeat(depth);
    const clone = node.cloneNode(false) as Element;
    let str = clone.outerHTML;
    const tagOpen = str.substring(0, str.indexOf('>') + 1);
    const tagClose = str.substring(str.lastIndexOf('<'));
    
    if (node.children.length === 0) {
      const text = node.innerHTML.trim();
      return indent + tagOpen + (text.length > 50 ? text.slice(0, 50) + '...' : text) + tagClose + '\n';
    }
    
    let res = indent + tagOpen + '\n';
    for (let i = 0; i < Math.min(node.children.length, 4); i++) {
      res += formatNode(node.children[i], depth + 1, maxDepth);
    }
    if (node.children.length > 4) {
      res += indent + '  <!-- ... ' + (node.children.length - 4) + ' more child nodes -->\n';
    }
    res += indent + tagClose + '\n';
    return res;
  }, []);

  // Draggable windows logic
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current === 'code') setCodeWinPos({ x: e.clientX - dragOffsetRef.current.x, y: e.clientY - dragOffsetRef.current.y });
      else if (dragRef.current === 'bug') setBugWinPos({ x: e.clientX - dragOffsetRef.current.x, y: e.clientY - dragOffsetRef.current.y });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const startDrag = (e: React.MouseEvent, type: 'code' | 'bug') => {
    dragRef.current = type;
    const rect = (e.currentTarget as HTMLElement).closest('[data-buggy-bag]')?.getBoundingClientRect();
    if (rect) dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // Live Inspector logic
  useEffect(() => {
    if (!activeDebug.has('show-code') && !activeDebug.has('typography') || !cursor) return;
    const els = document.elementsFromPoint(cursor.x, cursor.y);
    const target = els.find(el => !el.closest?.('[data-buggy-bag]'));
    if (target) {
      if (activeDebug.has('show-code')) {
        const path: string[] = [];
        let curr: Element | null = target;
        while (curr && curr.tagName !== 'HTML') {
          let sel = curr.tagName.toLowerCase();
          if (curr.id) sel += '#' + curr.id;
          else if (curr.className && typeof curr.className === 'string') sel += '.' + curr.className.split(' ')[0];
          path.unshift(sel);
          curr = curr.parentElement;
        }
        const breadcrumb = path.slice(-4).join(' > ');
        const html = formatNode(target, 0, 2);
        setHoveredCode(`/* ${breadcrumb} */\n\n${html}`);
      }
      if (activeDebug.has('typography')) {
        const style = window.getComputedStyle(target);
        const typ = `Шрифт: ${style.fontFamily}\nРозмір: ${style.fontSize}\nВага: ${style.fontWeight}\nКолір: ${style.color}\nВисота рядка: ${style.lineHeight}\nLetter-spacing: ${style.letterSpacing}`;
        setHoveredStyle(typ);
      }
      setHoveredRect(target.getBoundingClientRect());
    } else {
      setHoveredRect(null);
    }
  }, [cursor, activeDebug, formatNode]);

  const divider = <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)', margin: '0 2px' }} />;

  return (
    <div
      ref={hostRef}
      data-buggy-bag="true"
      style={{ position: 'fixed', inset: 0, zIndex: 10000, userSelect: 'none' }}
    >
      {/* Animated glow ring — hidden instantly via ref during eyedropper */}
      <style>{`
        @keyframes bb-glow-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>
      
      {/* DevTools Element Highlighter */}
      {(activeDebug.has('show-code') || activeDebug.has('typography')) && hoveredRect && (
        <div id="buggy-bag-highlighter" style={{
          position: 'fixed', top: hoveredRect.top, left: hoveredRect.left,
          width: hoveredRect.width, height: hoveredRect.height,
          background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.8)',
          pointerEvents: 'none', zIndex: 9999, transition: 'all 0.1s ease-out'
        }} />
      )}
      <div
        ref={glowRef}
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          animation: 'bb-glow-pulse 2.8s ease-in-out infinite',
          boxShadow: [
            'inset 0 0 70px rgba(99,102,241,0.24)',
            'inset 0 0 28px rgba(99,102,241,0.20)',
            'inset 0 0 10px rgba(99,102,241,0.32)',
          ].join(', '),
          zIndex: 1,
          visibility: isCapturing ? 'hidden' : 'visible',
        }}
      />



      {/* DevTools Live Inspector window (Under Canvas) */}
      {(activeDebug.has('show-code') || activeDebug.has('typography')) && (
        <div id="buggy-bag-code-window" data-buggy-bag="true" style={{
          position: 'fixed', top: codeWinPos.y + 'px', left: codeWinPos.x + 'px',
          width: '420px', maxHeight: 'calc(100vh - 48px)',
          background: 'rgba(22,22,26,0.95)', border: '1px solid rgba(56,189,248,0.3)',
          borderRadius: '16px', padding: '0',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          fontFamily: 'monospace', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          zIndex: 10005,
        }}>
          {/* Header (Draggable) */}
          <div onMouseDown={e => startDrag(e, 'code')} style={{
            padding: '16px 20px', cursor: 'grab', background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(56,189,248,0.9)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Live Inspector
            </div>
            <button type="button" onClick={() => setActiveDebug(prev => { const n = new Set(prev); n.delete('show-code'); n.delete('typography'); return n; })} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
              width: '20px', height: '20px', cursor: 'pointer', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.8)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
            >✕</button>
          </div>
          
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {activeDebug.has('show-code') && (
            <div style={{ flex: '1 1 auto' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: '1.5' }}>
                {hoveredCode}
              </div>
            </div>
          )}
          {activeDebug.has('typography') && (
            <div style={{ flex: '0 0 auto' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(56,189,248,0.9)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
                Стилі
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {hoveredStyle}
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Auto-bug results panel (Under Canvas) */}
      {autoBugResults && (
        <div id="buggy-bag-autobug-window" data-buggy-bag="true" style={{
          position: 'fixed', top: bugWinPos.y + 'px', left: bugWinPos.x + 'px',
          width: '420px', maxHeight: 'calc(100vh - 48px)',
          background: 'rgba(22,22,26,0.95)', border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '16px', padding: '0',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          fontFamily: 'monospace', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          zIndex: 10005,
        }}>
          {/* Header (Draggable) */}
          <div onMouseDown={e => startDrag(e, 'bug')} style={{
            padding: '16px 20px', cursor: 'grab', background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(139,92,246,0.9)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Результати аналізу
            </div>
            <button type="button" onClick={() => toggleDebug('auto-bugs')} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
              width: '20px', height: '20px', cursor: 'pointer', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.8)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
            >✕</button>
          </div>
          
          <div style={{ padding: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: '1.5', overflowY: 'auto' }}>
            {autoBugResults.map((r, i) => (
              <div key={i}>{r}</div>
            ))}
          </div>
        </div>
      )}

      {/* Drawing canvas — ALWAYS rendered (visible behind popup too) */}
      {!showExitConfirm && (
        <DrawingCanvas
          width={w} height={h} tool={tool} shapes={shapes}
          onShapeComplete={!pendingShape ? handleShapeComplete : () => {}}
          onShapeDelete={handleShapeDelete}
          onShapeMove={handleShapeMove}
          onMouseMove={(x, y) => setCursor({ x, y })}
          onMouseLeave={() => setCursor(null)}
          onShapeClick={handleShapeClick}
          interactive={!pendingShape}
        />
      )}

      {/* Cursor coordinates */}
      {!pendingShape && !showExitConfirm && cursor && (
        <div style={{
          position: 'fixed', left: cursor.x + 14, top: cursor.y + 14,
          background: 'rgba(0,0,0,0.75)', 
          color: 'rgba(255,255,255,0.85)',
          fontSize: '10px', 
          fontFamily: 'monospace', 
          fontWeight: '600',
          padding: '3px 7px', 
          borderRadius: '5px', 
          pointerEvents: 'none',
          zIndex: 10001, letterSpacing: '0.03em',
          visibility: isCapturing ? 'hidden' : 'visible',
          maxWidth: '250px',
        }}>
          {tool === 'measure' ? 'затисніть і проведіть лінію' :
           tool === 'eraser' ? 'натисніть щоб видалити' :
           tool === 'eyedropper' ? 'натисніть щоб вибрати колір' :
           `${cursor.x}, ${cursor.y}`}
        </div>
      )}

      {/* Annotation popup */}
      {pendingShape && (
        <div style={{ visibility: isCapturing ? 'hidden' : 'visible' }}>
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 10001, cursor: 'pointer' }}
            onClick={handleAnnotationDismiss} 
          />
          <div style={{ position: 'relative', zIndex: 10002 }}>
            <ShapeAnnotation
              shape={pendingShape.shape}
              initialText={annotations[pendingShape.shape.id]}
              clipboardHint={lastCopiedColor}
              onClearClipboardHint={() => setLastCopiedColor(null)}
              containerWidth={w}
              containerHeight={h}
              onConfirm={handleAnnotationConfirm}
              onDismiss={handleAnnotationDismiss}
              onDelete={!pendingShape.isNew ? handleAnnotationDelete : undefined}
            />
          </div>
        </div>
      )}
      {!pendingShape && !showExitConfirm && (
        <div data-buggy-bag="true" style={{
          position: 'fixed', bottom: '24px', right: '24px',
          background: 'rgba(18,18,20,0.96)', backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '8px', display: 'flex', alignItems: 'center', gap: '4px',
          zIndex: 10002,
          transformOrigin: 'calc(100% - 24px) 50%',
          animation: 'bb-toolbar-entry 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          visibility: isCapturing ? 'hidden' : 'visible',
        }}>
          <style>{`
            @keyframes bb-toolbar-entry {
              0% { transform: scale(0.1); opacity: 0; border-radius: 24px; }
              100% { transform: scale(1); opacity: 1; border-radius: 14px; }
            }
          `}</style>

          {/* Tools: Pin / Rect / Arrow — Ruler & EyeDropper in kebab */}
          <ToolBtn active={tool === 'pin'} onClick={() => setTool('pin')} title="Пін" hotkey="1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </ToolBtn>
          <ToolBtn active={tool === 'rect'} onClick={() => setTool('rect')} title="Область" hotkey="2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
          </ToolBtn>
          <ToolBtn active={tool === 'arrow'} onClick={() => setTool('arrow')} title="Стрілка" hotkey="3">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 19L19 5"/><path d="M8 5h11v11"/></svg>
          </ToolBtn>
          <ToolBtn active={tool === 'eraser'} onClick={() => setTool('eraser')} title="Ластик" hotkey="4">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20H20V20Z"/>
              <path d="M17.5 11.5L12 17"/>
            </svg>
          </ToolBtn>
          <ToolBtn active={tool === 'measure'} onClick={() => setTool(t => t === 'measure' ? 'pin' : 'measure')} title="Лінійка" hotkey="5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="8" width="22" height="8" rx="1"/>
              <line x1="5" y1="12" x2="5" y2="16"/><line x1="9" y1="12" x2="9" y2="14"/>
              <line x1="13" y1="12" x2="13" y2="16"/><line x1="17" y1="12" x2="17" y2="14"/>
            </svg>
          </ToolBtn>

          {/* Kebab menu — contains all debug tools + Clear All */}
          <div ref={kebabRef} style={{ position: 'relative' }}>
            <ToolBtn active={showKebab || activeDebug.size > 0} onClick={() => setShowKebab(v => !v)} title="Більше інструментів">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
              {activeDebug.size > 0 && (
                <span style={{ position: 'absolute', top: '5px', right: '5px', width: '5px', height: '5px', borderRadius: '50%', background: 'white' }} />
              )}
            </ToolBtn>
            {showKebab && (
              <div data-buggy-bag="true" style={{
                position: 'absolute', bottom: '44px', right: 0,
                background: 'rgba(20,20,22,0.96)', border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '12px', padding: '6px', minWidth: '220px',
                display: 'flex', flexDirection: 'column', gap: '2px',
                zIndex: 10003,
              }}>
                {/* ── Debug tools section ── */}
                <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 8px 4px' }}>Debug</div>

                {([
                  {
                    id: 'invert' as DebugOverlay, label: 'Інверт кольорів',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20z"/></svg>,
                    hotkey: 'Alt+I'
                  },
                  {
                    id: 'spacing' as DebugOverlay, label: 'Spacing overlay',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 6H3"/><path d="M21 18H3"/><path d="M3 6v12"/><path d="M21 6v12"/></svg>,
                    hotkey: 'Alt+S'
                  },
                  {
                    id: 'auto-bugs' as DebugOverlay, label: 'Автопошук багів',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3 3 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>,
                    hotkey: 'Alt+A'
                  },
                  {
                    id: 'show-code' as DebugOverlay, label: 'Показати код',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
                    hotkey: 'Alt+C'
                  },

                  {
                    id: 'typography' as DebugOverlay, label: 'Шрифти',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>,
                    hotkey: 'Alt+T'
                  },
                ] as const).map(({ id, label, icon, hotkey }) => (
                  <button key={id} type="button" onClick={() => toggleDebug(id)} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '7px 10px', borderRadius: '8px',
                    background: activeDebug.has(id) ? 'rgba(255,255,255,0.07)' : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: activeDebug.has(id) ? 'white' : 'rgba(255,255,255,0.65)',
                    fontSize: '12px', fontWeight: '500', textAlign: 'left', width: '100%', transition: 'all 0.1s',
                  }}>
                    {icon}
                    <span>{label}</span>
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <kbd style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', padding: '1px 4px', flexShrink: 0 }}>{hotkey}</kbd>
                      {/* Toggle switch */}
                      <span style={{
                        width: '28px', height: '16px', borderRadius: '8px',
                        background: activeDebug.has(id) ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.12)',
                        position: 'relative', display: 'inline-block', transition: 'background 0.2s', flexShrink: 0,
                      }}>
                        <span style={{
                          position: 'absolute', top: '2px', left: activeDebug.has(id) ? '14px' : '2px',
                          width: '12px', height: '12px', borderRadius: '50%', background: 'white',
                          transition: 'left 0.2s', display: 'block',
                        }} />
                      </span>
                    </span>
                  </button>
                ))}

                {/* Portal link */}
                {portalUrl && (
                  <>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 6px' }} />
                    <a href={portalUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowKebab(false)}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontSize: '12px', fontWeight: '500', transition: 'all 0.1s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLAnchorElement).style.color = 'white'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.45)'; }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      <span>Перейти в проєкт</span>
                    </a>
                  </>
                )}

                {/* Clear All option in kebab if shapes exist — moved below "go to project" */}
                {shapes.length > 0 && (
                  <>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 6px' }} />
                    <button type="button" onClick={() => { handleClearAll(); setShowKebab(false); }} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '7px 10px', borderRadius: '8px',
                      background: 'transparent', border: 'none',
                      cursor: 'pointer', color: '#ef4444',
                      fontSize: '12px', fontWeight: '500', textAlign: 'left', width: '100%', transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      <span>Очистити всі мітки</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div> {/* end kebab div */}

          {/* Send / Close — always in button row */}
          {shapes.length > 0 && (
            <>
              <button type="button" onClick={handleSend} disabled={sending}
                title="Надіслати (Ctrl+S)"
                style={{ height: '32px', padding: '0 12px', borderRadius: '8px', background: '#4f46e5', color: 'white', border: 'none', cursor: sending ? 'default' : 'pointer', fontSize: '12px', fontWeight: '700', opacity: sending ? 0.7 : 1, transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {sending ? 'Надсилаю...' : (
                  <>
                    <span>Надіслати</span>
                    <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '10px', fontSize: '10px', fontWeight: '800', padding: '0 6px', lineHeight: '18px' }}>
                      {shapes.length}
                    </span>
                  </>
                )}
              </button>
            </>
          )}
          <button type="button" onClick={handleCloseRequest}
            style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'transparent', color: 'rgba(255,255,255,0.35)', border: 'none', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, margin: 0, lineHeight: '30px' }}>
            ✕
          </button>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10003 }}>
          <div style={{ width: '100%', maxWidth: '380px', margin: '0 16px', background: 'rgba(22,22,26,0.99)', borderRadius: '20px', border: '1px solid rgba(139,92,246,0.2)', padding: '22px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>Невідправлені анотації</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px', lineHeight: '1.5' }}>У вас є невідправлені малюнки. Бажаєте надіслати їх перед виходом?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button type="button" onClick={handleSend} disabled={sending} style={{ padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer' }}>
                {sending ? 'Надсилаю...' : 'Надіслати і вийти'}
              </button>
              <button type="button" onClick={handleClearAndExit} style={{ padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: 'none', cursor: 'pointer' }}>
                Очистити і вийти
              </button>
              <button type="button" onClick={() => setShowExitConfirm(false)} style={{ padding: '10px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer' }}>
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
