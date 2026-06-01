import React from 'react';
import { Square, ArrowRight, MapPin } from 'lucide-react';
import type { DrawTool } from '../types';

interface DrawingToolbarProps {
  activeTool: DrawTool;
  onToolChange: (tool: DrawTool) => void;
  onSave: () => void;
  onCancel: () => void;
}

const TOOLS: { tool: DrawTool; label: string; Icon: React.ElementType }[] = [
  { tool: 'rect',  label: 'Виділити зону',     Icon: Square },
  { tool: 'arrow', label: 'Намалювати стрілку', Icon: ArrowRight },
  { tool: 'pin',   label: 'Поставити пін',      Icon: MapPin },
];

export function DrawingToolbar({
  activeTool,
  onToolChange,
  onSave,
  onCancel,
}: DrawingToolbarProps) {
  return (
    <div
      data-buggy-bag="true"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-2 bg-white rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.2)] px-3 py-2"
    >
      {TOOLS.map(({ tool, label, Icon }) => (
        <button
          key={tool}
          type="button"
          onClick={() => onToolChange(tool)}
          title={label}
          aria-pressed={activeTool === tool}
          className={`flex items-center gap-[6px] h-[36px] px-[14px] rounded-[10px] text-[13px] font-bold transition-colors ${
            activeTool === tool
              ? 'bg-[#1f1f1f] text-white'
              : 'bg-transparent text-[#9a9a9a] hover:bg-[#f0f0f0] hover:text-[#1f1f1f]'
          }`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}

      <div className="w-px h-6 bg-[#e9e9e9] mx-1" aria-hidden="true" />

      <button
        type="button"
        onClick={onSave}
        className="h-[36px] px-[18px] rounded-[10px] text-[13px] font-bold bg-[#1f1f1f] text-white hover:bg-[#303030] transition-colors"
      >
        Зберегти баг
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="h-[36px] px-[18px] rounded-[10px] text-[13px] font-bold bg-[#f5f5f5] text-[#1f1f1f] hover:bg-[#ebebeb] transition-colors"
      >
        Скасувати
      </button>
    </div>
  );
}
