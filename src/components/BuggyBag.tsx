import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
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
  useEffect(() => {
    // Create the shadow host directly on document.body so it sits at the top
    // of the stacking context (z-index: max) and is never buried inside a
    // host-app flex/grid container. Width/height: 0 means it takes zero space.
    const host = document.createElement('div');
    host.setAttribute('data-buggy-bag', 'true');
    // Full-viewport cover so fixed children are within the hit-test region.
    // pointer-events:none lets host-app clicks pass through everywhere the
    // widget UI isn't rendered; elements inside the shadow DOM override this.
    host.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;pointer-events:none;';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

    // Re-enable pointer events for all shadow DOM children — the host div is
    // pointer-events:none (inherited by shadow tree), so we must reset it here.
    const peStyle = document.createElement('style');
    peStyle.textContent = '* { pointer-events: auto; }';
    shadow.appendChild(peStyle);

    const styleEl = document.createElement('style');
    styleEl.textContent = widgetStyles;
    shadow.appendChild(styleEl);

    // React root inside the shadow DOM — keeps event delegation entirely
    // within the shadow boundary so onClick/onChange fire correctly.
    const mountPoint = document.createElement('div');
    shadow.appendChild(mountPoint);

    const root = createRoot(mountPoint);
    root.render(
      <GodModeGuard>
        <BuggyBagInner apiEndpoint={apiEndpoint} projectId={projectId} />
      </GodModeGuard>
    );

    return () => {
      root.unmount();
      host.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Nothing rendered into the host React tree — all UI lives in the shadow DOM.
  return null;
}
