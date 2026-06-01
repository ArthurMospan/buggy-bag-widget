import React, { useEffect, useState, useCallback, useRef } from 'react';
import { toPng } from 'html-to-image';
import type { DrawShape, DrawTool, SubmitBugPayload } from '../types';
import { DrawingCanvas } from './DrawingCanvas';
import { DrawingToolbar } from './DrawingToolbar';
import { ShapeAnnotation } from './ShapeAnnotation';
import { collectTechContext } from '../lib/collector';
import { Mic, MicOff, List, AlignLeft } from 'lucide-react';

interface CaptureModeProps {
  apiKey: string;
  onSend: (payload: SubmitBugPayload) => void;
  onCancel: () => void;
}

type DescMode = 'text' | 'voice';

// Speech Recognition types are declared in src/declarations.d.ts

export function CaptureMode({ apiKey, onSend, onCancel }: CaptureModeProps) {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [tool, setTool] = useState<DrawTool>('rect');
  const [shapes, setShapes] = useState<DrawShape[]>([]);
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  const [pendingShape, setPendingShape] = useState<DrawShape | null>(null);

  // Description panel
  const [showPanel, setShowPanel] = useState(false);
  const [descMode, setDescMode] = useState<DescMode>('text');
  const [description, setDescription] = useState('');
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  // Event log for "steps" tab
  const [steps, setSteps] = useState<string[]>([]);

  const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Collect tech context at mount time (before freeze/screenshot)
  const techContextRef = useRef(collectTechContext());

  useEffect(() => {
    // Populate steps from event log
    const events = techContextRef.current.eventLog;
    setSteps(events.map(e => e.description));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const captureOpts = {
      filter: (el: Element) => el.getAttribute?.('data-buggy-bag') !== 'true',
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: 1,
    };

    const timer = setTimeout(async () => {
      try {
        let dataUrl: string;
        try {
          dataUrl = await toPng(document.body, captureOpts);
        } catch {
          dataUrl = await toPng(document.body, { ...captureOpts, skipFonts: true });
        }
        if (!cancelled) setScreenshotUrl(dataUrl);
      } catch (err) {
        console.error('[BuggyBag] screenshot failed:', err);
        if (!cancelled) onCancel();
      }
    }, 80);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [onCancel]);

  const handleShapeComplete = useCallback((shape: DrawShape) => {
    setShapes(prev => [...prev, shape]);
    setPendingShape(shape);
  }, []);

  const handleAnnotationConfirm = useCallback((shapeId: string, text: string) => {
    setAnnotations(prev => ({ ...prev, [shapeId]: text }));
    setPendingShape(null);
    setShowPanel(true); // open description panel after first annotation
  }, []);

  const handleAnnotationDismiss = useCallback(() => {
    setPendingShape(pending => {
      if (pending) setShapes(prev => prev.filter(s => s.id !== pending.id));
      return null;
    });
  }, []);

  // Voice — using any to avoid SpeechRecognition lib availability issues
  const toggleVoice = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;

    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any;
    rec.lang = 'uk-UA';
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .slice(e.resultIndex)
        .map((r: any) => r[0].transcript)
        .join(' ');
      setDescription(prev => (prev + ' ' + transcript).trim());
    };
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  }, [listening]);

  const handleSend = useCallback(() => {
    if (!screenshotUrl) return;
    recRef.current?.stop();

    const techContext = techContextRef.current;

    const payload: SubmitBugPayload = {
      api_key: apiKey,
      base64_image: screenshotUrl,
      shapes,
      annotations,
      description: description.trim() || 'Без опису',
      tech_context: techContext,
    };

    onSend(payload);
  }, [screenshotUrl, shapes, annotations, description, apiKey, onSend]);

  return (
    <div
      data-buggy-bag="true"
      className="fixed inset-0 z-[10000]"
      style={{ userSelect: 'none' }}
    >
      {/* Screenshot background */}
      {screenshotUrl ? (
        <img
          src={screenshotUrl}
          alt="Page screenshot"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
          <span className="text-white/90 text-[15px] font-semibold animate-pulse">
            ⏸ Заморожую сторінку...
          </span>
          <span className="text-white/40 text-[12px]">Збираю технічний контекст</span>
        </div>
      )}

      {/* Drawing canvas */}
      {screenshotUrl && !pendingShape && !showPanel && (
        <DrawingCanvas
          width={w}
          height={h}
          tool={tool}
          shapes={shapes}
          onShapeComplete={handleShapeComplete}
        />
      )}

      {/* Annotation popup */}
      {pendingShape && (
        <ShapeAnnotation
          shape={pendingShape}
          containerWidth={w}
          containerHeight={h}
          onConfirm={handleAnnotationConfirm}
          onDismiss={handleAnnotationDismiss}
        />
      )}

      {/* Toolbar */}
      {screenshotUrl && !showPanel && (
        <DrawingToolbar
          activeTool={tool}
          onToolChange={setTool}
          onSave={() => setShowPanel(true)}
          onCancel={onCancel}
          saveLabel="Далі →"
        />
      )}

      {/* Description panel */}
      {screenshotUrl && showPanel && (
        <div
          className="absolute inset-0 flex items-end justify-center pb-6"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => {}}
        >
          <div
            className="w-full max-w-[520px] mx-4 rounded-[20px] overflow-hidden"
            style={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Tech context summary bar */}
            <div className="px-4 py-3 border-b border-white/[0.07] flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-white/30">
                {techContextRef.current.route}
              </span>
              {techContextRef.current.component && (
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 rounded px-2 py-0.5 font-mono">
                  {techContextRef.current.component.name}
                </span>
              )}
              {techContextRef.current.networkRequests.filter(r => r.isError).map((r, i) => (
                <span key={i} className="text-[10px] bg-red-500/20 text-red-300 rounded px-2 py-0.5 font-mono">
                  {r.status} {r.url.split('/').slice(-2).join('/')}
                </span>
              ))}
              {techContextRef.current.consoleErrors.length > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 rounded px-2 py-0.5">
                  {techContextRef.current.consoleErrors.length} console error{techContextRef.current.consoleErrors.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Mode tabs */}
            <div className="flex border-b border-white/[0.07]">
              {(['text', 'voice'] as DescMode[]).map(m => {
                const Icon = m === 'text' ? AlignLeft : Mic;
                const label = m === 'text' ? 'Текст' : 'Голос';
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDescMode(m)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition-colors"
                    style={{
                      color: descMode === m ? '#fff' : 'rgba(255,255,255,0.35)',
                      borderBottom: descMode === m ? '2px solid #818cf8' : '2px solid transparent',
                    }}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Text mode */}
            {descMode === 'text' && (
              <div className="px-4 pt-3 pb-2">
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Опишіть що не так..."
                  autoFocus
                  rows={3}
                  className="w-full bg-white/5 rounded-[10px] text-[13px] text-white placeholder:text-white/25 resize-none outline-none border border-white/[0.08] focus:border-white/20 p-3 transition-colors"
                />
              </div>
            )}

            {/* Voice mode */}
            {descMode === 'voice' && (
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={toggleVoice}
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors mt-0.5"
                    style={{ background: listening ? '#ef4444' : 'rgba(255,255,255,0.08)' }}
                    title={listening ? 'Зупинити' : 'Записати голос'}
                  >
                    {listening ? <MicOff size={16} className="text-white" /> : <Mic size={16} className="text-white/70" />}
                  </button>
                  <div className="flex-1">
                    <p className="text-[11px] text-white/40 mb-1">
                      {listening ? 'Слухаю...' : 'Натисни щоб записати'}
                    </p>
                    <p className="text-[13px] text-white min-h-[40px]">
                      {description || <span className="text-white/25">Транскрипція з'явиться тут...</span>}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Steps preview */}
            {steps.length > 0 && (
              <div className="px-4 pb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <List size={11} className="text-white/30" />
                  <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
                    Кроки відтворення (авто)
                  </span>
                </div>
                <div className="bg-white/[0.04] rounded-[8px] px-3 py-2 max-h-[80px] overflow-y-auto">
                  {steps.slice(-5).map((step, i) => (
                    <p key={i} className="text-[11px] text-white/50 font-mono leading-relaxed">
                      {i + 1}. {step}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={() => setShowPanel(false)}
                className="px-4 py-2 rounded-[10px] text-[12px] font-semibold text-white/50 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                ← Назад
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-[10px] text-[12px] font-semibold text-white/50 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!screenshotUrl}
                className="flex-1 py-2 rounded-[10px] text-[13px] font-bold text-white transition-colors disabled:opacity-40"
                style={{ background: '#4f46e5' }}
              >
                Надіслати на портал →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
