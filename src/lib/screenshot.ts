import { toPng } from 'html-to-image';

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
export async function capturePageScreenshot(annotationCanvas?: HTMLCanvasElement | null): Promise<{ imageUrl: string; fallbackUsed: boolean }> {
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
  try {
    const transparentPixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    let pageDataUrl = '';
    
    try {
      // Tier 1: High quality, fetch everything (except favicons which are always skipped)
      pageDataUrl = await toPng(document.body, {
        width: window.innerWidth,
        height: window.innerHeight,
        style: {
          marginTop: `-${window.scrollY}px`,
          marginLeft: `-${window.scrollX}px`,
        },
        pixelRatio: 1,
        imagePlaceholder: transparentPixel,
        filter: (node: HTMLElement) => {
          if (node.id === 'buggy-bag-host') return false;
          if (node.tagName === 'LINK') {
            const rel = (node as HTMLLinkElement).rel?.toLowerCase() || '';
            if (rel.includes('icon')) return false;
          }
          return true;
        },
      });
    } catch (tier1Err) {
      console.warn('[BuggyBag] Tier 1 screenshot failed, trying Tier 2 (preserve fonts, strip media)...', tier1Err);
      fallbackUsed = true;
      
      try {
        // Tier 2: Strip risky elements (images, iframes, stylesheets) but PRESERVE fonts
        pageDataUrl = await toPng(document.body, {
          width: window.innerWidth,
          height: window.innerHeight,
          style: {
            marginTop: `-${window.scrollY}px`,
            marginLeft: `-${window.scrollX}px`,
          },
          pixelRatio: 1,
          imagePlaceholder: transparentPixel,
          filter: (node: HTMLElement) => {
            if (node.id === 'buggy-bag-host') return false;
            if (node.tagName === 'LINK' || node.tagName === 'IFRAME' || node.tagName === 'IMG' || node.tagName === 'VIDEO') return false;
            return true;
          },
        });
      } catch (tier2Err) {
        console.warn('[BuggyBag] Tier 2 screenshot failed, trying Tier 3 (absolute safe-mode)...', tier2Err);
        // Tier 3: Absolute fallback, strip EVERYTHING including fonts
        pageDataUrl = await toPng(document.body, {
          width: window.innerWidth,
          height: window.innerHeight,
          style: {
            marginTop: `-${window.scrollY}px`,
            marginLeft: `-${window.scrollX}px`,
          },
          pixelRatio: 1,
          imagePlaceholder: transparentPixel,
          skipFonts: true,
          filter: (node: HTMLElement) => {
            if (node.id === 'buggy-bag-host') return false;
            if (node.tagName === 'LINK' || node.tagName === 'IFRAME' || node.tagName === 'IMG' || node.tagName === 'VIDEO' || node.tagName === 'SVG') return false;
            return true;
          },
        });
      }
    }

    if (annotationDataUrl) {
      // Composite page + annotations via Canvas 2D API.
      const composite = document.createElement('canvas');
      composite.width = window.innerWidth;
      composite.height = window.innerHeight;
      const ctx = composite.getContext('2d');
      if (ctx) {
        await new Promise<void>(resolve => {
          const img = new Image();
          img.onload = () => { ctx.drawImage(img, 0, 0); resolve(); };
          img.onerror = () => resolve();
          img.src = pageDataUrl;
        });
        await new Promise<void>(resolve => {
          const img = new Image();
          img.onload = () => { ctx.drawImage(img, 0, 0); resolve(); };
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

  return { imageUrl, fallbackUsed };
}

/**
 * Composites an annotation canvas on top of an already-captured base screenshot.
 * Used by the "freeze-page" flow: the page screenshot is taken once at the start
 * of capture mode, and annotations are overlaid at send time without re-capturing.
 */
export async function compositeScreenshot(
  baseImageUrl: string,
  annotationCanvas: HTMLCanvasElement | null,
  viewportWidth: number,
  viewportHeight: number,
): Promise<{ imageUrl: string; fallbackUsed: boolean }> {
  let annotationDataUrl: string | null = null;
  if (annotationCanvas) {
    try { annotationDataUrl = annotationCanvas.toDataURL('image/png'); } catch { /* tainted canvas */ }
  }

  const composite = document.createElement('canvas');
  composite.width = viewportWidth;
  composite.height = viewportHeight;
  const ctx = composite.getContext('2d');

  if (!ctx) {
    return { imageUrl: baseImageUrl, fallbackUsed: false };
  }

  // Draw the frozen page screenshot
  await new Promise<void>(resolve => {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, viewportWidth, viewportHeight); resolve(); };
    img.onerror = () => resolve();
    img.src = baseImageUrl;
  });

  // Draw annotations on top
  if (annotationDataUrl) {
    await new Promise<void>(resolve => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0); resolve(); };
      img.onerror = () => resolve();
      img.src = annotationDataUrl!;
    });
  }

  let imageUrl = composite.toDataURL('image/png');
  imageUrl = await compressDataUrl(imageUrl);
  return { imageUrl, fallbackUsed: false };
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

