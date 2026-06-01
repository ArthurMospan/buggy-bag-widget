import React from 'react';
import { Bug } from 'lucide-react';

interface FloatingButtonProps {
  onCapture: () => void;
}

export function FloatingButton({ onCapture }: FloatingButtonProps) {
  return (
    <div
      data-buggy-bag="true"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9997,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '4px',
      }}
    >
      {/* Keyboard hint */}
      <span style={{
        fontSize: '10px',
        fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.6)',
        color: 'rgba(255,255,255,0.8)',
        padding: '2px 6px',
        borderRadius: '4px',
        userSelect: 'none',
      }}>
        Alt+B
      </span>

      <button
        type="button"
        onClick={onCapture}
        aria-label="Зафіксувати баг (Alt+B)"
        title="Зафіксувати баг (Alt+B)"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: '#1c1c1e',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'white',
          boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2l1.88 1.88"/><path d="M14.12 3.88L16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>
        </svg>
      </button>
    </div>
  );
}
