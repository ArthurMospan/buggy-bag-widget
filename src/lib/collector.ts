/**
 * collector.ts
 * Automatically collects technical context when a bug is reported.
 * Intercepts fetch/XHR, console errors, and tracks user interactions.
 */

import type {
  TechContext,
  NetworkRequest,
  ConsoleEntry,
  EventLogEntry,
  ComponentInfo,
  BugSeverity,
  PinElementContext,
} from '../types';

const MAX_NETWORK = 20;
const MAX_CONSOLE = 10;
const MAX_EVENTS = 100;
const EVENT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

// ── Circular buffers ────────────────────────────────────────────────────────

const networkLog: NetworkRequest[] = [];
const consoleLog: ConsoleEntry[] = [];
const eventLog: EventLogEntry[] = [];

function pushCapped<T>(arr: T[], item: T, max: number) {
  arr.push(item);
  if (arr.length > max) arr.shift();
}

function recentEvents(): EventLogEntry[] {
  const cutoff = Date.now() - EVENT_WINDOW_MS;
  return eventLog.filter(e => e.timestamp >= cutoff);
}

// ── Network interception ────────────────────────────────────────────────────

/** Redact sensitive values from a JSON string */
function redactSensitive(body: string): string {
  try {
    const parsed = JSON.parse(body);
    const redacted = redactObj(parsed);
    return JSON.stringify(redacted).slice(0, 500);
  } catch {
    // Not JSON — just truncate and return
    return body.slice(0, 500);
  }
}

function redactObj(obj: unknown, depth = 0): unknown {
  if (depth > 3 || typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return (obj as unknown[]).slice(0, 5).map(v => redactObj(v, depth + 1));
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (/password|token|secret|key|auth|credential|cookie|authorization/i.test(k)) {
      result[k] = '***';
    } else {
      result[k] = redactObj(v, depth + 1);
    }
  }
  return result;
}

/** Strip sensitive headers (Authorization, Cookie, etc.) */
function safeHeaders(headers: HeadersInit | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  const safe: Record<string, string> = {};
  const BLOCKED = /^(authorization|cookie|x-api-key|x-auth|x-token|set-cookie)$/i;
  const entries: [string, string][] = headers instanceof Headers
    ? Array.from(headers.entries())
    : Array.isArray(headers)
      ? headers as [string, string][]
      : Object.entries(headers as Record<string, string>);
  for (const [k, v] of entries) {
    if (!BLOCKED.test(k)) safe[k] = v;
  }
  return Object.keys(safe).length > 0 ? safe : undefined;
}

/** Safely read body string from RequestInit body */
async function readRequestBody(init?: RequestInit): Promise<string | undefined> {
  if (!init?.body) return undefined;
  try {
    if (typeof init.body === 'string') return init.body.slice(0, 500);
    if (init.body instanceof URLSearchParams) return init.body.toString().slice(0, 500);
    if (init.body instanceof FormData) {
      const parts: string[] = [];
      init.body.forEach((v, k) => { if (typeof v === 'string') parts.push(`${k}=${v}`); });
      return parts.join('&').slice(0, 500);
    }
    if (init.body instanceof ArrayBuffer || ArrayBuffer.isView(init.body)) {
      return '[binary data]';
    }
  } catch { /* ignore */ }
  return undefined;
}

let fetchPatched = false;

function patchFetch() {
  if (fetchPatched || typeof window === 'undefined') return;
  fetchPatched = true;

  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? 'GET').toUpperCase();
    const start = Date.now();

    // Skip buggy-bag's own submit to avoid infinite recursion
    if (url.includes('/api/bugs/submit')) return original(input, init);

    try {
      const res = await original(input, init);
      const duration = Date.now() - start;
      const isError = res.status >= 400;

      const entry: NetworkRequest = {
        url: url.length > 120 ? url.slice(0, 120) + '…' : url,
        method,
        status: res.status,
        durationMs: duration,
        isError,
      };

      // Capture extra context only for error responses
      if (isError) {
        // Request body
        const rawReqBody = await readRequestBody(init);
        if (rawReqBody) entry.requestBody = redactSensitive(rawReqBody);

        // Safe headers
        const hdrs = safeHeaders(init?.headers);
        if (hdrs) entry.requestHeaders = hdrs;

        // Response body — clone so caller can still read it
        try {
          const cloned = res.clone();
          const text = await cloned.text();
          if (text) entry.responseBody = redactSensitive(text);
        } catch { /* ignore — stream already consumed */ }

        pushCapped(eventLog, {
          type: 'network_error',
          description: `${method} ${shortUrl(url)} → ${res.status}`,
          timestamp: Date.now(),
        }, MAX_EVENTS);
      }

      pushCapped(networkLog, entry, MAX_NETWORK);
      return res;
    } catch (err) {
      const duration = Date.now() - start;
      pushCapped(networkLog, {
        url: url.length > 120 ? url.slice(0, 120) + '…' : url,
        method,
        status: 0,
        durationMs: duration,
        isError: true,
      }, MAX_NETWORK);
      pushCapped(eventLog, {
        type: 'network_error',
        description: `${method} ${shortUrl(url)} → network error`,
        timestamp: Date.now(),
      }, MAX_EVENTS);
      throw err;
    }
  };
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url, window.location.href);
    return u.pathname + (u.search || '');
  } catch {
    return url.slice(0, 60);
  }
}

// ── XHR interception ────────────────────────────────────────────────────────

let xhrPatched = false;

function patchXHR() {
  if (xhrPatched || typeof window === 'undefined') return;
  xhrPatched = true;

  const OriginalXHR = window.XMLHttpRequest;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).XMLHttpRequest = function () {
    const xhr = new OriginalXHR();
    let method = 'GET';
    let url = '';
    let requestBody: string | undefined;
    let start = 0;

    const origOpen = xhr.open.bind(xhr);
    xhr.open = function (m: string, u: string, async?: boolean, user?: string | null, password?: string | null) {
      method = m.toUpperCase();
      url = u;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (origOpen as any)(m, u, async, user, password);
    };

    const origSend = xhr.send.bind(xhr);
    xhr.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      start = Date.now();

      // Capture request body
      if (body && typeof body === 'string') {
        requestBody = redactSensitive(body);
      } else if (body instanceof URLSearchParams) {
        requestBody = body.toString().slice(0, 500);
      }

      xhr.addEventListener('loadend', () => {
        if (url.includes('/api/bugs/submit')) return;
        const duration = Date.now() - start;
        const status = xhr.status;
        const isError = status === 0 || status >= 400;

        const entry: NetworkRequest = {
          url: url.length > 120 ? url.slice(0, 120) + '…' : url,
          method,
          status,
          durationMs: duration,
          isError,
        };

        if (isError) {
          if (requestBody) entry.requestBody = requestBody;
          try {
            const resText = xhr.responseText;
            if (resText) entry.responseBody = redactSensitive(resText);
          } catch { /* ignore */ }

          pushCapped(eventLog, {
            type: 'network_error',
            description: `${method} ${shortUrl(url)} → ${status || 'network error'}`,
            timestamp: Date.now(),
          }, MAX_EVENTS);
        }

        pushCapped(networkLog, entry, MAX_NETWORK);
      });

      return origSend(body);
    };

    return xhr;
  };
}

// ── Console interception ────────────────────────────────────────────────────

let consolePaetched = false;

function patchConsole() {
  if (consolePaetched || typeof window === 'undefined') return;
  consolePaetched = true;

  const levels: Array<'error' | 'warn'> = ['error', 'warn'];
  levels.forEach(level => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      const message = args
        .map(a => {
          if (typeof a === 'string') return a;
          if (a instanceof Error) return `${a.message}`;
          try { return JSON.stringify(a); } catch { return String(a); }
        })
        .join(' ')
        .slice(0, 200);

      const entry: ConsoleEntry = { level, message };

      // Try to extract file:line from Error stack
      const stack = new Error().stack ?? '';
      const match = stack.split('\n').find(l => !l.includes('collector') && l.includes('.tsx'));
      if (match) {
        const fileMatch = match.match(/([^/\\]+\.tsx?:\d+)/);
        if (fileMatch) entry.source = fileMatch[1];
      }

      pushCapped(consoleLog, entry, MAX_CONSOLE);

      if (level === 'error') {
        pushCapped(eventLog, {
          type: 'console_error',
          description: message.slice(0, 100),
          timestamp: Date.now(),
        }, MAX_EVENTS);
      }
    };
  });
}

// ── Global error / unhandled rejection ─────────────────────────────────────

let errorPatched = false;

function patchGlobalErrors() {
  if (errorPatched || typeof window === 'undefined') return;
  errorPatched = true;

  // Unhandled JS exceptions
  window.addEventListener('error', (e) => {
    const message = e.message || 'Unknown error';
    const source = e.filename
      ? `${e.filename.split('/').slice(-1)[0]}:${e.lineno}`
      : undefined;

    pushCapped(consoleLog, { level: 'error', message: message.slice(0, 200), source }, MAX_CONSOLE);
    pushCapped(eventLog, {
      type: 'console_error',
      description: `Uncaught: ${message.slice(0, 100)}${source ? ` [${source}]` : ''}`,
      timestamp: Date.now(),
    }, MAX_EVENTS);
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const message = reason instanceof Error
      ? reason.message
      : typeof reason === 'string' ? reason : JSON.stringify(reason) ?? 'Unhandled rejection';

    // Try to get file:line from stack
    let source: string | undefined;
    if (reason instanceof Error && reason.stack) {
      const match = reason.stack.split('\n').find(l => l.includes('.tsx') || l.includes('.js'));
      if (match) {
        const fm = match.match(/([^/\\]+\.[jt]sx?:\d+)/);
        if (fm) source = fm[1];
      }
    }

    pushCapped(consoleLog, { level: 'error', message: message.slice(0, 200), source }, MAX_CONSOLE);
    pushCapped(eventLog, {
      type: 'console_error',
      description: `Unhandled rejection: ${message.slice(0, 100)}${source ? ` [${source}]` : ''}`,
      timestamp: Date.now(),
    }, MAX_EVENTS);
  });
}

// ── DOM event tracking ──────────────────────────────────────────────────────

let domPatched = false;

function patchDom() {
  if (domPatched || typeof window === 'undefined') return;
  domPatched = true;

  // Track navigation (popstate + pushState)
  const pushState = history.pushState.bind(history);
  history.pushState = function (...args) {
    pushState(...args);
    pushCapped(eventLog, {
      type: 'navigation',
      description: `Navigated to ${window.location.pathname}`,
      timestamp: Date.now(),
    }, MAX_EVENTS);
  };

  window.addEventListener('popstate', () => {
    pushCapped(eventLog, {
      type: 'navigation',
      description: `Back/forward to ${window.location.pathname}`,
      timestamp: Date.now(),
    }, MAX_EVENTS);
  });

  // Track significant clicks (buttons and links)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!target || typeof target.closest !== 'function') return;

    const el = target.closest('button, a, [role="button"]') as HTMLElement | null;
    if (!el) return;

    // Skip the buggy-bag widget itself
    if (el.closest('[data-buggy-bag]')) return;

    const label =
      el.getAttribute('aria-label') ||
      el.textContent?.trim().slice(0, 40) ||
      el.tagName.toLowerCase();

    pushCapped(eventLog, {
      type: 'click',
      description: `Clicked "${label}"`,
      timestamp: Date.now(),
    }, MAX_EVENTS);
  }, { capture: true, passive: true });
}

// ── Form change tracking ────────────────────────────────────────────────────

let formPatched = false;

function patchFormEvents() {
  if (formPatched || typeof window === 'undefined') return;
  formPatched = true;

  // Track form field changes (field name only, not value — privacy)
  document.addEventListener('change', (e) => {
    const target = e.target as HTMLElement;
    if (!target || typeof target.closest !== 'function' || target.closest('[data-buggy-bag]')) return;

    const tag = target.tagName.toLowerCase();
    if (!['input', 'select', 'textarea'].includes(tag)) return;

    const name =
      target.getAttribute('name') ||
      target.getAttribute('id') ||
      target.getAttribute('aria-label') ||
      tag;

    const inputEl = target as HTMLInputElement;
    let detail = '';
    if (tag === 'select') {
      const sel = target as HTMLSelectElement;
      detail = sel.options[sel.selectedIndex]?.text?.slice(0, 30) ?? '';
    } else if (inputEl.type === 'checkbox' || inputEl.type === 'radio') {
      detail = inputEl.checked ? 'checked' : 'unchecked';
    } else {
      detail = '(value hidden)'; // privacy
    }

    pushCapped(eventLog, {
      type: 'form_change',
      description: `Changed field "${name}"${detail ? `: ${detail}` : ''}`,
      timestamp: Date.now(),
    }, MAX_EVENTS);
  }, { capture: true, passive: true });

  // Track focus events on form fields (helps trace user flow)
  document.addEventListener('focus', (e) => {
    const target = e.target as HTMLElement;
    if (!target || typeof target.closest !== 'function' || target.closest('[data-buggy-bag]')) return;

    const tag = target.tagName.toLowerCase();
    if (!['input', 'select', 'textarea'].includes(tag)) return;

    const name =
      target.getAttribute('name') ||
      target.getAttribute('id') ||
      target.getAttribute('aria-label') ||
      target.getAttribute('placeholder') ||
      tag;

    pushCapped(eventLog, {
      type: 'focus',
      description: `Focused field "${name}"`,
      timestamp: Date.now(),
    }, MAX_EVENTS);
  }, { capture: true, passive: true });
}

// ── Scroll milestone tracking ───────────────────────────────────────────────

let scrollPatched = false;
const scrollMilestones = new Set<number>(); // which percentages already logged

function patchScrollTracking() {
  if (scrollPatched || typeof window === 'undefined') return;
  scrollPatched = true;

  const milestones = [25, 50, 75, 100];

  const onScroll = () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    const pct = Math.round((window.scrollY / docHeight) * 100);

    for (const m of milestones) {
      if (pct >= m && !scrollMilestones.has(m)) {
        scrollMilestones.add(m);
        pushCapped(eventLog, {
          type: 'scroll',
          description: `Scrolled to ${m}% of page`,
          timestamp: Date.now(),
        }, MAX_EVENTS);
      }
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });

  // Reset milestones on navigation
  window.addEventListener('popstate', () => { scrollMilestones.clear(); });
}


function findReactComponentFromFiber(element: HTMLElement | null): ComponentInfo | null {
  if (!element) return null;

  let el: HTMLElement | null = element;
  while (el) {
    const fiberKey = Object.keys(el).find(
      k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')
    );
    if (fiberKey) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let fiber = (el as any)[fiberKey];
      // Walk fiber tree upward to find a named component
      while (fiber) {
        const name: string | undefined =
          fiber.type?.displayName ||
          fiber.type?.name ||
          fiber.elementType?.displayName ||
          fiber.elementType?.name;

        if (name && name !== 'div' && !name.startsWith('_') && name.length > 1) {
          // Extract primitive props (skip children and event handlers)
          const rawProps = fiber.memoizedProps ?? {};
          const props: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(rawProps)) {
            if (k === 'children' || typeof v === 'function') continue;
            if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
              props[k] = v;
            }
          }

          // Try to get file path from _debugSource (available in React dev builds)
          let filePath: string | undefined;
          let lineNumber: number | undefined;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const debugSource = (fiber as any)._debugSource;
            if (debugSource?.fileName) {
              // Normalize path: strip everything before src/
              const raw: string = debugSource.fileName;
              const srcIdx = raw.lastIndexOf('/src/');
              filePath = srcIdx >= 0 ? raw.slice(srcIdx + 1) : raw.split('/').slice(-2).join('/');
              lineNumber = debugSource.lineNumber;
            }
          } catch { /* ignore — not available in prod */ }

          return {
            name,
            props: Object.keys(props).length ? props : undefined,
            filePath,
            lineNumber,
          };
        }
        fiber = fiber.return;
      }
    }
    el = el.parentElement;
  }
  return null;
}

// ── CSS Selector generator ──────────────────────────────────────────────────

/**
 * Generates the shortest unique CSS selector for an element.
 * Priority: id → aria-label → unique class combo → nth-child fallback
 */
function buildCssSelector(element: Element): string {
  if (!element || element === document.body) return 'body';

  const tag = element.tagName.toLowerCase();

  // id is the strongest unique selector
  if (element.id) {
    return `${tag}#${CSS.escape(element.id)}`;
  }

  // aria-label is human-readable and often unique
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return `${tag}[aria-label="${ariaLabel.slice(0, 40)}"]`;
  }

  // name attribute for form elements
  const name = element.getAttribute('name');
  if (name && ['input', 'select', 'textarea', 'button'].includes(tag)) {
    return `${tag}[name="${name}"]`;
  }

  // Try building a path up to 3 levels deep
  const parts: string[] = [];
  let el: Element | null = element;
  let depth = 0;

  while (el && el !== document.body && depth < 4) {
    let part = el.tagName.toLowerCase();

    if (el.id) {
      parts.unshift(`${part}#${CSS.escape(el.id)}`);
      break; // id is unique enough, stop
    }

    // Take the first meaningful class (skip utility classes like "w-full")
    const classes = Array.from(el.classList)
      .filter(c => c.length > 2 && !/^(w-|h-|p-|m-|flex|grid|text-|bg-|border|rounded|block|inline|hidden|absolute|relative|fixed|overflow|z-|cursor-)/.test(c))
      .slice(0, 2);

    if (classes.length > 0) {
      part += '.' + classes.join('.');
    }

    // Add nth-child if siblings exist with same tag
    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === el!.tagName);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(el) + 1;
        part += `:nth-child(${idx})`;
      }
    }

    parts.unshift(part);
    el = el.parentElement;
    depth++;
  }

  return parts.join(' > ');
}

// ── Data source registry (Task 5) ──────────────────────────────────────────

/**
 * Programmatic data source registry.
 * BuggyBag.registerDataSource('#price', 'supabase:products.price')
 * Stored as Map<cssSelector, source>
 */
const dataSourceRegistry = new Map<string, string>();

/**
 * Register a CSS selector → data source mapping.
 * When a pin lands on a matching element, the source is included in the report.
 * @example BuggyBag.registerDataSource('#price', 'supabase:products.price')
 */
export function registerDataSource(selector: string, source: string): void {
  dataSourceRegistry.set(selector, source);
}

/**
 * Reads `data-buggy-source` attributes from an element and its ancestors,
 * AND checks the programmatic registry for any matching selectors.
 * Client apps can annotate elements: <span data-buggy-source="supabase:products.price">
 */
function readDataSources(element: Element | null): string[] {
  if (!element) return [];
  const sources: string[] = [];
  let el: Element | null = element;
  let depth = 0;

  // 1. Walk DOM upward reading data-buggy-source attributes
  while (el && el !== document.body && depth < 5) {
    const src = el.getAttribute('data-buggy-source');
    if (src && !sources.includes(src)) {
      sources.push(src);
    }
    el = el.parentElement;
    depth++;
  }

  // 2. Check programmatic registry — test element against each registered selector
  if (dataSourceRegistry.size > 0) {
    let checkEl: Element | null = element;
    let checkDepth = 0;
    while (checkEl && checkEl !== document.body && checkDepth < 5) {
      for (const [selector, source] of dataSourceRegistry) {
        try {
          if (checkEl.matches(selector) && !sources.includes(source)) {
            sources.push(source);
          }
        } catch { /* invalid selector — skip */ }
      }
      checkEl = checkEl.parentElement;
      checkDepth++;
    }
  }

  return sources;
}

// ── PIN Element Context ─────────────────────────────────────────────────────

/**
 * Captures rich DOM context for the element at the given coordinates.
 * Called when a pin is placed on the page.
 */
export function getPinElementContext(x: number, y: number): PinElementContext | null {
  if (typeof document === 'undefined') return null;

  try {
    // Get all elements at point, find the first non-buggy-bag one
    const elements = document.elementsFromPoint(x, y);
    const target = elements.find(el => {
      // Skip the buggy-bag widget itself and its shadow DOM
      const htmlEl = el as HTMLElement;
      return !htmlEl.closest?.('[data-buggy-bag]') &&
             el !== document.documentElement &&
             el !== document.body;
    }) as HTMLElement | null;

    if (!target) return null;

    const tag = target.tagName.toLowerCase();
    const rect = target.getBoundingClientRect();

    // Get inner text (visible text content, not HTML)
    const rawText = target.innerText?.trim() ?? target.textContent?.trim() ?? '';
    const innerText = rawText.length > 0 ? rawText.slice(0, 80) : undefined;

    // Get classes as array (filter empty strings)
    const classes = Array.from(target.classList).filter(Boolean);

    // Build optional attributes
    const id = target.id || undefined;
    const ariaLabel = target.getAttribute('aria-label') || undefined;
    const role = target.getAttribute('role') || undefined;
    const href = (target as HTMLAnchorElement).href || undefined;
    const inputType = tag === 'input' ? (target as HTMLInputElement).type || undefined : undefined;
    const inputName = target.getAttribute('name') || undefined;
    const placeholder = target.getAttribute('placeholder') || undefined;

    // Generate CSS selector
    const selector = buildCssSelector(target);

    // Read data-buggy-source annotations
    const dataSources = readDataSources(target);

    // Get React component from fiber
    const reactInfo = findReactComponentFromFiber(target);
    const reactComponent = reactInfo ? {
      name: reactInfo.name,
      filePath: reactInfo.filePath,
      lineNumber: reactInfo.lineNumber,
      props: reactInfo.props,
    } : undefined;

    return {
      tagName: tag,
      id,
      classes,
      selector,
      ariaLabel,
      innerText,
      role,
      href: href && href.length > 0 && href !== window.location.href ? href : undefined,
      inputType,
      inputName,
      placeholder,
      dataSources: dataSources.length > 0 ? dataSources : undefined,
      reactComponent,
      boundingRect: {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    };
  } catch {
    return null;
  }
}

// ── Zustand store reader + Store Diff (Task 6) ──────────────────────────────

/** Baseline snapshot taken at initCollector() — used to compute store diff */
let baselineSnapshot: Record<string, unknown> | null = null;

function readStoreSnapshot(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;

  // Common patterns: window.__store, window.__zustand, window.store
  const candidates = ['__store', '__zustandStore', 'store', '__appStore'];
  for (const key of candidates) {
    if (w[key] && typeof w[key].getState === 'function') {
      try {
        const state = w[key].getState();
        return sanitizeSnapshot(state);
      } catch { /* ignore */ }
    }
  }

  // Try Redux devtools
  if (w.__REDUX_DEVTOOLS_EXTENSION__) {
    try {
      const store = w.__REDUX_STORE__;
      if (store?.getState) return sanitizeSnapshot(store.getState());
    } catch { /* ignore */ }
  }

  return null;
}

function sanitizeSnapshot(state: unknown, depth = 0): Record<string, unknown> {
  if (depth > 2 || typeof state !== 'object' || state === null) return {};
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state as Record<string, unknown>)) {
    if (typeof v === 'function') continue;
    // Mask sensitive keys
    if (/password|token|secret|key|auth|credential/i.test(k)) {
      result[k] = '***';
      continue;
    }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
      result[k] = v;
    } else if (typeof v === 'object') {
      const nested = sanitizeSnapshot(v, depth + 1);
      if (Object.keys(nested).length) result[k] = nested;
    }
  }
  return result;
}

/**
 * Compares baseline (page load) snapshot to current snapshot.
 * Returns only the fields that changed — giving developers
 * instant "what changed in state before the bug" insight.
 */
function getStoreDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): Record<string, { before: unknown; after: unknown }> | null {
  if (!before || !after) return null;

  const diff: Record<string, { before: unknown; after: unknown }> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const bVal = before[key];
    const aVal = after[key];
    // Deep comparison via JSON (handles primitives + plain objects)
    try {
      if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
        diff[key] = { before: bVal, after: aVal };
      }
    } catch {
      if (bVal !== aVal) diff[key] = { before: bVal, after: aVal };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

// ── Auto severity ───────────────────────────────────────────────────────────

function calcAutoSeverity(
  network: NetworkRequest[],
  console_: ConsoleEntry[]
): BugSeverity {
  const has5xx = network.some(r => r.status >= 500);
  const has4xx = network.some(r => r.status >= 400 && r.status < 500);
  const hasConsoleError = console_.some(c => c.level === 'error');

  if (has5xx) return 'critical';
  if (has4xx && hasConsoleError) return 'high';
  if (has4xx || hasConsoleError) return 'medium';
  return 'low';
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Call once when the widget mounts */
export function initCollector() {
  patchFetch();
  patchXHR();
  patchConsole();
  patchGlobalErrors();
  patchDom();
  patchFormEvents();
  patchScrollTracking();

  // Record initial navigation
  pushCapped(eventLog, {
    type: 'navigation',
    description: `Opened ${window.location.pathname}`,
    timestamp: Date.now(),
  }, MAX_EVENTS);

  // Task 6: Capture baseline store snapshot shortly after mount
  // (slight delay to let stores initialize)
  setTimeout(() => {
    baselineSnapshot = readStoreSnapshot();
  }, 500);
}

/** Collect full tech context at the moment of capture */
export function collectTechContext(clickedElement?: HTMLElement | null): TechContext {
  const network = [...networkLog];
  const console_ = [...consoleLog];
  const now = Date.now();

  // Stamp each event with relativeMs (how long ago it happened relative to this report)
  const events = recentEvents().map(e => ({
    ...e,
    relativeMs: now - e.timestamp,
  }));

  const component = findReactComponentFromFiber(clickedElement ?? null);
  const storeSnapshot = readStoreSnapshot();

  // Task 6: compute store diff (baseline → current)
  const storeDiff = getStoreDiff(baselineSnapshot, storeSnapshot);

  return {
    route: window.location.pathname + window.location.search,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
    component,
    storeSnapshot,
    storeDiff: storeDiff ?? undefined,
    networkRequests: network,
    consoleErrors: console_,
    eventLog: events,
    autoSeverity: calcAutoSeverity(network, console_),
  };
}
