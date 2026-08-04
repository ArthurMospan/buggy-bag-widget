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
  | 'html-to-image'
  | 'html-to-image-no-media'
  | 'html-to-image-safe'
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
 * html-to-image's `filter` runs against every node in the tree, text and
 * comment nodes included, so this must not assume an Element is on the other
 * end — a bare `hasAttribute` call there throws and fails the whole capture.
 */
function isWidgetElement(node: Node): boolean {
  const element = node as Partial<Element>;
  return element.id === 'buggy-bag-host' ||
    element.hasAttribute?.('data-buggy-bag-standalone-root') === true;
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

/** Walk the light DOM plus every shadow root, the same way the cloner does. */
function forEachElement(visit: (element: HTMLElement) => void): void {
  const walk = (root: Document | ShadowRoot) => {
    root.querySelectorAll<HTMLElement>('*').forEach(element => {
      if (isWidgetElement(element)) return;
      visit(element);
      if (element.shadowRoot) walk(element.shadowRoot);
    });
  };
  walk(document);
}

/* ------------------------------------------------------------------ *
 * ::placeholder
 *
 * html-to-image copies computed styles onto each cloned node, but a
 * placeholder's colour lives on the ::placeholder pseudo-element and the
 * cloner only reproduces ::before and ::after. The cloned input therefore
 * falls back to inheriting its own `color`, which is usually the near-black
 * input text colour — a light grey "Search…" comes back almost black.
 *
 * Tag the real inputs, then ship a stylesheet inside the clone that restores
 * each one's real placeholder appearance.
 * ------------------------------------------------------------------ */

const PLACEHOLDER_ATTRIBUTE = 'data-buggy-bag-placeholder';
let placeholderSequence = 0;

interface MarkedPlaceholder {
  element: HTMLElement;
  previousAttribute: string | null;
  rule: string;
}

const PLACEHOLDER_PROPERTIES = [
  'color',
  // The cloner writes every computed property inline, and an input carries
  // -webkit-text-fill-color set to its own text colour. ::placeholder inherits
  // it, and that property beats `color` when the glyphs are painted — restore
  // `color` alone and the placeholder still comes out near-black.
  '-webkit-text-fill-color',
  'opacity',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'text-transform',
] as const;

function markPlaceholders(): MarkedPlaceholder[] {
  const marked: MarkedPlaceholder[] = [];

  forEachElement(element => {
    if (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) return;
    if (!element.placeholder) return;

    const pseudo = window.getComputedStyle(element, '::placeholder');
    const declarations = PLACEHOLDER_PROPERTIES
      .map(property => {
        const value = pseudo.getPropertyValue(property);
        return value ? `${property}: ${value} !important;` : '';
      })
      .filter(Boolean)
      .join(' ');
    if (!declarations) return;

    const id = `${++placeholderSequence}`;
    const previousAttribute = element.getAttribute(PLACEHOLDER_ATTRIBUTE);
    element.setAttribute(PLACEHOLDER_ATTRIBUTE, id);
    marked.push({
      element,
      previousAttribute,
      rule: `[${PLACEHOLDER_ATTRIBUTE}="${id}"]::placeholder { ${declarations} }`,
    });
  });

  return marked;
}

function applyPlaceholderStyles(clonedRoot: HTMLElement, marked: MarkedPlaceholder[]): void {
  if (marked.length === 0) return;
  const style = document.createElement('style');
  style.textContent = marked.map(({ rule }) => rule).join('\n');
  clonedRoot.insertBefore(style, clonedRoot.firstChild);
}

function clearPlaceholderMarks(marked: MarkedPlaceholder[]): void {
  marked.forEach(({ element, previousAttribute }) => {
    if (previousAttribute === null) element.removeAttribute(PLACEHOLDER_ATTRIBUTE);
    else element.setAttribute(PLACEHOLDER_ATTRIBUTE, previousAttribute);
  });
}

/* ------------------------------------------------------------------ *
 * backface-visibility
 *
 * An SVG foreignObject rasterises without a 3D scene, so `preserve-3d` and
 * `backface-visibility` are ignored and the *back* face of a flip card is
 * painted over the front one — a logo silently becomes the wrong logo.
 *
 * The cloner writes every computed property inline, so the clone already
 * carries both the transform matrix and backface-visibility. An element whose
 * own matrix has a negative m33 has been turned away from the viewer; the
 * browser would not have painted it, so neither should we.
 * ------------------------------------------------------------------ */

function hideBackFacingElements(clonedRoot: HTMLElement): void {
  const candidates = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll<HTMLElement>('*'))];
  candidates.forEach(element => {
    if (element.style.backfaceVisibility !== 'hidden') return;
    const transform = element.style.transform;
    if (!transform || transform === 'none') return;
    const numbers = transform.match(/matrix3d\(([^)]+)\)/);
    if (!numbers) return;
    const parts = numbers[1].split(',').map(value => Number(value.trim()));
    if (parts.length !== 16 || parts.some(Number.isNaN)) return;
    // m33 is the third basis vector's z component; negative means the face
    // now points away from the camera.
    //
    // `display: none` rather than `visibility: hidden`: the cloner writes
    // every computed property inline, so each descendant carries its own
    // `visibility: visible`, and a descendant saying visible overrides a
    // hidden ancestor. Only display removes the subtree outright.
    if (parts[10] < 0) element.style.setProperty('display', 'none', 'important');
  });
}

/* ------------------------------------------------------------------ *
 * Fix 1 of 2 — nested scroll
 *
 * html-to-image serializes a deep DOM clone, but scrollTop/scrollLeft is
 * runtime state rather than an attribute, so every scrolled container came
 * back rewound to the top. In an app whose scrolling lives in a container
 * rather than the document, that is exactly what made the screenshot show
 * a different part of the page than the annotations pointed at.
 * ------------------------------------------------------------------ */

const SCROLL_SNAPSHOT_ATTRIBUTE = 'data-buggy-bag-scroll-snapshot';
let scrollSnapshotSequence = 0;

interface MarkedScrollPosition extends CaptureScrollPosition {
  id: string;
  previousAttribute: string | null;
}

/** Give every live scroller a short-lived identity so its offset can be
 *  matched to the corresponding node in the clone. */
function markScrollPositions(positions: CaptureScrollPosition[]): MarkedScrollPosition[] {
  return positions.map((position, index) => {
    const id = `${++scrollSnapshotSequence}-${index}`;
    const previousAttribute = position.element.getAttribute(SCROLL_SNAPSHOT_ATTRIBUTE);
    position.element.setAttribute(SCROLL_SNAPSHOT_ATTRIBUTE, id);
    return { ...position, id, previousAttribute };
  });
}

function clearScrollPositionMarks(positions: MarkedScrollPosition[]): void {
  positions.forEach(({ element, previousAttribute }) => {
    if (previousAttribute === null) element.removeAttribute(SCROLL_SNAPSHOT_ATTRIBUTE);
    else element.setAttribute(SCROLL_SNAPSHOT_ATTRIBUTE, previousAttribute);
  });
}

/** Bake each container's scroll offset into a transform on its children, so
 *  the SVG foreignObject paints the region the user was actually looking at. */
function applyScrollOffsetsToClone(
  clonedRoot: HTMLElement,
  positions: MarkedScrollPosition[],
): void {
  positions.forEach(({ id, scrollLeft, scrollTop }) => {
    if (scrollLeft === 0 && scrollTop === 0) return;
    const clone = clonedRoot.querySelector<HTMLElement>(
      `[${SCROLL_SNAPSHOT_ATTRIBUTE}="${id}"]`,
    );
    if (!clone) return;

    Array.from(clone.children).forEach(child => {
      if (!(child instanceof HTMLElement) && !(child instanceof SVGElement)) return;
      // Keep whatever transform the element already had; add the baked scroll
      // movement as one more function rather than replacing it.
      const existing = child.style.transform && child.style.transform !== 'none'
        ? ` ${child.style.transform}`
        : '';
      child.style.setProperty(
        'transform',
        `translate(${-scrollLeft}px, ${-scrollTop}px)${existing}`,
        'important',
      );
      child.style.setProperty('transform-origin', 'top left', 'important');
    });
  });
}

/* ------------------------------------------------------------------ *
 * Fix 2 of 2 — keep an open dropdown on the shot
 *
 * The inspected app's outside-click handlers close its menus the moment the
 * widget is clicked, so the popup the user wanted to report was gone before
 * the DOM could be cloned. Keep a non-interactive visual copy alive for the
 * duration of the annotation session.
 * ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */

const TRANSPARENT_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/**
 * The page background belongs to `<html>`, or to `<body>` when the root paints
 * nothing (CSS background propagation). We clone `document.body`, so a root
 * background is simply not in the tree and the frame comes back transparent.
 * Resolve the colour the browser would have painted and put it under the
 * frame — html-to-image's own `toCanvas` fills `options.backgroundColor` the
 * same way.
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

/* ------------------------------------------------------------------ *
 * Images the browser refuses to hand over
 *
 * html-to-image does not read pixels off the rendered <img>; it re-fetches
 * the URL and inlines the bytes. A host that serves images happily to an
 * <img> tag but sends no Access-Control-Allow-Origin fails that fetch, and
 * the library substitutes `imagePlaceholder` — a transparent pixel. The
 * avatar disappears without trace and the report quietly lies.
 *
 * Two recoveries, in order: re-fetch through the portal (server-side fetch is
 * not subject to CORS), and failing that, leave a visible marker so a missing
 * image reads as missing rather than as empty space.
 * ------------------------------------------------------------------ */

export interface ImageRecovery {
  /** Portal origin, e.g. https://buggy-bag.vercel.app */
  portalUrl: string;
  apiKey: string;
}

/** Both halves are required; without either one there is nothing to retry against. */
export function buildImageRecovery(apiKey?: string, portalUrl?: string): ImageRecovery | null {
  if (!apiKey || !portalUrl) return null;
  return { apiKey, portalUrl };
}

const ORIGINAL_SRC_ATTRIBUTE = 'data-buggy-bag-src';

function rememberImageSources(clonedRoot: HTMLElement): void {
  clonedRoot.querySelectorAll<HTMLImageElement>('img').forEach(image => {
    const src = image.src;
    if (src && !src.startsWith('data:')) image.setAttribute(ORIGINAL_SRC_ATTRIBUTE, src);
  });
}

async function proxyImageAsDataUrl(url: string, recovery: ImageRecovery): Promise<string | null> {
  try {
    const endpoint = `${recovery.portalUrl.replace(/\/$/, '')}/api/image-proxy`
      + `?url=${encodeURIComponent(url)}&api_key=${encodeURIComponent(recovery.apiKey)}`;
    const response = await fetch(endpoint);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    return await new Promise<string | null>(resolve => {
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function markImageAsUnavailable(image: HTMLImageElement): void {
  // A dashed outline over a neutral fill reads as "there was an image here",
  // which is what the reporter needs to know. Keep the element's own box so
  // nothing around it shifts.
  image.style.setProperty('background-color', 'rgba(148, 148, 148, 0.18)', 'important');
  image.style.setProperty('outline', '1px dashed rgba(120, 120, 120, 0.65)', 'important');
  image.style.setProperty('outline-offset', '-1px', 'important');
}

async function recoverBlockedImages(
  clonedRoot: HTMLElement,
  recovery: ImageRecovery | null,
): Promise<number> {
  const blocked = Array.from(clonedRoot.querySelectorAll<HTMLImageElement>(`img[${ORIGINAL_SRC_ATTRIBUTE}]`))
    .filter(image => !image.src || image.src === TRANSPARENT_PIXEL);

  let recovered = 0;
  await Promise.all(blocked.map(async image => {
    const original = image.getAttribute(ORIGINAL_SRC_ATTRIBUTE)!;
    const dataUrl = recovery ? await proxyImageAsDataUrl(original, recovery) : null;
    if (dataUrl) {
      image.src = dataUrl;
      recovered += 1;
    } else {
      markImageAsUnavailable(image);
    }
  }));

  clonedRoot.querySelectorAll(`[${ORIGINAL_SRC_ATTRIBUTE}]`)
    .forEach(element => element.removeAttribute(ORIGINAL_SRC_ATTRIBUTE));

  return recovered;
}

/**
 * Runs the same pipeline `html-to-image`'s `toPng` does, with one extra step:
 * the nested scroll offsets are baked into the clone before it is serialized.
 * That step is why this is spelled out rather than calling `toPng` directly —
 * `toPng` never hands out the clone.
 */
async function renderTier(
  viewport: CaptureViewport,
  scrollPositions: CaptureScrollPosition[],
  options: HtmlToImageOptions,
  recovery: ImageRecovery | null,
): Promise<string> {
  const backgroundColor = resolvePageBackgroundColor();
  const marked = markScrollPositions(scrollPositions);
  const markedPlaceholders = markPlaceholders();
  try {
    const clonedRoot = await cloneNode(document.body, options, true);
    if (!clonedRoot) throw new Error('Unable to clone document for screenshot');
    applyScrollOffsetsToClone(clonedRoot, marked);
    hideBackFacingElements(clonedRoot);
    applyPlaceholderStyles(clonedRoot, markedPlaceholders);
    rememberImageSources(clonedRoot);
    await embedWebFonts(clonedRoot, options);
    await embedImages(clonedRoot, options);
    // Runs after embedImages: that is the point at which a blocked fetch has
    // already been turned into the transparent placeholder we look for.
    await recoverBlockedImages(clonedRoot, recovery);
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
    clearScrollPositionMarks(marked);
    clearPlaceholderMarks(markedPlaceholders);
  }
}

function baseOptions(viewport: CaptureViewport): HtmlToImageOptions {
  return {
    width: viewport.width,
    height: viewport.height,
    style: {
      marginTop: `-${viewport.scrollY}px`,
      marginLeft: `-${viewport.scrollX}px`,
    },
    pixelRatio: 1,
    imagePlaceholder: TRANSPARENT_PIXEL,
  };
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
  scrollPositions: CaptureScrollPosition[] = getCaptureScrollPositions(),
  recovery: ImageRecovery | null = null,
): Promise<ScreenshotResult> {
  const host = document.querySelector('#buggy-bag-host') as HTMLElement | null;

  let annotationDataUrl: string | null = null;
  if (annotationCanvas) {
    try { annotationDataUrl = annotationCanvas.toDataURL('image/png'); } catch { /* tainted canvas */ }
  }

  // Hide the widget so html-to-image only captures the page underneath it.
  const prevOpacity = host?.style.opacity ?? '';
  if (host) host.style.opacity = '0';

  let imageUrl = '';
  let fallbackUsed = false;
  let renderer: ScreenshotRenderer = 'failed';
  try {
    let pageDataUrl = '';

    try {
      // Tier 1: High quality, fetch everything (except favicons which are always skipped)
      pageDataUrl = await renderTier(viewport, scrollPositions, {
        ...baseOptions(viewport),
        filter: (node: HTMLElement) => {
          if (isWidgetElement(node)) return false;
          if (node.tagName === 'LINK') {
            const rel = (node as unknown as HTMLLinkElement).rel?.toLowerCase() || '';
            if (rel.includes('icon')) return false;
          }
          return true;
        },
      }, recovery);
      renderer = 'html-to-image';
    } catch (tier1Err) {
      console.warn('[BuggyBag] Tier 1 screenshot failed, trying Tier 2 (preserve fonts, strip media)...', tier1Err);
      fallbackUsed = true;

      try {
        // Tier 2: Strip risky elements (images, iframes, stylesheets) but PRESERVE fonts
        pageDataUrl = await renderTier(viewport, scrollPositions, {
          ...baseOptions(viewport),
          filter: (node: HTMLElement) => {
            if (isWidgetElement(node)) return false;
            if (node.tagName === 'LINK' || node.tagName === 'IFRAME' || node.tagName === 'IMG' || node.tagName === 'VIDEO') return false;
            return true;
          },
        }, recovery);
        renderer = 'html-to-image-no-media';
      } catch (tier2Err) {
        console.warn('[BuggyBag] Tier 2 screenshot failed, trying Tier 3 (absolute safe-mode)...', tier2Err);
        // Tier 3: Absolute fallback, strip EVERYTHING including fonts
        pageDataUrl = await renderTier(viewport, scrollPositions, {
          ...baseOptions(viewport),
          skipFonts: true,
          filter: (node: HTMLElement) => {
            if (isWidgetElement(node)) return false;
            if (node.tagName === 'LINK' || node.tagName === 'IFRAME' || node.tagName === 'IMG' || node.tagName === 'VIDEO' || node.tagName === 'SVG') return false;
            return true;
          },
        }, recovery);
        renderer = 'html-to-image-safe';
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
  } finally {
    if (host) host.style.opacity = prevOpacity;
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
