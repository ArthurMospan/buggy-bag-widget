import React from 'react';

export function isGodModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('BUGGY_BAG_ACCESS') === 'active';
}

export function GodModeGuard({ children }: { children: React.ReactNode }) {
  const [active, setActive] = React.useState(false);
  React.useEffect(() => {
    setActive(isGodModeActive());
  }, []);
  if (!active) return null;
  return <>{children}</>;
}
