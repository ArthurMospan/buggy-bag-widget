import React from 'react';
import { Bug } from 'lucide-react';

interface FloatingButtonProps {
  onCapture: () => void;
}

export function FloatingButton({ onCapture }: FloatingButtonProps) {
  return (
    <div
      data-buggy-bag="true"
      className="fixed bottom-6 right-6 z-[9997] flex flex-col items-end gap-1"
    >
      {/* Keyboard hint */}
      <span className="text-[10px] font-mono text-white/40 select-none pr-[2px]">
        Alt+B
      </span>

      <button
        type="button"
        onClick={onCapture}
        aria-label="Зафіксувати баг (Alt+B)"
        title="Зафіксувати баг (Alt+B)"
        className="w-12 h-12 rounded-full flex items-center justify-center bg-[#1c1c1e] text-white border border-white/10 shadow-[0_8px_28px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.3)] hover:bg-[#2c2c2e] hover:scale-105 active:scale-95 transition-all duration-150"
        style={{ opacity: 0.85 }}
      >
        <Bug size={20} strokeWidth={1.75} />
      </button>
    </div>
  );
}
