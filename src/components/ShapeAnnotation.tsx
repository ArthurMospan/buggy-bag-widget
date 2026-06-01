import React, { useState, useRef } from 'react';
import { Mic, MicOff, Check } from 'lucide-react';
import type { DrawShape } from '../types';

interface ShapeAnnotationProps {
  shape: DrawShape;
  containerWidth: number;
  containerHeight: number;
  onConfirm: (shapeId: string, text: string) => void;
  onDismiss: () => void;
}

const POPUP_W = 288;
const POPUP_H = 160; // approximate — used for edge clamping

/**
 * Compute ideal popup position (centered horizontally below the shape),
 * then clamp so the popup is never cut off by any screen edge.
 */
function calcPosition(
  shape: DrawShape,
  cw: number,
  ch: number
): { x: number; y: number } {
  // Find the bottom-center of the shape
  let cx: number;
  let cy: number;

  if (shape.type === 'rect') {
    // Handle negative width/height (user dragged up-left)
    const left = shape.width !== undefined && shape.width < 0 ? shape.x + shape.width : shape.x;
    const top  = shape.height !== undefined && shape.height < 0 ? shape.y + shape.height : shape.y;
    const w    = Math.abs(shape.width ?? 0);
    const h    = Math.abs(shape.height ?? 0);
    cx = left + w / 2;
    cy = top + h + 12;
  } else if (shape.type === 'arrow' && shape.points) {
    // Below the arrowhead (endpoint)
    cx = shape.points[2];
    cy = shape.points[3] + 12;
  } else {
    // Pin — below the circle
    cx = shape.x;
    cy = shape.y + 26;
  }

  // Horizontal: center popup on cx, clamp to [8, cw - POPUP_W - 8]
  const x = Math.max(8, Math.min(cx - POPUP_W / 2, cw - POPUP_W - 8));

  // Vertical: position below shape, but flip above if too close to bottom
  let y = cy;
  if (y + POPUP_H > ch - 8) {
    // Not enough room below — flip above the shape
    if (shape.type === 'rect') {
      const top = shape.height !== undefined && shape.height < 0 ? shape.y + shape.height : shape.y;
      y = top - POPUP_H - 8;
    } else if (shape.type === 'arrow' && shape.points) {
      y = Math.min(shape.points[1], shape.points[3]) - POPUP_H - 8;
    } else {
      y = shape.y - POPUP_H - 30;
    }
  }

  // Final clamp — never go above y=8
  y = Math.max(8, y);

  return { x, y };
}

// Extend global Window type for webkit prefix
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

export function ShapeAnnotation({
  shape,
  containerWidth,
  containerHeight,
  onConfirm,
  onDismiss,
}: ShapeAnnotationProps) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);
  const { x, y } = calcPosition(shape, containerWidth, containerHeight);

  const toggleVoice = () => {
    const SpeechRec = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'uk-UA';           // REQUIRED: Ukrainian locale
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      setText((prev) => (prev ? prev + ' ' + transcript : transcript).trim());
    };

    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  const handleConfirm = () => {
    recRef.current?.stop();
    onConfirm(shape.id, text.trim());
  };

  const handleDismiss = () => {
    recRef.current?.stop();
    onDismiss();
  };

  // Prevent any click inside the popup from propagating to the canvas
  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      data-buggy-bag="true"
      className="absolute z-[10002] w-[288px] bg-white rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.22)] p-3"
      style={{ left: x, top: y }}
      onClick={stopProp}
      onMouseDown={stopProp}
    >
      <p className="text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-2">
        Вкажіть причину...
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Опишіть проблему..."
        rows={3}
        autoFocus
        className="w-full bg-[#f4f4f5] rounded-[10px] text-[13px] text-[#1f1f1f] placeholder:text-[#a3a3a3] resize-none outline-none border border-transparent focus:border-[#1f1f1f] p-[10px] transition-colors leading-relaxed"
        onKeyDown={(e) => {
          // Cmd/Ctrl+Enter confirms
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleConfirm();
          // Escape dismisses
          if (e.key === 'Escape') handleDismiss();
        }}
      />

      <div className="flex gap-2 mt-2">
        {/* Mic button */}
        <button
          type="button"
          onClick={toggleVoice}
          title={listening ? 'Зупинити запис' : 'Диктувати голосом'}
          aria-label={listening ? 'Stop voice recording' : 'Start voice recording'}
          aria-pressed={listening}
          className={`w-[36px] h-[36px] rounded-[10px] flex items-center justify-center transition-colors shrink-0 ${
            listening
              ? 'bg-[#ef4444] text-white animate-pulse'
              : 'bg-[#f4f4f5] text-[#9a9a9a] hover:bg-[#e9e9e9] hover:text-[#1f1f1f]'
          }`}
        >
          {listening ? <MicOff size={14} /> : <Mic size={14} />}
        </button>

        {/* Cancel */}
        <button
          type="button"
          onClick={handleDismiss}
          className="flex-1 h-[36px] rounded-[10px] text-[13px] font-bold bg-[#f5f5f5] text-[#1f1f1f] hover:bg-[#ebebeb] transition-colors"
        >
          Скасувати
        </button>

        {/* Confirm */}
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 h-[36px] rounded-[10px] text-[13px] font-bold bg-[#1f1f1f] text-white hover:bg-[#303030] transition-colors flex items-center justify-center gap-[6px]"
        >
          <Check size={14} />
          OK
        </button>
      </div>
    </div>
  );
}
