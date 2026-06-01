import React, { useState, useRef, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { GodModeGuard } from '../guard';
import { useBugStore } from '../store';
import { FloatingButton } from './FloatingButton';
import { CaptureMode } from './CaptureMode';
import { Dashboard } from './Dashboard';
import type { Bug } from '../types';
import widgetStyles from '../styles.css';

type Mode = 'idle' | 'capture' | 'dashboard';

export interface BuggyBagProps {
  apiEndpoint?: string;
  projectId?: string;
}

function BuggyBagInner({ apiEndpoint, projectId }: BuggyBagProps) {
  const [mode, setMode] = useState<Mode>('idle');
  const { bugs, addBug, updateBugStatus } = useBugStore();

  const activeBugCount = bugs.filter((b) => b.status === 'active').length;

  const handleSaveBug = async (data: Omit<Bug, 'id' | 'createdAt' | 'status'>) => {
    addBug({
      ...data,
      id: Math.random().toString(36).slice(2, 11),
      createdAt: Date.now(),
      status: 'active',
    });
    setMode('dashboard');

    if (apiEndpoint) {
      const base64Image = data.screenshotDataUrl.replace(/^data:image\/\w+;base64,/, '');
      const annotationsArray = Object.entries(data.annotations).map(([id, text]) => ({ id, text }));

      try {
        await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: projectId ?? '',
            image: base64Image,
            annotations: annotationsArray,
          }),
        });
      } catch {
        // Portal unreachable — bug is already saved locally
      }
    }
  };

  return (
    <>
      <FloatingButton
        onCapture={() => setMode('capture')}
        onDashboard={() => setMode((m) => (m === 'dashboard' ? 'idle' : 'dashboard'))}
        activeBugCount={activeBugCount}
        showDashboardButton={bugs.length > 0 && mode !== 'capture'}
      />

      {mode === 'capture' && (
        <CaptureMode onSave={handleSaveBug} onCancel={() => setMode('idle')} />
      )}

      <Dashboard
        isOpen={mode === 'dashboard'}
        onClose={() => setMode('idle')}
        bugs={bugs}
        onStatusChange={updateBugStatus}
      />
    </>
  );
}

export function BuggyBag({ apiEndpoint, projectId }: BuggyBagProps = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<Root | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // React StrictMode fires effects twice (mount → cleanup → remount).
    // Shadow roots can't be removed, so we reuse the existing one and clear
    // its children before repopulating.
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    while (shadow.firstChild) shadow.removeChild(shadow.firstChild);

    const styleEl = document.createElement('style');
    styleEl.textContent = widgetStyles;
    shadow.appendChild(styleEl);

    const mountPoint = document.createElement('div');
    shadow.appendChild(mountPoint);

    // A separate React root inside the shadow DOM keeps React's event
    // delegation entirely within the shadow boundary — no event retargeting
    // issues that would break onClick/onChange handlers.
    const root = createRoot(mountPoint);
    rootRef.current = root;
    root.render(
      <GodModeGuard>
        <BuggyBagInner apiEndpoint={apiEndpoint} projectId={projectId} />
      </GodModeGuard>
    );

    return () => {
      root.unmount();
      rootRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The host div is invisible to the host app — all rendered output lives
  // inside the shadow root. data-buggy-bag prevents html2canvas from capturing it.
  return <div data-buggy-bag="true" ref={hostRef} />;
}
