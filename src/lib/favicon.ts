/**
 * favicon.ts
 * Detects the host page's own favicon and its dominant accent color,
 * entirely client-side. This runs inside the page the widget is embedded
 * on, so it has direct DOM access — unlike a server-side fetch, it works
 * identically for production domains AND localhost/private dev URLs that
 * the portal server could never reach on its own.
 */

const FAVICON_SELECTORS = [
  'link[rel="icon"]',
  'link[rel="shortcut icon"]',
  'link[rel="apple-touch-icon"]',
  'link[rel="apple-touch-icon-precomposed"]',
];

function findFaviconUrl(): string | null {
  if (typeof document === 'undefined') return null;

  for (const selector of FAVICON_SELECTORS) {
    const el = document.querySelector<HTMLLinkElement>(selector);
    // .href on a <link> element resolves to an absolute URL automatically
    if (el?.href) return el.href;
  }

  // No <link rel="icon"> at all — most sites still serve /favicon.ico
  try {
    return `${window.location.origin}/favicon.ico`;
  } catch {
    return null;
  }
}

/** Reads pixels from a loaded <img> and returns the most common saturated color. */
function extractDominantColor(img: HTMLImageElement): string | null {
  try {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(img, 0, 0, size, size);
    // Throws a SecurityError if the image is cross-origin without CORS
    // headers ("tainted canvas") — caught below, falls back to no color.
    const { data } = ctx.getImageData(0, 0, size, size);

    const counts = new Map<string, number>();
    let best: string | null = null;
    let bestCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 128) continue;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max === 0 || (max - min) / max < 0.2) continue; // skip grays
      if (max < 40) continue; // skip near-black

      const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);

      if (count > bestCount) {
        bestCount = count;
        best = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }

    return best;
  } catch {
    return null;
  }
}

export interface DetectedFavicon {
  url: string | null;
  color: string | null;
}

/**
 * Resolves with the host page's favicon URL and, if readable, its dominant
 * color. Never rejects — any failure (missing favicon, load error, tainted
 * canvas) resolves to nulls so callers can fire-and-forget this safely.
 */
export function detectFavicon(): Promise<DetectedFavicon> {
  return new Promise((resolve) => {
    const url = findFaviconUrl();
    if (!url || typeof Image === 'undefined') {
      resolve({ url: null, color: null });
      return;
    }

    const img = new Image();
    const timeout = setTimeout(() => resolve({ url, color: null }), 2500);

    img.onload = () => {
      clearTimeout(timeout);
      resolve({ url, color: extractDominantColor(img) });
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve({ url: null, color: null });
    };
    img.src = url;
  });
}
