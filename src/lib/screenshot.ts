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
export async function capturePageScreenshot(annotationCanvas?: HTMLCanvasElement | null): Promise<string> {
  const host = document.querySelector('#buggy-bag-host') as HTMLElement | null;

  let annotationDataUrl: string | null = null;
  if (annotationCanvas) {
    try { annotationDataUrl = annotationCanvas.toDataURL('image/png'); } catch { /* tainted canvas */ }
  }

  // Hide the widget so html-to-image only captures the page underneath it.
  const prevOpacity = host?.style.opacity ?? '';
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
      // and will throw or produce a corrupt blank image if it tries.
      filter: (node: HTMLElement) => node.id !== 'buggy-bag-host',
    });

    if (annotationDataUrl) {
      // Composite page + annotations via Canvas 2D API. This is the reliable
      // path: html-to-image never touches <canvas> elements, and we control
      // the compositing precisely with pixel dimensions.
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
    console.warn('[BuggyBag] screenshot failed', e);
  } finally {
    if (host) host.style.opacity = prevOpacity;
  }

  return imageUrl;
}
