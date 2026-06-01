import React from 'react';
import { Square, ArrowRight, MapPin } from 'lucide-react';
import type { DrawTool } from '../types';

interface DrawingToolbarProps {
  activeTool: DrawTool;
  onToolChange: (tool: DrawTool) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
}

const TOOLS: { tool: DrawTool; label: string; Icon: React.ElementType }[] = [
  { tool: 'rect',  label: 'Область',  Icon: Square },
  { tool: 'arrow', label: 'Стрілка',  Icon: ArrowRight },
  { tool: 'pin',   label: 'Пін',      Icon: MapPin },
];

export function DrawingToolbar({ activeTool, onToolChange, onSave, onCancel, saveLabel = 'Далі →' }: DrawingToolbarProps) {
  return (
    <div
      data-buggy-bag="true"
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'white',
        borderRadius: '14px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        padding: '8px 12px',
        whiteSpace: 'nowrap',
      }}
    >
      {TOOLS.map(({ tool, label, Icon }) => (
        <button
          key={tool}
          type="button"
          onClick={() => onToolChange(tool)}
          title={label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            height: '34px',
            padding: '0 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
            background: activeTool === tool ? '#1f1f1f' : 'transparent',
            color: activeTool === tool ? 'white' : '#9a9a9a',
          }}
        >
          <Icon size={13} />
          {label}
        </button>
      ))}

      <div style={{ width: '1px', height: '20px', background: '#e9e9e9', margin: '0 4px' }} />

      <button
        type="button"
        onClick={onSave}
        style={{
          height: '34px',
          padding: '0 16px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 'bold',
          border: 'none',
          cursor: 'pointer',
          background: '#1f1f1f',
          color: 'white',
        }}
      >
        {saveLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{
          height: '34px',
          padding: '0 16px',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 'bold',
          border: '1px solid #e9e9e9',
          cursor: 'pointer',
          background: 'white',
          color: '#1f1f1f',
        }}
      >
        Скасувати
      </button>
    </div>
  );
}
