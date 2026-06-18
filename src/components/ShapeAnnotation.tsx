import React, { useState, useRef, useEffect } from 'react';
import type { DrawShape } from '../types';

interface ShapeAnnotationProps {
  shape: DrawShape;
  initialText?: string;
  clipboardHint?: string | null;
  onClearClipboardHint?: () => void;
  containerWidth: number;
  containerHeight: number;
  onConfirm: (shapeId: string, text: string) => void;
  onDismiss: () => void;
  onDelete?: (shapeId: string) => void;
}

const W = 280;
const H = 180;

function calcPos(shape: DrawShape, cw: number, ch: number): { x: number; y: number } {
  let cx = shape.x;
  let cy = shape.y;

  if (shape.type === 'rect') {
    cx = shape.x + (shape.width ?? 0) / 2;
    cy = shape.y + Math.abs(shape.height ?? 0) + 14;
  } else if ((shape.type === 'arrow' || shape.type === 'measure') && shape.points) {
    cx = (shape.points[0] + shape.points[2]) / 2;
    cy = (shape.points[1] + shape.points[3]) / 2 + 20;
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
  !!((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition);

export function ShapeAnnotation({ shape, initialText, clipboardHint, onClearClipboardHint, containerWidth, containerHeight, onConfirm, onDismiss, onDelete }: ShapeAnnotationProps) {
  const measureDefault = shape.type === 'measure' && shape.points
    ? (() => {
        const [x1, y1, x2, y2] = shape.points;
        const dist = Math.round(Math.hypot(x2 - x1, y2 - y1));
        const dx = Math.abs(Math.round(x2 - x1));
        const dy = Math.abs(Math.round(y2 - y1));
        return `Відстань: ${dist}px (${dx} × ${dy})`;
      })()
    : initialText ?? '';
  const [text, setText] = useState(measureDefault);
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState('');
  const { x, y } = calcPos(shape, containerWidth, containerHeight);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const toggleVoice = async () => {
    if (listening) {
      window.dispatchEvent(new CustomEvent('buggy-bag:stop-voice'));
      setListening(false);
      return;
    }
    // Request mic permission before starting
    setMicError('');
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setMicError('Дозвіл на мікрофон відхилено');
      } else {
        setMicError('Мікрофон недоступний');
      }
      return;
    }
    window.dispatchEvent(new CustomEvent('buggy-bag:start-voice'));
    setListening(true);
  };

  const handleConfirm = () => {
    window.dispatchEvent(new CustomEvent('buggy-bag:stop-voice'));
    onConfirm(shape.id, (text + (interim ? ' ' + interim : '')).trim());
  };

  const handleDismiss = () => {
    window.dispatchEvent(new CustomEvent('buggy-bag:stop-voice'));
    onDismiss();
  };

  const handleDelete = () => {
    window.dispatchEvent(new CustomEvent('buggy-bag:stop-voice'));
    if (onDelete) onDelete(shape.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter → confirm
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      handleDismiss();
    }
  };

  return (
      <div
        style={{
          position: 'absolute', left: x, top: y,
          width: W, zIndex: 10002,
          background: 'rgba(28,28,30,0.85)',
          backdropFilter: 'blur(10px)',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          padding: '12px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          transition: 'opacity 0.15s',
        }}
        onClick={e => e.stopPropagation()}
      >

      <textarea
        ref={textareaRef}
        value={text + (interim ? ' ' + interim : '')}
        onChange={e => { setText(e.target.value); setInterim(''); }}
        onKeyDown={handleKeyDown}
        placeholder={listening ? '🎤 Говоріть...' : 'Опишіть проблему... (Ctrl+Enter, щоб Відправити)'}
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

      {micError && (
        <div style={{ fontSize: '10px', color: '#fca5a5', marginTop: '4px', paddingLeft: '2px' }}>
          ⚠ {micError}
        </div>
      )}

      {clipboardHint && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', padding: '6px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: '500' }}>В буфері:</span>
            <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'white', background: 'rgba(0,0,0,0.4)', padding: '2px 5px', borderRadius: '4px', fontWeight: '600' }}>{clipboardHint}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button type="button" onClick={() => { setText(t => t ? t + ' ' + clipboardHint : clipboardHint); onClearClipboardHint?.(); }} style={{ background: 'rgba(79,70,229,0.8)', border: 'none', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.15s' }}>Вставити</button>
            <button type="button" onClick={() => onClearClipboardHint?.()} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer', padding: '0 4px' }} title="Сховати">✕</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
        {/* Voice button */}
        {hasSpeechRecognition ? (
          <button
            type="button"
            onClick={toggleVoice}
            title={listening ? 'Зупинити (мікрофон)' : 'Записати голосом'}
            style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              background: listening ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.08)',
              border: listening ? '1px solid rgba(239,68,68,0.5)' : '1px solid transparent',
              cursor: 'pointer', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            {listening ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMicError('Голосовий ввід доступний тільки в Chrome/Edge/Safari')}
            title="Голосовий ввід доступний тільки в Chrome"
            style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'not-allowed', border: '1px solid transparent', padding: 0
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          </button>
        )}

        {/* Delete */}
        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            title="Видалити мітку"
            style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        )}

        {/* Cancel */}
        <button
          type="button"
          onClick={handleDismiss}
          style={{ flex: 1, height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)' }}
        >
          Скасувати
        </button>

        {/* OK — original indigo color */}
        <button
          type="button"
          onClick={handleConfirm}
          title="OK (Ctrl+Enter)"
          style={{ flex: 1, height: '32px', borderRadius: '8px', background: '#4f46e5', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: 'white' }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
