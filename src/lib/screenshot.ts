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

  return { imageUrl, fallbackUsed };
}
