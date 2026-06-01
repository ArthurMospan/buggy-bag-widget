import React, { useState } from 'react';
import { Dialog } from './ui/Dialog';
import { BugCard } from './BugCard';
import type { Bug } from '../types';

// Temporary placeholder — replaced when AIReport.tsx is created in Task 11
function AIReportPlaceholder({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-[24px] p-8 text-center">
        <p className="text-[14px] text-[#1f1f1f] mb-4">AI Report — coming in Task 11</p>
        <button type="button" onClick={onClose} className="text-[13px] text-[#9a9a9a] hover:text-[#1f1f1f]">Закрити</button>
      </div>
    </div>
  );
}

type FilterStatus = 'all' | Bug['status'];

interface DashboardProps {
  isOpen: boolean;
  onClose: () => void;
  bugs: Bug[];
  onStatusChange: (id: string, status: Bug['status']) => void;
}

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all',      label: 'Усі' },
  { value: 'active',   label: 'Active' },
  { value: 'fixed',    label: 'Fixed' },
  { value: 'archived', label: 'Archived' },
];

export function Dashboard({ isOpen, onClose, bugs, onStatusChange }: DashboardProps) {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [showAIReport, setShowAIReport] = useState(false);

  const filtered =
    filter === 'all' ? bugs : bugs.filter((b) => b.status === filter);
  const activeBugs = bugs.filter((b) => b.status === 'active');

  const countFor = (status: Bug['status']) =>
    bugs.filter((b) => b.status === status).length;

  return (
    <>
      <Dialog isOpen={isOpen} onClose={onClose} title="Bug Inbox" size="lg">
        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 bg-[#f4f4f5] rounded-[12px] p-1">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`flex-1 h-[32px] rounded-[10px] text-[13px] font-bold transition-colors ${
                filter === value
                  ? 'bg-white text-[#1f1f1f] shadow-sm'
                  : 'text-[#9a9a9a] hover:text-[#1f1f1f]'
              }`}
            >
              {label}
              {value !== 'all' && (
                <span className="ml-1 text-[11px] opacity-60">
                  ({countFor(value as Bug['status'])})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bug list */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[14px] text-[#9a9a9a]">
              Немає багів у цьому фільтрі
            </div>
          ) : (
            filtered.map((bug) => (
              <BugCard key={bug.id} bug={bug} onStatusChange={onStatusChange} />
            ))
          )}
        </div>

        {/* AI Report CTA — only shown when active bugs exist */}
        {activeBugs.length > 0 && (
          <div className="mt-6 pt-4 border-t border-[#f0f0f0]">
            <button
              type="button"
              onClick={() => setShowAIReport(true)}
              className="w-full h-[44px] rounded-[12px] text-[14px] font-bold bg-[#1f1f1f] text-white hover:bg-[#303030] transition-colors"
            >
              Отримати баг-репорт ({activeBugs.length} active)
            </button>
          </div>
        )}
      </Dialog>

      <AIReportPlaceholder
        isOpen={showAIReport}
        onClose={() => setShowAIReport(false)}
      />
    </>
  );
}
