import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GodModeGuard } from '../guard';
import { FloatingButton } from './FloatingButton';
import { CaptureMode } from './CaptureMode';
import { initCollector } from '../lib/collector';
import type { SubmitBugPayload } from '../types';
import widgetStyles from '../styles.gen';

export interface BuggyBagProps {
  /** Portal API endpoint, e.g. "https://portal.example.com/api/bugs/submit" */
  apiEndpoint?: string;
  apiKey?: string;
  /** URL of the portal for the "Open portal" toast link */
  portalUrl?: string;
}

function BuggyBagInner({ apiEndpoint, apiKey, portalUrl }: BuggyBagProps) {
  const [capturing, setCapturing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastError, setToastError] = useState(false);

  // Init collector once
  useEffect(() => {
    initCollector();
  }, []);

  // Keyboard shortcut: Alt+B
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.altKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      setCapturing(v => !v);
    }
    if (e.key === 'Escape' && capturing) {
      setCapturing(false);
    }
  }, [capturing]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSend = async (payload: SubmitBugPayload) => {
    setCapturing(false);

    if (!apiEndpoint || !apiKey) {
      // No portal configured — just show a notice
      showToast(false);
      return;
    }

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, api_key: apiKey }),
      });
      showToast(!res.ok);
    } catch {
      showToast(true);
    }
  };

  const showToast = (isError: boolean) => {
    setToastError(isError);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  return (
    <>
      {!capturing && <FloatingButton onCapture={() => setCapturing(true)} />}

      {capturing && (
        <CaptureMode
          apiKey={apiKey ?? ''}
          onSend={handleSend}
          onCancel={() => setCapturing(false)}
        />
      )}

      {/* Toast */}
      {toastVisible && (
        <div
          data-buggy-bag="true"
          className="fixed bottom-24 right-6 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[12px] font-semibold shadow-lg"
          style={{
            background: toastError ? '#3f1c1c' : '#1c1c1e',
            color: toastError ? '#fca5a5' : '#ffffff',
            border: `1px solid ${toastError ? '#7f1d1d' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          {toastError ? '⚠ Не вдалось відправити' : '✓ Відправлено на портал'}
          {!toastError && portalUrl && (
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#818cf8', marginLeft: 4 }}
            >
              Відкрити →
            </a>
          )}
        </div>
      )}
    </>
  );
}

// ── Activation helpers (exported for use in host app) ──────────────────────

/** Returns true if buggy-bag is currently active */
export function isActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('BUGGY_BAG_ACCESS') === 'active';
}

/** Activate via URL param ?bb=on (call in your app's root) */
export function activateFromUrl(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('bb') === 'on') {
    localStorage.setItem('BUGGY_BAG_ACCESS', 'active');
    // Clean the param from URL without reload
    params.delete('bb');
    const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
    window.history.replaceState({}, '', newUrl);
  }
}

// ── Main component ─────────────────────────────────────────────────────────

export function BuggyBag({ apiEndpoint, apiKey, portalUrl }: BuggyBagProps = {}) {
  useEffect(() => {
    // Check URL param activation before mounting
    activateFromUrl();

    const host = document.createElement('div');
    host.setAttribute('data-buggy-bag', 'true');
    host.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    const peStyle = document.createElement('style');
    peStyle.textContent = '* { pointer-events: auto; }';
    shadow.appendChild(peStyle);

    const styleEl = document.createElement('style');
    styleEl.textContent = widgetStyles;
    shadow.appendChild(styleEl);

    const mountPoint = document.createElement('div');
    shadow.appendChild(mountPoint);

    const root = createRoot(mountPoint);
    root.render(
      <GodModeGuard>
        <BuggyBagInner apiEndpoint={apiEndpoint} apiKey={apiKey} portalUrl={portalUrl} />
      </GodModeGuard>
    );

    return () => {
      host.remove();
      setTimeout(() => root.unmount(), 0);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
