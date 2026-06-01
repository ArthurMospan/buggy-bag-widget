import React, { useState } from 'react';
import { CheckCircle, RotateCcw, Archive, ChevronDown, ChevronUp } from 'lucide-react';
import type { Bug } from '../types';
import { Surface } from './ui/Surface';
import { Button } from './ui/Button';

function pluralizeShapes(n: number): string {
  const abs = Math.abs(n);
  if (abs % 100 >= 11 && abs % 100 <= 14) return 'фігур';
  switch (abs % 10) {
    case 1: return 'фігура';
    case 2:
    case 3:
    case 4: return 'фігури';
    default: return 'фігур';
  }
}

interface BugCardProps {
  bug: Bug;
  onStatusChange: (id: string, status: Bug['status']) => void;
}

const STATUS_LABEL: Record<Bug['status'], string> = {
  active:   'Активний',
  fixed:    'Виправлений',
  archived: 'Архів',
};

const STATUS_COLOR: Record<Bug['status'], string> = {
  active:   'bg-[#fef3c7] text-[#92400e]',
  fixed:    'bg-[#dcfce7] text-[#166534]',
  archived: 'bg-[#f4f4f5] text-[#9a9a9a]',
};

export function BugCard({ bug, onStatusChange }: BugCardProps) {
  const [expanded, setExpanded] = useState(false);
  const notes = Object.entries(bug.annotations).filter(([, v]) => v.trim());

  return (
    <Surface variant="panel" padding="md" className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <img
          src={bug.screenshotDataUrl}
          alt="Bug screenshot thumbnail"
          className="w-[80px] h-[52px] rounded-[10px] object-cover shrink-0 border border-[#e9e9e9]"
        />

        {/* Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`inline-flex items-center h-[22px] px-[10px] rounded-full text-[11px] font-bold ${STATUS_COLOR[bug.status]}`}
            >
              {STATUS_LABEL[bug.status]}
            </span>
            <span className="text-[11px] text-[#9a9a9a]">
              {new Date(bug.createdAt).toLocaleDateString('uk-UA', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          {/* First annotation as preview */}
          {notes[0] && (
            <p className="text-[13px] text-[#1f1f1f] line-clamp-2 leading-snug">
              {notes[0][1]}
            </p>
          )}
          {notes.length === 0 && (
            <p className="text-[13px] text-[#9a9a9a] italic">Без опису</p>
          )}
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Collapse bug details' : 'Expand bug details'}
          aria-expanded={expanded}
          className="p-1 text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#f0f0f0] rounded-[8px] transition-colors shrink-0"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded: full screenshot + all annotation notes */}
      {expanded && (
        <div className="flex flex-col gap-2">
          <img
            src={bug.screenshotDataUrl}
            alt="Full bug screenshot"
            className="w-full rounded-[10px] border border-[#e9e9e9] max-h-[300px] object-contain bg-[#f4f4f5]"
          />
          {notes.length > 0 && (
            <div className="flex flex-col gap-1">
              {notes.map(([id, text]) => (
                <Surface key={id} variant="inset" padding="sm">
                  <p className="text-[12px] text-[#1f1f1f] leading-relaxed">{text}</p>
                </Surface>
              ))}
            </div>
          )}
          <p className="text-[11px] text-[#9a9a9a]">
            {bug.shapes.length} {pluralizeShapes(bug.shapes.length)} намальовано
          </p>
        </div>
      )}

      {/* Status action buttons */}
      <div className="flex gap-2 flex-wrap">
        {bug.status === 'active' && (
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={CheckCircle}
              onClick={() => onStatusChange(bug.id, 'fixed')}
            >
              Виправлений
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={Archive}
              onClick={() => onStatusChange(bug.id, 'archived')}
            >
              Архів
            </Button>
          </>
        )}
        {(bug.status === 'fixed' || bug.status === 'archived') && (
          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={() => onStatusChange(bug.id, 'active')}
          >
            Повернути в Active
          </Button>
        )}
      </div>
    </Surface>
  );
}
