import React from 'react';
import { Bug, List } from 'lucide-react';

interface FloatingButtonProps {
  onCapture: () => void;
  onDashboard: () => void;
  activeBugCount: number;
  showDashboardButton: boolean;
}

export function FloatingButton({
  onCapture,
  onDashboard,
  activeBugCount,
  showDashboardButton,
}: FloatingButtonProps) {
  return (
    <div
      data-buggy-bag="true"
      className="fixed bottom-6 right-6 z-[9997] flex items-center gap-2"
    >
      {showDashboardButton && (
        <button
          type="button"
          onClick={onDashboard}
          aria-label="Open Bug Dashboard"
          className="relative w-10 h-10 rounded-full flex items-center justify-center bg-[#1c1c1e] text-white border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:bg-[#2c2c2e] hover:scale-105 active:scale-95 transition-all duration-150"
          style={{ opacity: 0.88 }}
        >
          <List size={15} strokeWidth={1.75} />
          {activeBugCount > 0 && (
            <span className="absolute -top-1 -right-1 w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
              {activeBugCount > 9 ? '9+' : activeBugCount}
            </span>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={onCapture}
        aria-label="Capture Bug Screenshot"
        className="w-12 h-12 rounded-full flex items-center justify-center bg-[#1c1c1e] text-white border border-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.3)] hover:bg-[#2c2c2e] hover:scale-105 active:scale-95 transition-all duration-150"
        style={{ opacity: 0.85 }}
      >
        <Bug size={20} strokeWidth={1.75} />
      </button>
    </div>
  );
}
