import React, { useState } from 'react';
import { Dialog } from './ui/Dialog';
import { BugCard } from './BugCard';
import { AIReport } from './AIReport';
import type { Bug } from '../types';

type FilterStatus = 'all' | Bug['status'];

interface DashboardProps {
  isOpen: boolean;
  onClose: () => void;
  bugs: Bug[];
  onStatusChange: (id: string, status: Bug['status']) => void;
  aiEndpoint: string;
}

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all',      label: 'Усі' },
  { value: 'active',   label: 'Active' },
  { value: 'fixed',    label: 'Fixed' },
  { value: 'archived', label: 'Archived' },
];

export function Dashboard({ isOpen, onClose, bugs, onStatusChange, aiEndpoint }: DashboardProps) {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [showAIReport, setShowAIReport] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = filter === 'all' ? bugs : bugs.filter((b) => b.status === filter);
  const activeBugs = bugs.filter((b) => b.status === 'active');

  const countFor = (status: Bug['status']) => bugs.filter((b) => b.status === status).length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const activeIds = activeBugs.map((b) => b.id);
    if (selectedIds.size === activeIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activeIds));
    }
  };

  const selectedBugs = activeBugs.filter((b) => selectedIds.has(b.id));

  const handleGenerateReport = () => {
    // If nothing selected, pre-select all active
    if (selectedIds.size === 0) {
      setSelectedIds(new Set(activeBugs.map((b) => b.id)));
    }
    setShowAIReport(true);
  };

  const handleAfterReport = () => {
    // Archive all selected bugs after report is generated
    for (const id of selectedIds) {
      onStatusChange(id, 'archived');
    }
    setSelectedIds(new Set());
    setShowAIReport(false);
  };

  const handleClose = () => {
    setFilter('all');
    setShowAIReport(false);
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <>
      <Dialog isOpen={isOpen} onClose={handleClose} title="Bug Inbox" size="lg">
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

        {/* Multi-select header — only shown when active bugs exist */}
        {activeBugs.length > 0 && (filter === 'all' || filter === 'active') && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-2 text-[12px] text-[#9a9a9a] hover:text-[#1f1f1f] transition-colors"
            >
              <span className={`w-[16px] h-[16px] rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-colors ${
                selectedIds.size === activeBugs.length && activeBugs.length > 0
                  ? 'bg-[#1f1f1f] border-[#1f1f1f]'
                  : 'border-[#d4d4d4]'
              }`}>
                {selectedIds.size === activeBugs.length && activeBugs.length > 0 && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3L3.5 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              {selectedIds.size > 0 ? `Вибрано ${selectedIds.size}` : 'Вибрати всі активні'}
            </button>
          </div>
        )}

        {/* Bug list */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[14px] text-[#9a9a9a]">
              Немає багів у цьому фільтрі
            </div>
          ) : (
            filtered.map((bug) => (
              <div key={bug.id} className="flex items-start gap-2">
                {/* Checkbox — only for active bugs */}
                {bug.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => toggleSelect(bug.id)}
                    className="mt-[14px] shrink-0"
                    aria-label={selectedIds.has(bug.id) ? 'Deselect bug' : 'Select bug'}
                  >
                    <span className={`w-[16px] h-[16px] rounded-[4px] border-2 flex items-center justify-center transition-colors ${
                      selectedIds.has(bug.id)
                        ? 'bg-[#1f1f1f] border-[#1f1f1f]'
                        : 'border-[#d4d4d4]'
                    }`}>
                      {selectedIds.has(bug.id) && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3L3.5 5.5L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                  </button>
                )}
                <div className={bug.status === 'active' ? 'flex-1 min-w-0' : 'flex-1 min-w-0 pl-[24px]'}>
                  <BugCard bug={bug} onStatusChange={onStatusChange} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* AI Report CTA */}
        {activeBugs.length > 0 && (
          <div className="mt-6 pt-4 border-t border-[#f0f0f0]">
            <button
              type="button"
              onClick={handleGenerateReport}
              className="w-full h-[44px] rounded-[12px] text-[14px] font-bold bg-[#1f1f1f] text-white hover:bg-[#303030] transition-colors"
            >
              {selectedIds.size > 0
                ? `Баг-репорт для вибраних (${selectedIds.size})`
                : `Баг-репорт для всіх (${activeBugs.length})`}
            </button>
          </div>
        )}
      </Dialog>

      <AIReport
        isOpen={showAIReport}
        onClose={() => setShowAIReport(false)}
        activeBugs={selectedBugs.length > 0 ? selectedBugs : activeBugs}
        aiEndpoint={aiEndpoint}
        onAfterReport={handleAfterReport}
      />
    </>
  );
}
