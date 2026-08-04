import React, { useState, useCallback, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import type { DrawShape, DrawTool, SubmitBugPayload, DebugOverlay, DesignAuditResult, AutoBugResult, TechContext } from '../types';
import { DrawingCanvas } from './DrawingCanvas';
import { ShapeAnnotation } from './ShapeAnnotation';
import { collectTechContext, getPinElementContext } from '../lib/collector';
import { capturePageScreenshot, getCaptureScrollPositions, getCaptureViewport } from '../lib/screenshot';
import type { CaptureScrollPosition, CaptureViewport } from '../lib/screenshot';

interface CaptureModeProps {
  initialTool: DrawTool;
  apiKey: string;
  portalUrl?: string;
  captureViewport?: CaptureViewport;
  captureScrollPositions?: CaptureScrollPosition[];
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
      aria-label={title}
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

function getLuminance(r: number, g: number, b: number) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.722;
}

function getContrast(rgb1: number[], rgb2: number[]) {
  const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

function parseRgb(str: string) {
  const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : null;
}

function runAutoBugScan(ctx: TechContext): { issues: AutoBugResult[], categoryCounts: Record<string, number> } {
  const issues: AutoBugResult[] = [];
  const counts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  
  const addIssue = (cat: string, type: AutoBugResult['category'], msg: string, element?: HTMLElement | Element) => {
    counts[cat] = (counts[cat] || 0) + 1;
    categoryCounts[type] = (categoryCounts[type] || 0) + 1;
    if (type === 'network' || counts[cat] <= 5) issues.push({ category: type, message: msg, element: element as HTMLElement });
  };

  // 1. Broken images & 8. Missing width/height & missing alt
  document.querySelectorAll('img').forEach((img, i) => {
    if ((img as HTMLElement).dataset?.buggyBag) return;
    if (img.naturalWidth === 0 && img.complete) addIssue('broken-img', 'visual', `🖼 Бите зображення: ${img.src.slice(0, 60)}`, img);
    if (!img.hasAttribute('width') && !img.hasAttribute('height')) addIssue('missing-dims', 'visual', `📐 Зображення без width/height: ${img.src.slice(0, 40)}`, img);
    if (!img.hasAttribute('alt')) addIssue('missing-alt', 'a11y', `♿ Зображення без alt: ${img.src.slice(0, 40)}`, img);
  });

  const ids = new Map<string, number>();
  
  document.querySelectorAll('*').forEach(el => {
    if ((el as HTMLElement).closest?.('[data-buggy-bag]')) return;
    const tag = el.tagName.toLowerCase();
    const cls = (el as HTMLElement).className?.toString?.().slice?.(0, 30) ?? '';
    const label = `<${tag}${cls ? ` class="${cls}"` : ''}>`;
    
    // 5. Duplicate IDs
    if (el.id) {
      ids.set(el.id, (ids.get(el.id) || 0) + 1);
      if (ids.get(el.id) === 2) addIssue('duplicate-id', 'other', `🆔 Дублікат ID: #${el.id}`, el);
    }

    const s = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    
    // Overflow issues
    if (s.overflow === 'hidden' || s.overflowX === 'hidden' || s.overflowY === 'hidden') {
      if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) {
        addIssue('overflow', 'visual', `📏 Overflow hidden зі скролом: ${label}`, el);
      }
    }
    
    // 9. Visually truncated text
    if ((s.whiteSpace === 'nowrap' || s.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 2) {
      addIssue('truncated-text', 'visual', `✂ Текст обрізається: ${label}`, el);
    }

    // 12. Elements out of viewport horizontally
    if (rect.right > window.innerWidth + 5 && rect.width > 0) {
      addIssue('out-of-bounds', 'visual', `↔ Елемент виходить за межі екрану по горизонталі: ${label}`, el);
    }

    // Interactive elements analysis
    if (tag === 'a' || tag === 'button' || el.hasAttribute('onclick') || el.getAttribute('role') === 'button') {
      // 2. Too small tap targets
      if (rect.width > 0 && rect.height > 0 && (rect.width < 24 || rect.height < 24)) {
        addIssue('small-tap', 'a11y', `👆 Замала клікабельна зона (${Math.round(rect.width)}x${Math.round(rect.height)}): ${label}`, el);
      }
      
      // 10. Empty buttons/links
      if (tag === 'a' || tag === 'button' || el.getAttribute('role') === 'button') {
        const text = el.textContent?.trim() || '';
        const hasGraphics = el.querySelector('img, svg');
        const hasAria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
        if (!text && !hasGraphics && !hasAria) {
          addIssue('empty-btn', 'a11y', `👻 Порожній клікабельний елемент (без тексту/іконок/aria): ${label}`, el);
        }
      }
    }

    // 3. Broken links
    if (tag === 'a') {
      const href = el.getAttribute('href');
      if (href === '#' || href === 'javascript:void(0)' || href === '') {
        addIssue('broken-link', 'other', `🔗 Пусте/заглушкове посилання: ${label}`, el);
      }
    }

    // 4. Form inputs without labels
    if (['input', 'textarea', 'select'].includes(tag)) {
      const type = el.getAttribute('type');
      if (type !== 'hidden' && type !== 'submit' && type !== 'button') {
        const hasAria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title');
        const hasIdLabel = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
        const insideLabel = el.closest('label');
        if (!hasAria && !hasIdLabel && !insideLabel) {
          addIssue('missing-label', 'a11y', `📝 Form input без label/aria-label: ${label}`, el);
        }
      }
    }

    // 1. Text contrast < WCAG AA
    if (el.childNodes.length > 0 && Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim().length! > 0)) {
      const fg = parseRgb(s.color);
      let bgEl: Element | null = el;
      let bgStr = '';
      while (bgEl) {
        const bgS = window.getComputedStyle(bgEl);
        if (bgS.backgroundColor && bgS.backgroundColor !== 'rgba(0, 0, 0, 0)' && bgS.backgroundColor !== 'transparent') {
          bgStr = bgS.backgroundColor;
          break;
        }
        bgEl = bgEl.parentElement;
      }
      const bg = bgStr ? parseRgb(bgStr) : [255,255,255]; // fallback to white
      if (fg && bg) {
        const contrast = getContrast(fg, bg);
        const isLarge = parseInt(s.fontSize) >= 18 || (parseInt(s.fontSize) >= 14 && parseInt(s.fontWeight) >= 700);
        const req = isLarge ? 3 : 4.5;
        if (contrast < req) {
          addIssue('contrast', 'visual', `🎨 Низький контраст (${contrast.toFixed(1)}:1, потрібно ${req}:1): текст ${s.color} на фоні ${bgStr || 'rgb(255, 255, 255)'}`, el);
        }
      }
    }
    
    // 11. Mixed content
    if (window.location.protocol === 'https:') {
      const src = el.getAttribute('src') || el.getAttribute('href') || '';
      if (src.startsWith('http://')) {
        addIssue('mixed-content', 'network', `🔓 Mixed content (HTTP на HTTPS): ${label}`, el);
      }
    }
  });

  try {
    // 6. Console warnings and errors
    if (ctx?.consoleErrors?.length) {
      ctx.consoleErrors.forEach((e: any) => {
        addIssue(e.level === 'warn' ? 'console-warn' : 'console-error', 'console', `${e.level === 'warn' ? '⚠️' : '❌'} Console ${e.level}: ${String(e.message).slice(0, 80)}`);
      });
    }
    // 7. Slow network requests
    if (ctx?.networkRequests?.length) {
      ctx.networkRequests.forEach((req: any) => {
        if (req.durationMs > 2000) {
          addIssue('slow-network', 'network', `🐢 Повільний запит (>2s, ${Math.round(req.durationMs)}ms): ${req.method} ${req.url.slice(0, 50)}`);
        }
      });
    }
  } catch {}

  return { issues, categoryCounts };
}

function runDesignAudit(): DesignAuditResult {
  const fonts = new Map<string, { count: number; elements: HTMLElement[] }>();
  const fontSizes = new Map<string, { count: number; elements: HTMLElement[] }>();
  const colors = new Map<string, { count: number; elements: HTMLElement[] }>();
  const spacings = new Map<string, { count: number; elements: HTMLElement[] }>();
  const borderRadii = new Map<string, { count: number; elements: HTMLElement[] }>();
  const shadows = new Map<string, { count: number; elements: HTMLElement[] }>();

  const normalizeColor = (str: string) => str.replace(/\s+/g, '').toLowerCase();

  const addMetric = (map: Map<string, { count: number; elements: HTMLElement[] }>, key: string, el: HTMLElement) => {
    if (!map.has(key)) map.set(key, { count: 0, elements: [] });
    const item = map.get(key)!;
    item.count += 1;
    if (item.elements.length < 50) item.elements.push(el); // Limit to 50 for performance
  };

  document.querySelectorAll('*').forEach(el => {
    if ((el as HTMLElement).closest?.('[data-buggy-bag]')) return;
    const htmlEl = el as HTMLElement;
    if (htmlEl.offsetParent === null && htmlEl !== document.body && htmlEl !== document.documentElement) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const s = window.getComputedStyle(el);

    const ff = s.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    if (ff) addMetric(fonts, ff, htmlEl);
    if (s.fontSize) addMetric(fontSizes, s.fontSize, htmlEl);

    if (s.color && s.color !== 'rgba(0,0,0,0)' && s.color !== 'transparent') {
      addMetric(colors, normalizeColor(s.color), htmlEl);
    }
    if (s.backgroundColor && s.backgroundColor !== 'rgba(0,0,0,0)' && s.backgroundColor !== 'transparent') {
      addMetric(colors, normalizeColor(s.backgroundColor), htmlEl);
    }

    const pushSpacing = (val: string) => {
      if (val && val !== '0px' && val !== 'normal') addMetric(spacings, val, htmlEl);
    };
    pushSpacing(s.marginTop); pushSpacing(s.marginBottom); pushSpacing(s.marginLeft); pushSpacing(s.marginRight);
    pushSpacing(s.paddingTop); pushSpacing(s.paddingBottom); pushSpacing(s.paddingLeft); pushSpacing(s.paddingRight);
    pushSpacing(s.gap);

    if (s.borderRadius && s.borderRadius !== '0px') {
      addMetric(borderRadii, s.borderRadius, htmlEl);
    }
    if (s.boxShadow && s.boxShadow !== 'none') {
      addMetric(shadows, s.boxShadow, htmlEl);
    }
  });

  const sortAndLimit = (map: Map<string, { count: number; elements: HTMLElement[] }>) => {
    return Array.from(map.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .map(([value, item]) => ({ value, count: item.count, elements: item.elements }));
  };

  return {
    fonts: sortAndLimit(fonts),
    fontSizes: sortAndLimit(fontSizes),
    colors: sortAndLimit(colors),
    spacings: sortAndLimit(spacings),
    borderRadii: sortAndLimit(borderRadii),
    shadows: sortAndLimit(shadows),
  };
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

const isSafeHref = (h?: string) => !!h && /^(https?:|mailto:|tel:|\/|#)/i.test(h);

export function CaptureMode({ initialTool, apiKey, portalUrl, captureViewport, captureScrollPositions, onSend, onCancel }: CaptureModeProps) {
  const [tool, setTool]         = useState<DrawTool>(initialTool);
  const [shapes, setShapes]     = useState<DrawShape[]>([]);
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  const [shapeAttachments, setShapeAttachments] = useState<Record<string, { name: string; type: string; base64: string }[]>>({});
  const [pendingShape, setPendingShape] = useState<{ shape: DrawShape; isNew: boolean } | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [sending, setSending]   = useState(false);
  const [cursor, setCursor]     = useState<{ x: number; y: number } | null>(null);
  const [showKebab, setShowKebab] = useState(false);
  const [responsiveSize, setResponsiveSize] = useState({w: 390, h: 844, name: 'Phone'});
  const [hoveredShapeId, setHoveredShapeId] = useState<string | null>(null);
  const [activeDebug, setActiveDebug] = useState<Set<DebugOverlay>>(new Set());
  const [autoBugResults, setAutoBugResults] = useState<{ issues: AutoBugResult[], categoryCounts: Record<string, number> } | null>(null);
  const [designAuditResult, setDesignAuditResult] = useState<DesignAuditResult | null>(null);
  const [hoveredCode, setHoveredCode] = useState<string>('');
  const [hoveredStyle, setHoveredStyle] = useState<string>('');
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'code'|'styles'>('code');
  const [auditTab, setAuditTab] = useState<string>('fonts');
  const [autoBugTab, setAutoBugTab] = useState<AutoBugResult['category']>('visual');
  const [codeWinPos, setCodeWinPos] = useState({ x: typeof window !== 'undefined' ? window.innerWidth - 440 : 800, y: 24 });
  const [bugWinPos, setBugWinPos] = useState({ x: 24, y: 24 });
  const [auditWinPos, setAuditWinPos] = useState({ x: 24, y: typeof window !== 'undefined' ? window.innerHeight - 480 : 400 });
  // Below this width the floating, draggable 420px-wide panels (inspector,
  // auto-bug results, design audit) no longer fit — switch them to a
  // full-width bottom sheet instead. Matters for the Адаптивність mockup
  // (narrow iframe, real mouse) and for a manually-shrunk desktop browser;
  // real touch devices never reach this toolbar (see MobileCaptureMode).
  const [isNarrowViewport, setIsNarrowViewport] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const onResize = () => setIsNarrowViewport(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // True if this CaptureMode instance is already running inside an iframe —
  // i.e. it IS the Адаптивність mockup (or some other embed). Never offer
  // the "Адаптивність" toggle in that case, or it could nest iframes forever.
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const [auditHoveredElements, setAuditHoveredElements] = useState<HTMLElement[]>([]);
  const [lastCopiedColor, setLastCopiedColor] = useState<string | null>(null);
  const dragRef = useRef<'code' | 'bug' | 'audit' | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const kebabRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const glowRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;

  // A report represents one viewport. Keep the document at the activation
  // scroll position so fixed canvas coordinates cannot drift from its frame.
  useEffect(() => {
    const lockedViewport = captureViewport ?? getCaptureViewport();
    const lockedElements = captureScrollPositions ?? getCaptureScrollPositions();
    let restoring = false;
    const restoreScroll = () => {
      if (restoring) return;

      const windowMoved = window.scrollX !== lockedViewport.scrollX || window.scrollY !== lockedViewport.scrollY;
      const movedElements = lockedElements.filter(({ element, scrollLeft, scrollTop }) =>
        element.isConnected && (element.scrollLeft !== scrollLeft || element.scrollTop !== scrollTop)
      );
      if (!windowMoved && movedElements.length === 0) return;

      restoring = true;
      if (windowMoved) window.scrollTo(lockedViewport.scrollX, lockedViewport.scrollY);
      movedElements.forEach(({ element, scrollLeft, scrollTop }) => {
        element.scrollLeft = scrollLeft;
        element.scrollTop = scrollTop;
      });
      requestAnimationFrame(() => { restoring = false; });
    };

    window.addEventListener('scroll', restoreScroll, { passive: true });
    lockedElements.forEach(({ element }) => element.addEventListener('scroll', restoreScroll, { passive: true }));
    restoreScroll();

    return () => {
      window.removeEventListener('scroll', restoreScroll);
      lockedElements.forEach(({ element }) => element.removeEventListener('scroll', restoreScroll));
    };
  }, [captureViewport, captureScrollPositions]);

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

  const handleAnnotationConfirm = useCallback((shapeId: string, text: string, attachments?: { name: string; type: string; base64: string }[]) => {
    setAnnotations(prev => {
      const next = { ...prev, [shapeId]: text };
      try { 
        localStorage.setItem(`BUGGY_BAG_DRAFT_${window.location.pathname}`, JSON.stringify({ shapes, annotations: next })); 
        window.dispatchEvent(new CustomEvent('buggy-bag:draft-changed'));
      } catch {}
      return next;
    });
    setShapeAttachments(prev => {
      const next = { ...prev };
      if (attachments && attachments.length > 0) {
        next[shapeId] = attachments;
      } else {
        delete next[shapeId];
      }
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

    // Konva renders two <canvas> per Layer: [0]=scene (visible), [1]=hit (transparent).
    // We always want the first one (scene canvas) — grab it before the host hides.
    const host = document.querySelector('#buggy-bag-host') as HTMLElement | null;
    const annotationCanvas = host?.shadowRoot?.querySelector('canvas') ?? null;

    // Capture the live page and the annotation canvas in the same frame. The
    // old activation-time base image became stale when a nested scroller or a
    // React-rendered container changed after capture mode was opened.
    const viewport = getCaptureViewport();
    const { imageUrl, fallbackUsed } = await capturePageScreenshot(annotationCanvas, viewport);

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
    if (designAuditResult) {
      const stripped = {
        fonts: designAuditResult.fonts.map(({value,count}) => ({value,count})),
        fontSizes: designAuditResult.fontSizes.map(({value,count}) => ({value,count})),
        colors: designAuditResult.colors.map(({value,count}) => ({value,count})),
        spacings: designAuditResult.spacings.map(({value,count}) => ({value,count})),
        borderRadii: designAuditResult.borderRadii.map(({value,count}) => ({value,count})),
        shadows: designAuditResult.shadows.map(({value,count}) => ({value,count})),
      };
      freshTechContext.designAudit = stripped;
    }

    if (autoBugResults) {
      const issues = autoBugResults.issues;
      const hasA11y = issues.some(i => i.category === 'a11y');
      const countVisual = issues.filter(i => i.category === 'visual').length;
      if (hasA11y || countVisual >= 3) {
        const severities = ['low', 'medium', 'high', 'critical'];
        const currentIdx = severities.indexOf(freshTechContext.autoSeverity);
        const targetIdx = severities.indexOf('medium');
        if (currentIdx !== -1 && currentIdx < targetIdx) {
          freshTechContext.autoSeverity = 'medium';
        }
      }
    }

    let finalDescription = Object.values(annotations).filter(Boolean).join(' | ') || 'Без опису';
    if (fallbackUsed) {
      finalDescription += '\n\n⚠️ Увага: Цей скріншот було зроблено у спрощеному режимі (fallback), тому деякі шрифти або картинки можуть бути відсутні через налаштування безпеки сайту (CORS).';
    }

    onSend({
      api_key: apiKey,
      base64_image: imageUrl,
      shapes,
      annotations,
      shape_attachments: Object.keys(shapeAttachments).length > 0 ? shapeAttachments : undefined,
      description: finalDescription,
      tech_context: freshTechContext
    });
  }, [shapes, annotations, shapeAttachments, apiKey, onSend, sending, designAuditResult]);

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
        setDesignAuditResult(null);
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
        if (overlay === 'design-audit') setDesignAuditResult(null);
        if (overlay === 'show-code') document.body.style.cursor = '';
      } else {
        next.add(overlay);
        if (overlay === 'spacing') enableSpacingOverlay();
        if (overlay === 'zoom') enableZoom();
        if (overlay === 'invert') document.body.style.filter = 'invert(1) hue-rotate(180deg)';
        if (overlay === 'auto-bugs') { setAutoBugResults(runAutoBugScan(collectTechContext())); }
        if (overlay === 'design-audit') { setDesignAuditResult(runDesignAudit()); }
        if (overlay === 'show-code') document.body.style.cursor = 'crosshair';
      }
      return next;
    });
    setShowKebab(false);
  }, []);


  // Keyboard hotkeys: 1=pin 2=rect 3=arrow 4=measure, Ctrl+S=send
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Events leaving our Shadow DOM are retargeted to #buggy-bag-host, so
      // e.target cannot tell whether the user is actually typing in the
      // annotation textarea. Inspect the original composed path instead.
      const isTyping = e.composedPath().some(target => {
        if (!(target instanceof HTMLElement)) return false;
        const tag = target.tagName.toLowerCase();
        return tag === 'textarea' || tag === 'input' || tag === 'select' ||
          target.isContentEditable || target.getAttribute('role') === 'textbox';
      });
      if (isTyping) return;
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
        if (e.code === 'KeyI') { e.preventDefault(); toggleDebug('invert'); }
        if (e.code === 'KeyS') { e.preventDefault(); toggleDebug('spacing'); }
        if (e.code === 'KeyA') { e.preventDefault(); toggleDebug('auto-bugs'); }
        if (e.code === 'KeyD') { e.preventDefault(); toggleDebug('design-audit'); }
        if (e.code === 'KeyC') { e.preventDefault(); toggleDebug('show-code'); }
        if (e.code === 'KeyL') { e.preventDefault(); toggleDebug('zoom'); }
        if (e.code === 'KeyM' && !isInIframe) { e.preventDefault(); toggleDebug('responsive'); }
      }
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pendingShape, showExitConfirm, shapes, handleSend, toggleDebug, isInIframe]);

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
      else if (dragRef.current === 'audit') setAuditWinPos({ x: e.clientX - dragOffsetRef.current.x, y: e.clientY - dragOffsetRef.current.y });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const startDrag = (e: React.MouseEvent, type: 'code' | 'bug' | 'audit') => {
    dragRef.current = type;
    const rect = (e.currentTarget as HTMLElement).closest('[data-buggy-bag]')?.getBoundingClientRect();
    if (rect) dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const highlightHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/(&lt;\/?)([a-zA-Z0-9\-]+)(.*?)(&gt;)/g, (match, p1, p2, p3, p4) => {
        const highlightedAttrs = p3.replace(/([a-zA-Z0-9\-]+)="([^"]*)"/g, '<span style="color:#e2cb6b">$1</span>=<span style="color:#a3be8c">"$2"</span>');
        return `${p1}<span style="color:#88c0d0">${p2}</span>${highlightedAttrs}${p4}`;
      })
      .replace(/(\/\*.*?\*\/)/g, '<span style="color:#616e88">$1</span>');
  };

  // Live Inspector logic
  useEffect(() => {
    if (!activeDebug.has('show-code') || !cursor) return;
    const els = document.elementsFromPoint(cursor.x, cursor.y);
    const target = els.find(el => !el.closest?.('[data-buggy-bag]'));
    if (target) {
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
      setHoveredCode(highlightHtml(`/* ${breadcrumb} */\n\n${html}`));
      
      const style = window.getComputedStyle(target);
      const typ = `Шрифт: ${style.fontFamily}\nРозмір: ${style.fontSize}\nВага: ${style.fontWeight}\nКолір: ${style.color}\nВисота рядка: ${style.lineHeight}\nLetter-spacing: ${style.letterSpacing}\n\nDisplay: ${style.display}\nPosition: ${style.position}\nMargin: ${style.margin}\nPadding: ${style.padding}\nBorder-width: ${style.borderWidth}\nWidth/Height: ${style.width} x ${style.height}`;
      setHoveredStyle(typ);
      setHoveredRect(target.getBoundingClientRect());
    } else {
      setHoveredRect(null);
    }
  }, [cursor, activeDebug, formatNode]);

  const handleAuditClick = useCallback((category: string, value: string, count: number, elements: HTMLElement[] = []) => {
    let x = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
    let y = typeof window !== 'undefined' ? window.innerHeight / 2 : 500;

    if (elements.length > 0 && elements[0]) {
      const rect = elements[0].getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    const id = 'shape-' + Date.now();
    const shape: DrawShape = {
      id,
      type: 'pin',
      x,
      y,
      pinNumber: shapes.filter(s => s.type === 'pin').length + 1
    };

    setShapes(p => [...p, shape]);
    setAnnotations(p => ({ ...p, [id]: `Аудит (${category}): ${value} використовується ${count} разів.` }));
    setPendingShape({ shape, isNew: true });
  }, [shapes]);

  const handleBugClick = useCallback((issue: AutoBugResult) => {
    let x = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
    let y = typeof window !== 'undefined' ? window.innerHeight / 2 : 500;

    if (issue.element) {
      const rect = issue.element.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    const id = 'shape-' + Date.now();
    const shape: DrawShape = {
      id,
      type: 'pin',
      x,
      y,
      pinNumber: shapes.filter(s => s.type === 'pin').length + 1
    };

    setShapes(p => [...p, shape]);
    setAnnotations(p => ({ ...p, [id]: `Авто-пошук:\n${issue.message}` }));
    setPendingShape({ shape, isNew: true });
  }, [shapes]);

  const divider = <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)', margin: '0 2px' }} />;

  return (
    <div
      ref={hostRef}
      data-buggy-bag="true"
      style={{ position: 'fixed', inset: 0, zIndex: 10000, userSelect: 'none' }}
      onPointerDown={e => e.stopPropagation()}
      onPointerUp={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onMouseUp={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onWheel={e => {
        e.stopPropagation();
      }}
    >
      {/* Animated glow ring — hidden instantly via ref during eyedropper */}
      <style>{`
        @keyframes bb-glow-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .bb-scroll-tabs::-webkit-scrollbar { height: 4px; }
        .bb-scroll-tabs::-webkit-scrollbar-track { background: transparent; }
        .bb-scroll-tabs::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .bb-scroll-tabs::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.4); }
      `}</style>
      
      {/* DevTools Element Highlighter */}
      {activeDebug.has('show-code') && hoveredRect && (
        <div id="buggy-bag-highlighter" style={{
          position: 'fixed', top: hoveredRect.top, left: hoveredRect.left,
          width: hoveredRect.width, height: hoveredRect.height,
          background: 'rgba(56, 189, 248, 0.2)', border: '1px solid rgba(56, 189, 248, 0.8)',
          pointerEvents: 'none', zIndex: 9999, transition: 'all 0.1s ease-out'
        }} />
      )}
      
      {/* Design Audit Element Highlighter */}
      {auditHoveredElements.map((el, i) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return null;
        return (
          <div key={i} style={{
            position: 'fixed', top: r.top, left: r.left,
            width: r.width, height: r.height,
            background: 'rgba(16, 185, 129, 0.2)', border: '2px solid rgba(16, 185, 129, 0.8)',
            pointerEvents: 'none', zIndex: 9999, transition: 'all 0.1s ease-out'
          }} />
        );
      })}
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
      {activeDebug.has('show-code') && (
        <div id="buggy-bag-code-window" data-buggy-bag="true" style={{
          position: 'fixed',
          ...(isNarrowViewport
            ? { left: 0, right: 0, bottom: 0, top: 'auto' as const, width: 'auto' }
            : { top: codeWinPos.y + 'px', left: codeWinPos.x + 'px', width: '420px' }),
          maxHeight: isNarrowViewport ? '70vh' : 'calc(100vh - 48px)',
          background: 'rgba(22,22,26,0.75)', border: '1px solid rgba(56,189,248,0.3)',
          borderRadius: isNarrowViewport ? '16px 16px 0 0' : '16px', padding: '0',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          fontFamily: 'monospace', overflow: 'hidden', display: pendingShape ? 'none' : 'flex', flexDirection: 'column',
          zIndex: 10015,
        }}>
          {/* Header (Draggable on desktop; fixed bottom-sheet on narrow viewports) */}
          <div onMouseDown={isNarrowViewport ? undefined : (e => startDrag(e, 'code'))} style={{
            padding: '16px 20px', cursor: isNarrowViewport ? 'default' : 'grab', background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(56,189,248,0.9)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Інспектор елементів
            </div>
            <button type="button" onClick={() => setActiveDebug(prev => { const n = new Set(prev); n.delete('show-code'); return n; })} style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
              width: '20px', height: '20px', cursor: 'pointer', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.8)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          
          <div className="bb-scroll-tabs" style={{ display: 'flex', flexWrap: 'wrap', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '8px' }}>
            <button type="button" onClick={() => setInspectorTab('code')} style={{ padding: '6px 12px', background: inspectorTab === 'code' ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '999px', color: inspectorTab === 'code' ? '#38bdf8' : 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>Код</button>
            <button type="button" onClick={() => setInspectorTab('styles')} style={{ padding: '6px 12px', background: inspectorTab === 'styles' ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '999px', color: inspectorTab === 'styles' ? '#38bdf8' : 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>Стилі</button>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            {inspectorTab === 'code' && (
              <div 
                style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: '1.5' }}
                dangerouslySetInnerHTML={{ __html: hoveredCode }} 
              />
            )}
            {inspectorTab === 'styles' && (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {hoveredStyle}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Auto-bug results panel (Under Canvas) */}
      {autoBugResults && (
        <div id="buggy-bag-autobug-window" data-buggy-bag="true" style={{
          position: 'fixed',
          ...(isNarrowViewport
            ? { left: 0, right: 0, bottom: 0, top: 'auto' as const, width: 'auto' }
            : { top: bugWinPos.y + 'px', left: bugWinPos.x + 'px', width: '420px' }),
          maxHeight: isNarrowViewport ? '70vh' : 'calc(100vh - 48px)',
          background: 'rgba(22,22,26,0.75)', border: '1px solid rgba(244,63,94,0.3)',
          borderRadius: isNarrowViewport ? '16px 16px 0 0' : '16px', padding: '0',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          fontFamily: 'monospace', overflow: 'hidden', display: pendingShape ? 'none' : 'flex', flexDirection: 'column',
          zIndex: 10015,
        }}>
          {/* Header (Draggable on desktop; fixed bottom-sheet on narrow viewports) */}
          <div onMouseDown={isNarrowViewport ? undefined : (e => startDrag(e, 'bug'))} style={{
            padding: '16px 20px', cursor: isNarrowViewport ? 'default' : 'grab', background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(244,63,94,0.9)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Автопошук багів
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" onClick={() => setAutoBugResults(runAutoBugScan())} title="Перерахувати" style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                width: '20px', height: '20px', cursor: 'pointer', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.26l3.08 2.69"/></svg>
              </button>
              <button type="button" onClick={() => toggleDebug('auto-bugs')} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                width: '20px', height: '20px', cursor: 'pointer', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.8)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          
          <div className="bb-scroll-tabs" style={{ display: 'flex', flexWrap: 'wrap', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '8px' }}>
            {(['visual', 'network', 'a11y', 'console', 'other'] as const).map(cat => {
              const title = cat === 'visual' ? 'Візуальні' : cat === 'network' ? 'Мережеві' : cat === 'a11y' ? 'Доступність' : cat === 'console' ? 'Консоль' : 'HTML';
              const count = autoBugResults.categoryCounts[cat] || 0;
              const isActive = autoBugTab === cat;
              return (
                <button key={cat} type="button" onClick={() => setAutoBugTab(cat)} style={{ padding: '6px 12px', background: isActive ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '999px', color: isActive ? '#f43f5e' : 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {title} {count > 0 && <span style={{ background: isActive ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '10px', fontSize: '9px', color: isActive ? '#f43f5e' : 'inherit' }}>{count}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ padding: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: '1.5', overflowY: 'auto' }}>
            {(() => {
              const catBugs = autoBugResults.issues.filter(b => b.category === autoBugTab);
              const totalCount = autoBugResults.categoryCounts[autoBugTab] || 0;
              const hiddenCount = totalCount - catBugs.length;
              return (
                <div>
                  {catBugs.length > 0 
                    ? (
                      <>
                        {catBugs.map((b, i) => (
                          <div 
                            key={i} 
                            onClick={() => handleBugClick(b)} 
                            style={{ 
                              marginBottom: '8px', cursor: 'pointer',
                              color: 'rgba(255,255,255,0.85)', padding: '10px 12px',
                              background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
                              transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.05)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
                          >
                            {b.message}
                          </div>
                        ))}
                        {hiddenCount > 0 && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', marginTop: '4px' }}>...і ще {hiddenCount} подібних</div>}
                        
                        <button 
                          onClick={() => {
                            const text = catBugs.map(b => b.message).join(' | ');
                            const id = 'shape-' + Date.now();
                            setShapes(prev => [...prev, { id, type: 'pin', x: window.innerWidth/2, y: window.innerHeight/2, pinNumber: prev.filter(s=>s.type==='pin').length + 1 }]);
                            setAnnotations(prev => ({ ...prev, [id]: `Авто-пошук (${autoBugTab}):\n` + text }));
                            toggleDebug('auto-bugs');
                          }}
                          style={{ 
                            marginTop: '16px', background: '#ffffff', color: '#18181b', border: 'none', 
                            padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', 
                            width: '100%', fontWeight: 'bold', transition: 'background 0.2s' 
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#e5e7eb')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
                        >
                          Додати все
                        </button>
                      </>
                    )
                    : <div style={{ color: '#10b981' }}>Відсутні</div>
                  }
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Design Audit panel */}
      {activeDebug.has('design-audit') && designAuditResult && (
        <div id="buggy-bag-design-audit-window" data-buggy-bag="true" style={{
          position: 'fixed',
          ...(isNarrowViewport
            ? { left: 0, right: 0, bottom: 0, top: 'auto' as const, width: 'auto' }
            : { top: auditWinPos.y + 'px', left: auditWinPos.x + 'px', width: '420px' }),
          maxHeight: isNarrowViewport ? '70vh' : 'calc(100vh - 48px)',
          background: 'rgba(22,22,26,0.75)', border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: isNarrowViewport ? '16px 16px 0 0' : '16px', padding: '0',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
          fontFamily: 'monospace', overflow: 'hidden', display: pendingShape ? 'none' : 'flex', flexDirection: 'column',
          zIndex: 10015,
        }}>
          {/* Header */}
          <div onMouseDown={isNarrowViewport ? undefined : (e => startDrag(e, 'audit'))} style={{
            padding: '16px 20px', cursor: isNarrowViewport ? 'default' : 'grab', background: 'rgba(255,255,255,0.03)',
            borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(16,185,129,0.9)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Дизайн-аудит
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" onClick={() => setDesignAuditResult(runDesignAudit())} title="Перерахувати" style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                width: '20px', height: '20px', cursor: 'pointer', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.26l3.08 2.69"/></svg>
              </button>
              <button type="button" onClick={() => toggleDebug('design-audit')} style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%',
                width: '20px', height: '20px', cursor: 'pointer', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.8)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          
          <div className="bb-scroll-tabs" style={{ display: 'flex', flexWrap: 'wrap', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '8px' }}>
            {([
              { id: 'fonts', label: 'Шрифти', data: designAuditResult.fonts },
              { id: 'fontSizes', label: 'Розміри шрифтів', data: designAuditResult.fontSizes },
              { id: 'colors', label: 'Кольори', data: designAuditResult.colors },
              { id: 'spacings', label: 'Відступи', data: designAuditResult.spacings },
              { id: 'borderRadii', label: 'Border-radius', data: designAuditResult.borderRadii },
              { id: 'shadows', label: 'Тіні', data: designAuditResult.shadows }
            ] as const).map(tab => {
              const isActive = auditTab === tab.id;
              return (
                <button key={tab.id} type="button" onClick={() => setAuditTab(tab.id)} style={{ padding: '6px 12px', background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)', border: 'none', borderRadius: '999px', color: isActive ? '#10b981' : 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {tab.label} <span style={{ background: isActive ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '10px', fontSize: '9px', color: isActive ? '#10b981' : 'inherit' }}>{tab.data.length}</span>
                </button>
              );
            })}
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            {(designAuditResult.fonts.length > 8 || designAuditResult.colors.length > 20 || designAuditResult.spacings.length > 15) && (
              <div style={{ padding: '10px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', color: '#fbbf24', fontSize: '11px', lineHeight: '1.4' }}>
                ⚠️ Забагато значень! Рекомендуємо звести до дизайн-системи.
              </div>
            )}
            <div onMouseLeave={() => setAuditHoveredElements([])}>
              {(() => {
                const tabsConfig = [
                  { id: 'fonts', label: 'Шрифти', data: designAuditResult.fonts, limit: 5, render: (f: any, i: number) => <div key={i} onClick={() => handleAuditClick('Шрифт', f.value, f.count, f.elements)} onMouseEnter={() => setAuditHoveredElements(f.elements || [])} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#e5e7eb', cursor: 'pointer' }}>{f.value} <span style={{ color: 'rgba(255,255,255,0.3)' }}>×{f.count}</span></div> },
                  { id: 'fontSizes', label: 'Розміри шрифтів', data: designAuditResult.fontSizes, limit: 8, render: (f: any, i: number) => <div key={i} onClick={() => handleAuditClick('Розмір шрифту', f.value, f.count, f.elements)} onMouseEnter={() => setAuditHoveredElements(f.elements || [])} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#e5e7eb', cursor: 'pointer' }}>{f.value} <span style={{ color: 'rgba(255,255,255,0.3)' }}>×{f.count}</span></div> },
                  { id: 'colors', label: 'Кольори', data: designAuditResult.colors, limit: 15, render: (c: any, i: number) => (
                    <div key={i} onClick={() => handleAuditClick('Колір', c.value, c.count, c.elements)} onMouseEnter={() => setAuditHoveredElements(c.elements || [])} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px 2px 4px', borderRadius: '4px', fontSize: '11px', color: '#e5e7eb', cursor: 'pointer' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: c.value, border: '1px solid rgba(255,255,255,0.1)' }} />
                      <span>{c.value}</span> <span style={{ color: 'rgba(255,255,255,0.3)' }}>×{c.count}</span>
                    </div>
                  ) },
                  { id: 'spacings', label: 'Відступи', data: designAuditResult.spacings, limit: 10, render: (s: any, i: number) => <div key={i} onClick={() => handleAuditClick('Відступ', s.value, s.count, s.elements)} onMouseEnter={() => setAuditHoveredElements(s.elements || [])} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#e5e7eb', cursor: 'pointer' }}>{s.value} <span style={{ color: 'rgba(255,255,255,0.3)' }}>×{s.count}</span></div> },
                  { id: 'borderRadii', label: 'Border-radius', data: designAuditResult.borderRadii, limit: 5, render: (b: any, i: number) => <div key={i} onClick={() => handleAuditClick('Border-radius', b.value, b.count, b.elements)} onMouseEnter={() => setAuditHoveredElements(b.elements || [])} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#e5e7eb', cursor: 'pointer' }}>{b.value} <span style={{ color: 'rgba(255,255,255,0.3)' }}>×{b.count}</span></div> },
                  { id: 'shadows', label: 'Тіні', data: designAuditResult.shadows, limit: 5, render: (s: any, i: number) => <div key={i} onClick={() => handleAuditClick('Тінь', s.value, s.count, s.elements)} onMouseEnter={() => setAuditHoveredElements(s.elements || [])} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#e5e7eb', cursor: 'pointer' }}>{s.value} <span style={{ color: 'rgba(255,255,255,0.3)' }}>×{s.count}</span></div> }
                ];
                const activeCfg = tabsConfig.find(t => t.id === auditTab) || tabsConfig[0];
                return (
                  <>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{activeCfg.label} ({activeCfg.data.length})</span>
                      <span style={{ color: activeCfg.data.length > activeCfg.limit ? '#fbbf24' : '#10b981' }}>Рекомендовано: до {activeCfg.limit}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {activeCfg.data.map(activeCfg.render)}
                    </div>
                  </>
                );
              })()}
            </div>
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
              initialAttachments={shapeAttachments[pendingShape.shape.id]}
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
                position: 'absolute', bottom: '44px',
                background: 'rgba(20,20,22,0.96)', border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '12px', padding: '6px', width: '242px', right: '-8px',
                display: 'flex', flexDirection: 'column', gap: '2px',
                zIndex: 10030,
              }}>
                {/* ── Інспектор ── */}
                <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 8px 4px' }}>Інспектор</div>
                {([
                  {
                    id: 'show-code' as DebugOverlay, label: 'Інспектор елементів',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
                    hotkey: 'Alt+C'
                  }
                ] as const).map(({ id, label, icon, hotkey }) => (
                  <button key={id} type="button" aria-label={label} onClick={() => toggleDebug(id)} style={{
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

                {/* ── Аналіз ── */}
                <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 8px 4px' }}>Аналіз</div>
                {([
                  {
                    id: 'auto-bugs' as DebugOverlay, label: 'Автопошук багів',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2l1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3 3 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>,
                    hotkey: 'Alt+A'
                  },
                  {
                    id: 'design-audit' as DebugOverlay, label: 'Дизайн-аудит',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
                    hotkey: 'Alt+D'
                  }
                ] as const).map(({ id, label, icon, hotkey }) => (
                  <button key={id} type="button" aria-label={label} onClick={() => toggleDebug(id)} style={{
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

                {/* ── Огляд сторінки ── */}
                <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 8px 4px' }}>Огляд сторінки</div>
                {([
                  {
                    id: 'invert' as DebugOverlay, label: 'Інверт кольорів',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20z"/></svg>,
                    hotkey: 'Alt+I'
                  },
                  {
                    id: 'spacing' as DebugOverlay, label: 'Контур елементів',
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 6H3"/><path d="M21 18H3"/><path d="M3 6v12"/><path d="M21 6v12"/></svg>,
                    hotkey: 'Alt+S'
                  }
                ] as const).map(({ id, label, icon, hotkey }) => (
                  <button key={id} type="button" aria-label={label} onClick={() => toggleDebug(id)} style={{
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

                {/* ── Адаптивність — mobile preview in a self-iframe. Hidden when this
                     CaptureMode is already running inside an iframe, so the mockup
                     can never nest itself. ── */}
                {!isInIframe && (
                  <>
                    <div style={{ fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 8px 4px' }}>Перегляд</div>
                    <button type="button" aria-label="Адаптивність" onClick={() => toggleDebug('responsive')} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '7px 10px', borderRadius: '8px',
                      background: activeDebug.has('responsive') ? 'rgba(255,255,255,0.07)' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      color: activeDebug.has('responsive') ? 'white' : 'rgba(255,255,255,0.65)',
                      fontSize: '12px', fontWeight: '500', textAlign: 'left', width: '100%', transition: 'all 0.1s',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
                      <span>Адаптивність</span>
                      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <kbd style={{ fontSize: '9px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', padding: '1px 4px', flexShrink: 0 }}>Alt+M</kbd>
                        <span style={{
                          width: '28px', height: '16px', borderRadius: '8px',
                          background: activeDebug.has('responsive') ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.12)',
                          position: 'relative', display: 'inline-block', transition: 'background 0.2s', flexShrink: 0,
                        }}>
                          <span style={{
                            position: 'absolute', top: '2px', left: activeDebug.has('responsive') ? '14px' : '2px',
                            width: '12px', height: '12px', borderRadius: '50%', background: 'white',
                            transition: 'left 0.2s', display: 'block',
                          }} />
                        </span>
                      </span>
                    </button>
                  </>
                )}

                {/* Portal link */}
                {portalUrl && (
                  <>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 6px' }} />
                    {isSafeHref(portalUrl) ? (
                      <a href={portalUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowKebab(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontSize: '12px', fontWeight: '500', transition: 'all 0.1s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLAnchorElement).style.color = 'white'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.45)'; }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        <span>Перейти в проєкт</span>
                      </a>
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '8px', color: 'rgba(255,255,255,0.45)', fontSize: '12px', fontWeight: '500' }}>
                        Перейти в проєкт
                      </span>
                    )}
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

      {/* Адаптивність — mobile preview mockup. Loads the current page fresh
          inside a same-origin iframe sized like a phone. Inside that iframe
          isRealMobileDevice() correctly stays false (no real touch points),
          so the full CaptureMode toolbar mounts there too — now using the
          bottom-sheet panel layout (isNarrowViewport) instead of MobileCaptureMode.
          The kebab entry that opens this is hidden whenever isInIframe is true,
          so the mockup can never nest itself. */}
      {activeDebug.has('responsive') && (
        <div
          data-buggy-bag="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 10020,
            background: 'rgba(10,10,12,0.92)', backdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px',
          }}
          onClick={() => toggleDebug('responsive')}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleDebug('responsive'); }}
            style={{
              position: 'absolute', top: '24px', right: '24px',
              padding: '8px 16px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)',
              color: 'white', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer', zIndex: 10,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          >
            ✕ Закрити
          </button>

          <div style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '12px' }} onClick={e => e.stopPropagation()}>
            {[
              { name: 'Phone', w: 390, h: 844, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> },
              { name: 'Tablet', w: 820, h: 1180, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> },
              { name: 'Laptop', w: 1280, h: 800, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg> }
            ].map(sz => (
              <button key={sz.name} onClick={() => setResponsiveSize(sz)} style={{
                padding: '12px 16px', borderRadius: '12px', background: responsiveSize.name === sz.name ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.05)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '600',
              }}>
                <span style={{ fontSize: '16px' }}>{sz.icon}</span>
                {sz.name}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.55)', letterSpacing: '0.02em' }}>
            Адаптивний перегляд · {responsiveSize.w}×{responsiveSize.h}
          </div>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: `${responsiveSize.w}px`, height: `${responsiveSize.h}px`, maxHeight: 'calc(100vh - 90px)', maxWidth: 'calc(100vw - 180px)',
              borderRadius: '40px', outline: '8px solid #1c1c1e', outlineOffset: '-8px',
              overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', background: '#000',
              flexShrink: 0, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <iframe
              src={window.location.href}
              title="Адаптивний перегляд"
              style={{ width: '100%', height: '100%', border: 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
