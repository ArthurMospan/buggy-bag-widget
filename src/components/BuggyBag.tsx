import React, { useState } from 'react';
import { GodModeGuard } from '../guard';
import { useBugStore } from '../store';
import { FloatingButton } from './FloatingButton';
import { CaptureMode } from './CaptureMode';
import { Dashboard } from './Dashboard';
import type { Bug } from '../types';
import '../styles.css';

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
        onDashboard={() =>
          setMode((m) => (m === 'dashboard' ? 'idle' : 'dashboard'))
        }
        activeBugCount={activeBugCount}
        showDashboardButton={bugs.length > 0 && mode !== 'capture'}
      />

      {mode === 'capture' && (
        <CaptureMode
          onSave={handleSaveBug}
          onCancel={() => setMode('idle')}
        />
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
  return (
    <GodModeGuard>
      <BuggyBagInner apiEndpoint={apiEndpoint} projectId={projectId} />
    </GodModeGuard>
  );
}
