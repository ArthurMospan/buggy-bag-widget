import React, { useState, useRef, useEffect } from 'react';
import type { DrawShape } from '../types';

interface ShapeAnnotationProps {
  shape: DrawShape;
  containerWidth: number;
  containerHeight: number;
  onConfirm: (shapeId: string, text: string) => void;
  onDismiss: () => void;
}

const W = 260;
const H = 160;

function calcPos(shape: DrawShape, cw: number, ch: number): { x: number; y: number } {
  let cx = shape.x;
  let cy = shape.y;

  if (shape.type === 'rect') {
    cx = shape.x + (shape.width ?? 0) / 2;
    cy = shape.y + Math.abs(shape.height ?? 0) + 14;
  } else if (shape.type === 'arrow' && shape.points) {
    cx = shape.points[2];
    cy = shape.points[3] + 14;
  } else if (shape.type === 'pin') {
    cx = shape.x;
    cy = shape.y + 28;
  }

  return {
    x: Math.max(8, Math.min(cx - W / 2, cw - W - 8)),
    y: Math.max(8, Math.min(cy, ch - H - 8)),
  };
}

const hasSpeechRecognition = typeof window !== 'undefined' &&
  !!(( window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition);

export function ShapeAnnotation({ shape, containerWidth, containerHeight, onConfirm, onDismiss }: ShapeAnnotationProps) {
  const [text, setText] = useState('');
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const { x, y } = calcPos(shape, containerWidth, containerHeight);

  useEffect(() => {
    const onTranscript = (e: Event) => {
      const { text: t, isFinal } = (e as CustomEvent).detail as { text: string; isFinal: boolean };
      if (isFinal) {
        setText(prev => (prev ? prev + ' ' + t : t).trim());
        setInterim('');
      } else {
        setInterim(t);
      }
    };
    const onEnd = () => { setListening(false); setInterim(''); };
    window.addEventListener('buggy-bag:transcript', onTranscript);
    window.addEventListener('buggy-bag:voice-end', onEnd);
    return () => {
      window.removeEventListener('buggy-bag:transcript', onTranscript);
      window.removeEventListener('buggy-bag:voice-end', onEnd);
    };
  }, []);

  const toggleVoice = () => {
    if (listening) {
      window.dispatchEvent(new CustomEvent('buggy-bag:stop-voice'));
      setListening(false);
    } else {
      window.dispatchEvent(new CustomEvent('buggy-bag:start-voice'));
      setListening(true);
    }
  };

  const handleConfirm = () => {
    window.dispatchEvent(new CustomEvent('buggy-bag:stop-voice'));
    onConfirm(shape.id, (text + (interim ? ' ' + interim : '')).trim());
  };

  const handleDismiss = () => {
    window.dispatchEvent(new CustomEvent('buggy-bag:stop-voice'));
    onDismiss();
  };

  return (
    <div
      style={{
        position: 'absolute', left: x, top: y,
        width: W, zIndex: 10002,
        background: '#1c1c1e',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
        padding: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
        Що тут не так?
      </div>

      <textarea
        value={text + (interim ? ' ' + interim : '')}
        onChange={e => { setText(e.target.value); setInterim(''); }}
        placeholder={listening ? '🎙 Говоріть...' : 'Опишіть проблему...'}
        rows={3}
        autoFocus
        style={{
          width: '100%', background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
          padding: '8px 10px', fontSize: '12px', color: 'white',
          resize: 'none', outline: 'none', boxSizing: 'border-box',
          fontFamily: 'inherit', lineHeight: '1.5',
          caretColor: 'white',
        }}
      />

      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
        {/* Voice button — only shown when SpeechRecognition is available */}
        {hasSpeechRecognition ? (
          <button
            type="button"
            onClick={toggleVoice}
            title={listening ? 'Зупинити' : 'Записати голосом'}
            style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              background: listening ? '#ef4444' : 'rgba(255,255,255,0.08)',
              border: 'none', cursor: 'pointer', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {listening ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            )}
          </button>
        ) : (
          <div title="Голосовий ввід доступний тільки в Chrome" style={{
            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
            background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'not-allowed',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          </div>
        )}

        {/* Cancel */}
        <button
          type="button"
          onClick={handleDismiss}
          style={{ flex: 1, height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}
        >
          Скасувати
        </button>

        {/* OK */}
        <button
          type="button"
          onClick={handleConfirm}
          style={{ flex: 1, height: '32px', borderRadius: '8px', background: '#4f46e5', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: 'white' }}
        >
          OK ✓
        </button>
      </div>
    </div>
  );
}
