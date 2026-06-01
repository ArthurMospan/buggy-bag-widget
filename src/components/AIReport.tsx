import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Loader } from 'lucide-react';
import { Dialog } from './ui/Dialog';
import type { Bug } from '../types';

interface AIReportProps {
  isOpen: boolean;
  onClose: () => void;
  activeBugs: Bug[];
  aiEndpoint: string;
}

export function AIReport({ isOpen, onClose, activeBugs, aiEndpoint }: AIReportProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset internal state when dialog closes
  const handleClose = () => {
    setPrompt('');
    setError(null);
    setCopied(false);
    setLoading(false);
    onClose();
  };

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(aiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bugs: activeBugs.map((b) => ({
            id: b.id,
            screenshotDataUrl: b.screenshotDataUrl,
            annotations: b.annotations,
            shapes: b.shapes,
            createdAt: b.createdAt,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data: unknown = await res.json();
      const promptText =
        data !== null &&
        typeof data === 'object' &&
        'prompt' in data &&
        typeof (data as { prompt: unknown }).prompt === 'string'
          ? (data as { prompt: string }).prompt
          : JSON.stringify(data, null, 2);

      setPrompt(promptText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Невідома помилка');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be blocked in some contexts
      setError('Не вдалося скопіювати в буфер обміну');
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="AI Баг-репорт" size="lg">
      {/* Initial state — show bug count + generate button */}
      {!prompt && !loading && !error && (
        <div className="py-8 text-center">
          <p className="text-[14px] text-[#9a9a9a] mb-1">
            Активних багів для аналізу:
          </p>
          <p className="text-[32px] font-bold text-[#1f1f1f] mb-6 leading-none">
            {activeBugs.length}
          </p>
          <p className="text-[13px] text-[#9a9a9a] mb-6 max-w-[340px] mx-auto">
            Натисніть «Генерувати», щоб надіслати скріншоти та опис багів агенту
            Antigravity і отримати готовий промпт.
          </p>
          <button
            type="button"
            onClick={generate}
            className="h-[44px] px-[28px] rounded-[12px] text-[14px] font-bold bg-[#1f1f1f] text-white hover:bg-[#303030] transition-colors"
          >
            Генерувати
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-3 py-12 text-[#9a9a9a]"
        >
          <Loader size={20} className="animate-spin" aria-hidden="true" />
          <span className="text-[14px]">Генерується промпт...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex flex-col gap-4">
          <div className="rounded-[12px] bg-[#fee2e2] p-4 text-[13px] text-[#991b1b]">
            {error}
          </div>
          <button
            type="button"
            onClick={generate}
            className="h-[40px] px-[20px] rounded-[10px] text-[13px] font-bold bg-[#f5f5f5] text-[#1f1f1f] hover:bg-[#ebebeb] transition-colors self-start"
          >
            Спробувати ще раз
          </button>
        </div>
      )}

      {/* Result state */}
      {prompt && !loading && (
        <div className="flex flex-col gap-4">
          <div className="relative">
            <textarea
              readOnly
              value={prompt}
              rows={16}
              aria-label="Generated AI prompt"
              className="w-full resize-none rounded-[12px] bg-[#f4f4f5] p-4 font-mono text-[12px] text-[#1f1f1f] outline-none leading-relaxed"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={copyToClipboard}
              className="flex flex-1 h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[#1f1f1f] text-[14px] font-bold text-white transition-colors hover:bg-[#303030]"
            >
              {copied ? (
                <>
                  <Check size={16} aria-hidden="true" />
                  Скопійовано!
                </>
              ) : (
                <>
                  <Copy size={16} aria-hidden="true" />
                  Скопіювати для Antigravity
                </>
              )}
            </button>
            <button
              type="button"
              onClick={generate}
              className="h-[44px] px-[20px] rounded-[12px] text-[13px] font-bold bg-[#f5f5f5] text-[#1f1f1f] hover:bg-[#ebebeb] transition-colors"
            >
              Повторити
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
