import type { SubmitBugPayload } from '../types';

export interface QueueItem {
  id: string;
  payload: SubmitBugPayload;
  attemptedAt: number;
}

const QUEUE_KEY = 'BUGGY_BAG_OFFLINE_QUEUE';
let isFlushing = false;

export function getQueue(): QueueItem[] {
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function enqueue(payload: SubmitBugPayload): void {
  const queue = getQueue();
  const item: QueueItem = {
    id: crypto.randomUUID(),
    payload,
    attemptedAt: Date.now(),
  };
  queue.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('buggy-bag:queue-changed'));
}

export function dequeue(id: string): void {
  const queue = getQueue().filter(item => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('buggy-bag:queue-changed'));
}

export async function flushQueue(apiEndpoint: string | null, apiKey: string | undefined): Promise<void> {
  if (isFlushing) return;
  if (!apiEndpoint || !apiKey) return;
  
  const queue = getQueue();
  if (queue.length === 0) return;

  isFlushing = true;
  try {
    for (const item of queue) {
      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...item.payload, api_key: apiKey }),
        });
        
        if (res.ok) {
          dequeue(item.id);
        } else {
          // Break on first failure to maintain order and not overwhelm the server
          break;
        }
      } catch (err) {
        // Network error, stop flushing
        break;
      }
    }
  } finally {
    isFlushing = false;
  }
}
