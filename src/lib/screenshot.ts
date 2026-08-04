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

export function getCaptureViewport(): CaptureViewport {
  return {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function isWidgetElement(element: Element): boolean {
  return element.id === 'buggy-bag-host' || element.hasAttribute('data-buggy-bag-standalone-root');
}

async function renderViewportWithHtml2Canvas(
  viewport: CaptureViewport,
  normalizeModernColors: boolean,
): Promise<string> {
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
    onclone: normalizeModernColors ? normalizeUnsupportedColors : undefined,
  });

  return canvas.toDataURL('image/png');
}

const COLOR_PROPERTIES = [
  'color',
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'box-shadow',
  'text-shadow',
] as const;

const MODERN_COLOR_PATTERN = /\b(?:oklch|oklab|lab|lch|color)\([^)]*\)/gi;

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
    COLOR_PROPERTIES.forEach(property => {
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

/** Adds the current annotation canvas to the frame captured on activation. */
export async function compositeScreenshot(
  base: ScreenshotResult,
  annotationCanvas: HTMLCanvasElement | null,
  viewport: CaptureViewport,
): Promise<ScreenshotResult> {
  if (!base.imageUrl || !annotationCanvas) return base;

  let annotationDataUrl = '';
  try {
    annotationDataUrl = annotationCanvas.toDataURL('image/png');
  } catch {
    return base;
  }

  const composite = document.createElement('canvas');
  composite.width = viewport.width;
  composite.height = viewport.height;
  const ctx = composite.getContext('2d');
  if (!ctx) return base;

  const draw = (source: string) => new Promise<void>(resolve => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, viewport.width, viewport.height);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = source;
  });

  await draw(base.imageUrl);
  await draw(annotationDataUrl);

  return {
    imageUrl: await compressDataUrl(composite.toDataURL('image/png')),
    fallbackUsed: base.fallbackUsed,
  };
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
