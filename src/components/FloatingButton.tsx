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
          className="relative w-[44px] h-[44px] bg-white border border-[#e9e9e9] text-[#1f1f1f] rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center justify-center"
        >
          <List size={18} />
          {activeBugCount > 0 && (
            <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#ef4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {activeBugCount > 9 ? '9+' : activeBugCount}
            </span>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={onCapture}
        aria-label="Capture Bug Screenshot"
        className="w-[52px] h-[52px] bg-[#1f1f1f] text-white rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:bg-[#303030] hover:scale-105 transition-all duration-200 flex items-center justify-center"
      >
        <Bug size={22} />
      </button>
    </div>
  );
}
