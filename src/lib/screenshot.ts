import html2canvas from 'html2canvas';
import { applyStyle } from 'html-to-image/es/apply-style';
import { cloneNode } from 'html-to-image/es/clone-node';
import { embedImages } from 'html-to-image/es/embed-images';
import { embedWebFonts } from 'html-to-image/es/embed-webfonts';
import type { Options as HtmlToImageOptions } from 'html-to-image/es/types';
import { createImage, nodeToDataURL } from 'html-to-image/es/util';

export interface CaptureViewport {
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
}

export interface ScreenshotResult {
  imageUrl: string;
  fallbackUsed: boolean;
  renderer: ScreenshotRenderer;
}

export type ScreenshotRenderer =
  | 'html-to-image-scroll-aware'
  | 'html2canvas'
  | 'html2canvas-normalized'
  | 'failed';

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

const HTML2CANVAS_FONT_METRICS_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * html2canvas measures every font baseline with a temporary inline image.
 * Tailwind Preflight changes all images to `display: block`, which makes that
 * probe sit on the next line and shifts every canvas-painted glyph downward.
 * Scope the reset to html2canvas's exact private 1x1 probe so page images are
 * never changed, even for a frame.
 */
function installHtml2CanvasFontMetricsReset(): () => void {
  const style = document.createElement('style');
  style.setAttribute('data-buggy-bag', 'html2canvas-font-metrics-reset');
  style.textContent = `
    body > div[style*="visibility: hidden"] > img[src="${HTML2CANVAS_FONT_METRICS_IMAGE}"] {
      display: inline-block !important;
    }
  `;
  document.head.appendChild(style);
  return () => style.remove();
}

async function renderViewportWithHtml2Canvas(
  viewport: CaptureViewport,
  normalizeModernColors: boolean,
): Promise<string> {
  const scrollPositions = markScrollPositions();
  const removeFontMetricsReset = installHtml2CanvasFontMetricsReset();
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
    removeFontMetricsReset();
    clearScrollPositionMarks(scrollPositions);
  }
}

const MODERN_COLOR_FUNCTION_PATTERN = /\b(?:color-mix|oklch|oklab|lab|lch|color)\(/gi;
const MODERN_COLOR_INTERPOLATION_PATTERN = /\bin\s+(?:oklab|oklch|lab|lch)\s*,/gi;
const COLOR_BEARING_PROPERTIES = [
  'color',
  'background-color',
  'background-image',
  'list-style-image',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  '-webkit-text-stroke-color',
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

  const hasModernColor = (value: string): boolean => {
    MODERN_COLOR_FUNCTION_PATTERN.lastIndex = 0;
    MODERN_COLOR_INTERPOLATION_PATTERN.lastIndex = 0;
    const result = MODERN_COLOR_FUNCTION_PATTERN.test(value) || MODERN_COLOR_INTERPOLATION_PATTERN.test(value);
    MODERN_COLOR_FUNCTION_PATTERN.lastIndex = 0;
    MODERN_COLOR_INTERPOLATION_PATTERN.lastIndex = 0;
    return result;
  };

  const normalizeValue = (value: string): string => {
    // A simple `[^)]*` regexp truncates nested color-mix()/calc() values.
    // Walk balanced parentheses so the browser can resolve the complete
    // modern color function to an rgba pixel.
    let source = value.replace(MODERN_COLOR_INTERPOLATION_PATTERN, '');
    let result = '';
    let cursor = 0;
    MODERN_COLOR_FUNCTION_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MODERN_COLOR_FUNCTION_PATTERN.exec(source))) {
      const start = match.index;
      let depth = 1;
      let end = MODERN_COLOR_FUNCTION_PATTERN.lastIndex;
      while (end < source.length && depth > 0) {
        if (source[end] === '(') depth += 1;
        else if (source[end] === ')') depth -= 1;
        end += 1;
      }
      if (depth !== 0) break;
      result += source.slice(cursor, start) + toRgba(source.slice(start, end));
      cursor = end;
      MODERN_COLOR_FUNCTION_PATTERN.lastIndex = end;
    }
    MODERN_COLOR_FUNCTION_PATTERN.lastIndex = 0;
    return result + source.slice(cursor);
  };

  const elements = Array.from(clonedDocument.querySelectorAll<HTMLElement>('*'));

  elements.forEach(element => {
    const computed = view.getComputedStyle(element);
    const updates: Array<{ property: string; value: string }> = [];
    // Modern colors also occur in gradients, SVG fill/stroke and filters;
    // leaving one behind can force the html-to-image safe mode that cannot
    // preserve nested scroll state.
    COLOR_BEARING_PROPERTIES.forEach(property => {
      const originalValue = computed.getPropertyValue(property);
      if (!originalValue) return;
      let normalizedValue = hasModernColor(originalValue)
        ? normalizeValue(originalValue)
        : originalValue;
      if (normalizedValue !== originalValue) {
        updates.push({ property, value: normalizedValue });
      }
    });

    if (updates.length === 0) return;

    // A cloned element can restart transition-colors from its original oklab
    // value. Disable transitions only on elements we actually normalize; a
    // page-wide reset would move unrelated animated layout and annotations.
    const transitioned = computed.transitionProperty
      .split(',')
      .map(property => property.trim());
    const needsTransitionGuard = transitioned.includes('all') || updates.some(({ property }) =>
      transitioned.includes(property) ||
      (property.startsWith('border-') && transitioned.includes('border-color')),
    );
    if (needsTransitionGuard) {
      element.style.setProperty('transition', 'none', 'important');
    }
    updates.forEach(({ property, value }) => {
      element.style.setProperty(property, value, 'important');
    });
  });
}

function applyScrollOffsetsToForeignObjectClone(
  clonedRoot: HTMLElement,
  positions: MarkedScrollPosition[],
): void {
  const translateChildren = (container: HTMLElement, scrollLeft: number, scrollTop: number) => {
    Array.from(container.children).forEach(child => {
      if (!(child instanceof HTMLElement) && !(child instanceof SVGElement)) return;
      const existingTransform = child.style.transform && child.style.transform !== 'none'
        ? child.style.transform
        : '';
      // Keep both the child's existing individual translate and its transform
      // matrix; add the baked scroll movement as one more transform function.
      child.style.setProperty(
        'transform',
        `translate(${-scrollLeft}px, ${-scrollTop}px)${existingTransform ? ` ${existingTransform}` : ''}`,
        'important',
      );
      child.style.setProperty('transform-origin', 'top left', 'important');
    });
  };

  positions.forEach(({ id, scrollLeft, scrollTop }) => {
    if (scrollLeft === 0 && scrollTop === 0) return;
    const clone = clonedRoot.querySelector<HTMLElement>(
      `[${SCROLL_SNAPSHOT_ATTRIBUTE}="${id}"]`,
    );
    if (!clone) return;
    translateChildren(clone, scrollLeft, scrollTop);
  });
}

/**
 * A page's canvas background comes from `<html>`, or from `<body>` when the
 * root paints nothing (CSS background propagation). An SVG foreignObject has
 * no such propagation, so resolve the colour ourselves and paint it under the
 * frame — otherwise a page that relies on the browser default renders as a
 * transparent PNG and turns black once compressed to WebP/JPEG.
 */
function resolvePageBackgroundColor(): string {
  for (const element of [document.documentElement, document.body]) {
    if (!element) continue;
    const color = window.getComputedStyle(element).backgroundColor;
    if (!color || color === 'transparent') continue;
    const alpha = color.match(/^rgba\([^)]*,\s*([\d.]+)\s*\)$/);
    if (alpha && Number(alpha[1]) === 0) continue;
    return color;
  }
  return '#ffffff';
}

/**
 * Primary renderer: the browser itself paints the DOM through an SVG
 * foreignObject, so shadows, filters, modern colour functions and text
 * metrics come out exactly as they look on screen. html2canvas cannot do
 * this — it re-implements CSS painting in JS and silently drops whatever it
 * does not support.
 *
 * The scroll offset is applied as a `transform`, never as a margin: a
 * transform moves the painted pixels without touching layout, which is what
 * keeps the frame in the same coordinate system as the annotation canvas.
 */
async function renderViewportWithHtmlToImage(viewport: CaptureViewport): Promise<string> {
  const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const backgroundColor = resolvePageBackgroundColor();
  const options: HtmlToImageOptions = {
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
    filter: (node: HTMLElement) => {
      if (node.id === 'buggy-bag-host' || node.hasAttribute?.('data-buggy-bag-standalone-root')) return false;
      // cloneNode inlines every computed style, so the page keeps its looks
      // without <link>; an IFRAME/VIDEO cannot paint inside a foreignObject.
      if (node.tagName === 'LINK' || node.tagName === 'IFRAME' || node.tagName === 'VIDEO') return false;
      return true;
    },
  };

  const scrollPositions = markScrollPositions();
  try {
    // html-to-image normally serializes a deep clone but drops runtime
    // scrollTop/scrollLeft. Build that clone ourselves, then bake every
    // scroll offset into transforms before it becomes an SVG foreignObject.
    const clonedRoot = await cloneNode(document.documentElement, options, true);
    if (!clonedRoot) throw new Error('Unable to clone document for screenshot');
    applyScrollOffsetsToForeignObjectClone(clonedRoot, scrollPositions);
    await embedWebFonts(clonedRoot, options);
    await embedImages(clonedRoot, options);
    applyStyle(clonedRoot, options);

    const svg = await nodeToDataURL(clonedRoot, viewport.width, viewport.height);
    const image = await createImage(svg);
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to create screenshot canvas');
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, viewport.width, viewport.height);
    context.drawImage(image, 0, 0, viewport.width, viewport.height);
    return canvas.toDataURL('image/png');
  } finally {
    clearScrollPositionMarks(scrollPositions);
  }
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
  let renderer: ScreenshotRenderer = 'failed';
  try {
    let pageDataUrl = '';

    try {
      // Tier 1: the browser paints the DOM itself, so the report looks like
      // the page actually looked. This is the only renderer that reproduces
      // shadows, filters and modern colour functions faithfully.
      pageDataUrl = await renderViewportWithHtmlToImage(viewport);
      renderer = 'html-to-image-scroll-aware';
    } catch (tier1Err) {
      console.warn('[BuggyBag] Tier 1 screenshot failed, falling back to html2canvas...', tier1Err);
      fallbackUsed = true;

      try {
        // Tier 2/3 repaint CSS in JS and lose visual fidelity, but they cope
        // with documents a foreignObject cannot serialize (tainted resources).
        pageDataUrl = await renderViewportWithHtml2Canvas(viewport, false);
        renderer = 'html2canvas';
      } catch (tier2Err) {
        console.warn('[BuggyBag] Tier 2 screenshot failed, normalizing modern CSS colors...', tier2Err);
        pageDataUrl = await renderViewportWithHtml2Canvas(viewport, true);
        renderer = 'html2canvas-normalized';
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

  return { imageUrl, fallbackUsed, renderer };
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
