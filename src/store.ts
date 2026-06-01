import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Bug, BugStatus } from './types';

interface BugStore {
  bugs: Bug[];
  addBug: (bug: Bug) => void;
  updateBugStatus: (id: string, status: BugStatus) => void;
  removeBug: (id: string) => void;
}

export const useBugStore = create<BugStore>()(
  persist(
    (set) => ({
      bugs: [],
      addBug: (bug) =>
        set((state) => ({ bugs: [bug, ...state.bugs] })),
      updateBugStatus: (id, status) =>
        set((state) => ({
          bugs: state.bugs.map((b) => (b.id === id ? { ...b, status } : b)),
        })),
      removeBug: (id) =>
        set((state) => ({ bugs: state.bugs.filter((b) => b.id !== id) })),
    }),
    {
      name: 'buggy-bag-storage',
      partialize: (state) => ({ bugs: state.bugs }),
    }
  )
);
