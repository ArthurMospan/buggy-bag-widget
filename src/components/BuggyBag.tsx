import React, { useState } from 'react';
import { GodModeGuard } from '../guard';
import { useBugStore } from '../store';
import { FloatingButton } from './FloatingButton';
import { CaptureMode } from './CaptureMode';
import { Dashboard } from './Dashboard';
import type { Bug } from '../types';
import '../styles.css';

type Mode = 'idle' | 'capture' | 'dashboard';

function BuggyBagInner() {
  const [mode, setMode] = useState<Mode>('idle');
  const { bugs, addBug, updateBugStatus } = useBugStore();

  const activeBugCount = bugs.filter((b) => b.status === 'active').length;

  const handleSaveBug = (data: Omit<Bug, 'id' | 'createdAt' | 'status'>) => {
    addBug({
      ...data,
      id: Math.random().toString(36).slice(2, 11),
      createdAt: Date.now(),
      status: 'active',
    });
    setMode('dashboard');
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

export function BuggyBag() {
  return (
    <GodModeGuard>
      <BuggyBagInner />
    </GodModeGuard>
  );
}
