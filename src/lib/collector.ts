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
} from '../types';

const MAX_NETWORK = 20;
const MAX_CONSOLE = 10;
const MAX_EVENTS = 50;
const EVENT_WINDOW_MS = 30_000;

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

let fetchPatched = false;

function patchFetch() {
  if (fetchPatched || typeof window === 'undefined') return;
  fetchPatched = true;

  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? 'GET';
    const start = Date.now();

    try {
      const res = await original(input, init);
      const duration = Date.now() - start;
      const isError = res.status >= 400;

      const entry: NetworkRequest = {
        url: url.length > 120 ? url.slice(0, 120) + '…' : url,
        method: method.toUpperCase(),
        status: res.status,
        durationMs: duration,
        isError,
      };
      pushCapped(networkLog, entry, MAX_NETWORK);

      if (isError) {
        pushCapped(eventLog, {
          type: 'network_error',
          description: `${method.toUpperCase()} ${shortUrl(url)} → ${res.status}`,
          timestamp: Date.now(),
        }, MAX_EVENTS);
      }

      return res;
    } catch (err) {
      const duration = Date.now() - start;
      const entry: NetworkRequest = {
        url: url.length > 120 ? url.slice(0, 120) + '…' : url,
        method: method.toUpperCase(),
        status: 0,
        durationMs: duration,
        isError: true,
      };
      pushCapped(networkLog, entry, MAX_NETWORK);
      pushCapped(eventLog, {
        type: 'network_error',
        description: `${method.toUpperCase()} ${shortUrl(url)} → network error`,
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
    if (!target) return;

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

// ── React component finder ──────────────────────────────────────────────────

function findReactComponent(element: HTMLElement | null): ComponentInfo | null {
  if (!element) return null;

  // Walk up the DOM looking for a React fiber
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
          // Try to extract props (skip children and event handlers)
          const rawProps = fiber.memoizedProps ?? {};
          const props: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(rawProps)) {
            if (k === 'children' || typeof v === 'function') continue;
            if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
              props[k] = v;
            }
          }

          return { name, props: Object.keys(props).length ? props : undefined };
        }
        fiber = fiber.return;
      }
    }
    el = el.parentElement;
  }
  return null;
}

// ── Zustand store reader ────────────────────────────────────────────────────

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

  // Try to find zustand stores attached to React devtools
  if (w.__REDUX_DEVTOOLS_EXTENSION__) {
    // Redux devtools: get current state
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
  patchConsole();
  patchGlobalErrors();
  patchDom();

  // Record initial navigation
  pushCapped(eventLog, {
    type: 'navigation',
    description: `Opened ${window.location.pathname}`,
    timestamp: Date.now(),
  }, MAX_EVENTS);
}

/** Collect full tech context at the moment of capture */
export function collectTechContext(clickedElement?: HTMLElement | null): TechContext {
  const network = [...networkLog];
  const console_ = [...consoleLog];
  const events = recentEvents();
  const component = findReactComponent(clickedElement ?? null);
  const storeSnapshot = readStoreSnapshot();

  return {
    route: window.location.pathname + window.location.search,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,
    component,
    storeSnapshot,
    networkRequests: network,
    consoleErrors: console_,
    eventLog: events,
    autoSeverity: calcAutoSeverity(network, console_),
  };
}
