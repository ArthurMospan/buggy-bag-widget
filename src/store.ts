/**
 * store.ts
 * Список багів більше не зберігається локально — все йде на портал.
 * Файл залишений для зворотної сумісності.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useBugStore = () => ({
  bugs: [] as any[],
  addBug: () => {},
  updateBugStatus: () => {},
  removeBug: () => {},
});
