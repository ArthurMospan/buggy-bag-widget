import { toPng } from 'html-to-image';
import html2canvas from 'html2canvas';

export interface CaptureViewport {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
}

export interface ScreenshotResult {
  imageUrl: string;
  fallbackUsed: boolean;
}

export interface CaptureScrollPosition {
  element: HTMLElement;
  scrollLeft: number;
  scrollTop: number;
}

export function getCaptureViewport(): CaptureViewport {
  return {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * Snapshot every independently scrollable container in the inspected page.
 * A report's drawing canvas uses viewport coordinates, so allowing any of
 * these containers to move after the base screenshot is captured would put
 * the page pixels and annotations into different coordinate systems.
 */
export function getCaptureScrollPositions(): CaptureScrollPosition[] {
  const positions: CaptureScrollPosition[] = [];
  const documentScroller = document.scrollingElement;

  const visit = (root: Document | ShadowRoot) => {
    root.querySelectorAll<HTMLElement>('*').forEach(element => {
      if (isWidgetElement(element)) return;

      if (
        element !== documentScroller &&
        element !== document.documentElement &&
        element !== document.body &&
        (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth)
      ) {
        positions.push({
          element,
          scrollLeft: element.scrollLeft,
          scrollTop: element.scrollTop,
        });
      }

      if (element.shadowRoot) visit(element.shadowRoot);
    });
  };

  visit(document);
  return positions;
}

function isWidgetElement(element: Element): boolean {
  return element.id === 'buggy-bag-host' || element.hasAttribute('data-buggy-bag-standalone-root');
}

const TRANSIENT_OVERLAY_SELECTORS = [
  '[role="menu"]',
  '[role="listbox"]',
  '[role="tree"]',
  '[data-radix-popper-content-wrapper]',
  '[data-state="open"]',
].join(',');

function isVisibleOverlay(element: HTMLElement): boolean {
  if (element.closest('[data-buggy-bag]')) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  if (
    element.matches('[role="menu"], [role="listbox"], [role="tree"]') &&
    !element.matches('[data-radix-popper-content-wrapper]') &&
    !element.closest('[data-state="open"]') &&
    style.position !== 'absolute' && style.position !== 'fixed'
  ) return false;
  if (element.matches('[data-state="open"]') && !element.matches('[role="menu"], [role="listbox"], [role="tree"], [data-radix-popper-content-wrapper]')) {
    return style.position === 'absolute' || style.position === 'fixed';
  }
  return true;
}

function copyComputedStyles(source: HTMLElement, clone: HTMLElement): void {
  const sourceNodes = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))];
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
  sourceNodes.forEach((node, index) => {
    const target = cloneNodes[index];
    if (!target) return;
    const computed = window.getComputedStyle(node);
    Array.from(computed).forEach(property => {
      target.style.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
    });
    target.style.setProperty('animation', 'none', 'important');
    target.style.setProperty('transition', 'none', 'important');
  });
}

/**
 * Keep only transient popup pixels (menus/listboxes) visible while the user
 * interacts with the widget. Page outside-click handlers may close the real
 * popup as soon as the annotation canvas is clicked; this visual clone keeps
 * the report faithful without freezing the whole page screenshot.
 */
export function preserveTransientOverlays(): () => void {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(TRANSIENT_OVERLAY_SELECTORS))
    .filter(isVisibleOverlay);

  document.querySelectorAll<HTMLElement>('[aria-expanded="true"][aria-controls]').forEach(trigger => {
    trigger.getAttribute('aria-controls')?.split(/\s+/).forEach(id => {
      const controlled = document.getElementById(id);
      if (controlled && isVisibleOverlay(controlled) && !candidates.includes(controlled)) candidates.push(controlled);
    });
  });

  const topLevelCandidates = candidates.filter(candidate =>
    !candidates.some(other => other !== candidate && other.contains(candidate))
  );
  if (topLevelCandidates.length === 0) return () => {};

  const holder = document.createElement('div');
  holder.setAttribute('data-buggy-bag', 'preserved-overlay');
  holder.setAttribute('aria-hidden', 'true');
  holder.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:visible;';

  topLevelCandidates.forEach(source => {
    const rect = source.getBoundingClientRect();
    const clone = source.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('script').forEach(script => script.remove());
    copyComputedStyles(source, clone);
    clone.style.setProperty('position', 'fixed', 'important');
    clone.style.setProperty('inset', 'auto', 'important');
    clone.style.setProperty('left', `${rect.left}px`, 'important');
    clone.style.setProperty('top', `${rect.top}px`, 'important');
    clone.style.setProperty('width', `${rect.width}px`, 'important');
    clone.style.setProperty('height', `${rect.height}px`, 'important');
    clone.style.setProperty('margin', '0', 'important');
    clone.style.setProperty('transform', 'none', 'important');
    clone.style.setProperty('pointer-events', 'none', 'important');
    holder.appendChild(clone);
  });

  document.body.appendChild(holder);
  return () => holder.remove();
}

const SCROLL_SNAPSHOT_ATTRIBUTE = 'data-buggy-bag-scroll-snapshot';
let scrollSnapshotSequence = 0;

interface MarkedScrollPosition extends CaptureScrollPosition {
  id: string;
  previousAttribute: string | null;
}

/**
 * html2canvas clones DOM nodes but does not reliably copy an element's
 * runtime scrollTop/scrollLeft, especially when its first render fails on a
 * modern CSS color and the normalized fallback clone is used. Give every
 * live scroller a short-lived identity so onclone can restore the runtime
 * values on the matching cloned node before it is painted.
 */
function markScrollPositions(): MarkedScrollPosition[] {
  return getCaptureScrollPositions().map((position, index) => {
    const id = `${++scrollSnapshotSequence}-${index}`;
    const previousAttribute = position.element.getAttribute(SCROLL_SNAPSHOT_ATTRIBUTE);
    position.element.setAttribute(SCROLL_SNAPSHOT_ATTRIBUTE, id);
    return { ...position, id, previousAttribute };
  });
}

function restoreClonedScrollPositions(
  clonedDocument: Document,
  positions: MarkedScrollPosition[],
): void {
  positions.forEach(({ id, scrollLeft, scrollTop }) => {
    const clone = clonedDocument.querySelector<HTMLElement>(
      `[${SCROLL_SNAPSHOT_ATTRIBUTE}="${id}"]`,
    );
    if (!clone) return;
    clone.scrollLeft = scrollLeft;
    clone.scrollTop = scrollTop;
  });
}

function clearScrollPositionMarks(positions: MarkedScrollPosition[]): void {
  positions.forEach(({ element, previousAttribute }) => {
    if (previousAttribute === null) element.removeAttribute(SCROLL_SNAPSHOT_ATTRIBUTE);
    else element.setAttribute(SCROLL_SNAPSHOT_ATTRIBUTE, previousAttribute);
  });
}

async function renderViewportWithHtml2Canvas(
  viewport: CaptureViewport,
  normalizeModernColors: boolean,
): Promise<string> {
  const scrollPositions = markScrollPositions();
  try {
    const canvas = await html2canvas(document.documentElement, {
      width: viewport.width,
      height: viewport.height,
      x: viewport.scrollX,
      y: viewport.scrollY,
      scrollX: viewport.scrollX,
      scrollY: viewport.scrollY,
      windowWidth: viewport.width,
      windowHeight: viewport.height,
      scale: 1,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      foreignObjectRendering: false,
      imageTimeout: 5000,
      logging: false,
      ignoreElements: isWidgetElement,
      onclone: clonedDocument => {
        if (normalizeModernColors) normalizeUnsupportedColors(clonedDocument);
        restoreClonedScrollPositions(clonedDocument, scrollPositions);
      },
    });

    return canvas.toDataURL('image/png');
  } finally {
    clearScrollPositionMarks(scrollPositions);
  }
}

const MODERN_COLOR_PATTERN = /\b(?:oklch|oklab|lab|lch|color)\([^)]*\)/gi;
const COLOR_BEARING_PROPERTIES = [
  'color',
  'background-color',
  'background-image',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'column-rule-color',
  'caret-color',
  'accent-color',
  'box-shadow',
  'text-shadow',
  'filter',
  'fill',
  'stroke',
  'flood-color',
  'lighting-color',
  'stop-color',
] as const;

function normalizeUnsupportedColors(clonedDocument: Document): void {
  const colorCache = new Map<string, string>();
  const converter = clonedDocument.createElement('canvas');
  converter.width = 1;
  converter.height = 1;
  const ctx = converter.getContext('2d', { willReadFrequently: true });
  const view = clonedDocument.defaultView;
  if (!ctx || !view) return;

  const toRgba = (color: string): string => {
    const cached = colorCache.get(color);
    if (cached) return cached;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    const normalized = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
    colorCache.set(color, normalized);
    return normalized;
  };

  clonedDocument.querySelectorAll<HTMLElement>('*').forEach(element => {
    const computed = view.getComputedStyle(element);
    // Modern colors also occur in gradients, SVG fill/stroke and filters;
    // leaving one behind can force the html-to-image safe mode that cannot
    // preserve nested scroll state.
    COLOR_BEARING_PROPERTIES.forEach(property => {
      const value = computed.getPropertyValue(property);
      if (!value || !MODERN_COLOR_PATTERN.test(value)) {
        MODERN_COLOR_PATTERN.lastIndex = 0;
        return;
      }
      MODERN_COLOR_PATTERN.lastIndex = 0;
      const normalized = value.replace(MODERN_COLOR_PATTERN, match => toRgba(match));
      MODERN_COLOR_PATTERN.lastIndex = 0;
      element.style.setProperty(property, normalized, 'important');
    });
  });
}

async function renderViewportWithHtmlToImage(viewport: CaptureViewport): Promise<string> {
  const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  return toPng(document.documentElement, {
    width: viewport.width,
    height: viewport.height,
    style: {
      transform: `translate(${-viewport.scrollX}px, ${-viewport.scrollY}px)`,
      transformOrigin: 'top left',
      width: `${Math.max(document.documentElement.scrollWidth, viewport.width)}px`,
      height: `${Math.max(document.documentElement.scrollHeight, viewport.height)}px`,
    },
    pixelRatio: 1,
    imagePlaceholder: transparentPixel,
    skipFonts: true,
    filter: (node: HTMLElement) => {
      if (node.id === 'buggy-bag-host' || node.hasAttribute?.('data-buggy-bag-standalone-root')) return false;
      if (node.tagName === 'LINK' || node.tagName === 'IFRAME' || node.tagName === 'VIDEO') return false;
      return true;
    },
  });
}

/**
 * Captures the current page (minus the BuggyBag widget host) as a PNG data
 * URL, optionally compositing an annotation canvas (e.g. Konva's scene
 * canvas from the full CaptureMode toolbar) on top.
 *
 * Shared by both the full CaptureMode toolbar and the minimal real-mobile
 * pin flow so the screenshot logic only has to be correct in one place.
 * Viewport-agnostic by construction — always captures whatever
 * `document.body` / `window.innerWidth` / `window.innerHeight` it runs in,
 * so it works the same on desktop, inside the Адаптивність iframe, and on
 * a real phone.
 */
export async function capturePageScreenshot(
  annotationCanvas?: HTMLCanvasElement | null,
  viewport: CaptureViewport = getCaptureViewport(),
): Promise<ScreenshotResult> {
  let annotationDataUrl: string | null = null;
  if (annotationCanvas) {
    try { annotationDataUrl = annotationCanvas.toDataURL('image/png'); } catch { /* tainted canvas */ }
  }

  let imageUrl = '';
  let fallbackUsed = false;
  try {
    let pageDataUrl = '';

    try {
      // Browser-backed DOM rendering keeps fixed/sticky elements and the exact
      // scrolled viewport in the same coordinate system as the drawing canvas.
      pageDataUrl = await renderViewportWithHtml2Canvas(viewport, false);
    } catch (tier1Err) {
      console.warn('[BuggyBag] Tier 1 screenshot failed, normalizing modern CSS colors...', tier1Err);
      fallbackUsed = true;

      try {
        pageDataUrl = await renderViewportWithHtml2Canvas(viewport, true);
      } catch (tier2Err) {
        console.warn('[BuggyBag] Tier 2 screenshot failed, trying safe mode...', tier2Err);
        pageDataUrl = await renderViewportWithHtmlToImage(viewport);
      }
    }

    if (annotationDataUrl) {
      // Composite page + annotations via Canvas 2D API.
      const composite = document.createElement('canvas');
      composite.width = viewport.width;
      composite.height = viewport.height;
      const ctx = composite.getContext('2d');
      if (ctx) {
        await new Promise<void>(resolve => {
          const img = new Image();
          img.onload = () => { ctx.drawImage(img, 0, 0, viewport.width, viewport.height); resolve(); };
          img.onerror = () => resolve();
          img.src = pageDataUrl;
        });
        await new Promise<void>(resolve => {
          const img = new Image();
          img.onload = () => { ctx.drawImage(img, 0, 0, viewport.width, viewport.height); resolve(); };
          img.onerror = () => resolve();
          img.src = annotationDataUrl!;
        });
        imageUrl = composite.toDataURL('image/png');
      } else {
        imageUrl = pageDataUrl;
      }
    } else {
      imageUrl = pageDataUrl;
    }
  } catch (e) {
    console.warn('[BuggyBag] screenshot completely failed', e);
  }

  if (imageUrl) {
    imageUrl = await compressDataUrl(imageUrl);
  }

  return { imageUrl, fallbackUsed };
}

/**
 * Downscales and compresses a Data URL image to WebP/JPEG format (0.82 quality, max dimension 1920px).
 * Reduces payload size from ~5-8 MB down to ~150-250 KB (95% size reduction).
 */
export async function compressDataUrl(dataUrl: string, quality = 0.82, maxDimension = 1920): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const webp = canvas.toDataURL('image/webp', quality);
          if (webp && webp.startsWith('data:image/webp') && webp.length < dataUrl.length) {
            resolve(webp);
            return;
          }
        } catch { /* webp not supported */ }
        try {
          const jpeg = canvas.toDataURL('image/jpeg', quality);
          if (jpeg && jpeg.startsWith('data:image/jpeg') && jpeg.length < dataUrl.length) {
            resolve(jpeg);
            return;
          }
        } catch { /* jpeg failed */ }
      }
      resolve(dataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
