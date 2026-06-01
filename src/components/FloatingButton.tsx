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
          className="relative w-10 h-10 rounded-full flex items-center justify-center bg-white/15 backdrop-blur-md border border-white/25 text-white shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:bg-white/25 hover:scale-110 active:scale-95 transition-all duration-150"
        >
          <List size={16} strokeWidth={1.75} />
          {activeBugCount > 0 && (
            <span className="absolute -top-1 -right-1 w-[17px] h-[17px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none shadow-sm">
              {activeBugCount > 9 ? '9+' : activeBugCount}
            </span>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={onCapture}
        aria-label="Capture Bug Screenshot"
        className="w-12 h-12 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-md border border-white/20 text-white shadow-[0_8px_32px_rgba(0,0,0,0.45)] hover:bg-black/65 hover:scale-110 active:scale-95 transition-all duration-150"
      >
        <Bug size={20} strokeWidth={1.75} />
      </button>
    </div>
  );
}
