"use client";

// src/components/BuggyBag.tsx
import { useState as useState7 } from "react";

// src/guard.tsx
import React from "react";
import { Fragment, jsx } from "react/jsx-runtime";
function isGodModeActive() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("BUGGY_BAG_ACCESS") === "active";
}
function GodModeGuard({ children }) {
  const [active, setActive] = React.useState(false);
  React.useEffect(() => {
    setActive(isGodModeActive());
  }, []);
  if (!active) return null;
  return /* @__PURE__ */ jsx(Fragment, { children });
}

// src/store.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
var useBugStore = create()(
  persist(
    (set) => ({
      bugs: [],
      addBug: (bug) => set((state) => ({ bugs: [bug, ...state.bugs] })),
      updateBugStatus: (id, status) => set((state) => ({
        bugs: state.bugs.map((b) => b.id === id ? { ...b, status } : b)
      })),
      removeBug: (id) => set((state) => ({ bugs: state.bugs.filter((b) => b.id !== id) }))
    }),
    {
      name: "buggy-bag-storage",
      partialize: (state) => ({ bugs: state.bugs })
    }
  )
);

// src/components/FloatingButton.tsx
import { Bug, List } from "lucide-react";
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
function FloatingButton({
  onCapture,
  onDashboard,
  activeBugCount,
  showDashboardButton
}) {
  return /* @__PURE__ */ jsxs(
    "div",
    {
      "data-buggy-bag": "true",
      className: "fixed bottom-6 right-6 z-[9997] flex items-center gap-2",
      children: [
        showDashboardButton && /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: onDashboard,
            "aria-label": "Open Bug Dashboard",
            className: "relative w-[44px] h-[44px] bg-white border border-[#e9e9e9] text-[#1f1f1f] rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center justify-center",
            children: [
              /* @__PURE__ */ jsx2(List, { size: 18 }),
              activeBugCount > 0 && /* @__PURE__ */ jsx2("span", { className: "absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#ef4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none", children: activeBugCount > 9 ? "9+" : activeBugCount })
            ]
          }
        ),
        /* @__PURE__ */ jsx2(
          "button",
          {
            type: "button",
            onClick: onCapture,
            "aria-label": "Capture Bug Screenshot",
            className: "w-[52px] h-[52px] bg-[#1f1f1f] text-white rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:bg-[#303030] hover:scale-105 transition-all duration-200 flex items-center justify-center",
            children: /* @__PURE__ */ jsx2(Bug, { size: 22 })
          }
        )
      ]
    }
  );
}

// src/components/CaptureMode.tsx
import { useEffect as useEffect3, useState as useState3, useCallback as useCallback2 } from "react";

// src/components/DrawingCanvas.tsx
import { useRef, useState, useCallback, useEffect } from "react";
import { Stage, Layer, Rect, Arrow, Circle, Text, Group } from "react-konva";
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
var pinCounter = 1;
function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function getStagePos(e) {
  const pos = e.target.getStage()?.getPointerPosition();
  return pos ?? { x: 0, y: 0 };
}
function DrawingCanvas({
  width,
  height,
  tool,
  shapes,
  onShapeComplete
}) {
  const isDrawing = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const [draft, setDraft] = useState(null);
  const draftRef = useRef(null);
  const handleMouseDown = useCallback(
    (e) => {
      if (e.evt.button !== 0) return;
      const { x, y } = getStagePos(e);
      isDrawing.current = true;
      origin.current = { x, y };
      if (tool === "pin") {
        onShapeComplete({
          id: uid(),
          type: "pin",
          x,
          y,
          pinNumber: pinCounter++
        });
        isDrawing.current = false;
        return;
      }
      const newDraft = {
        id: uid(),
        type: tool,
        x,
        y,
        ...tool === "rect" ? { width: 0, height: 0 } : { points: [x, y, x, y] }
      };
      draftRef.current = newDraft;
      setDraft(newDraft);
    },
    [tool, onShapeComplete]
  );
  const handleMouseMove = useCallback(
    (e) => {
      if (!isDrawing.current || !draftRef.current) return;
      const { x, y } = getStagePos(e);
      let updated = null;
      if (tool === "rect") {
        updated = {
          ...draftRef.current,
          width: x - origin.current.x,
          height: y - origin.current.y
        };
      } else if (tool === "arrow") {
        updated = {
          ...draftRef.current,
          points: [
            origin.current.x,
            origin.current.y,
            x,
            y
          ]
        };
      }
      if (updated) {
        draftRef.current = updated;
        setDraft(updated);
      }
    },
    [tool]
    // draftRef and origin are refs — not needed in deps
  );
  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current || !draftRef.current) return;
    isDrawing.current = false;
    const current = draftRef.current;
    draftRef.current = null;
    const tooSmall = current.type === "rect" && Math.abs(current.width ?? 0) < 8 && Math.abs(current.height ?? 0) < 8 || current.type === "arrow" && current.points !== void 0 && Math.hypot(
      current.points[2] - current.points[0],
      current.points[3] - current.points[1]
    ) < 8;
    if (!tooSmall) onShapeComplete(current);
    setDraft(null);
  }, [onShapeComplete]);
  const handleMouseLeave = useCallback(() => {
    if (!isDrawing.current || !draftRef.current) return;
    isDrawing.current = false;
    const current = draftRef.current;
    draftRef.current = null;
    const tooSmall = current.type === "rect" && Math.abs(current.width ?? 0) < 8 && Math.abs(current.height ?? 0) < 8 || current.type === "arrow" && current.points !== void 0 && Math.hypot(
      current.points[2] - current.points[0],
      current.points[3] - current.points[1]
    ) < 8;
    if (!tooSmall) onShapeComplete(current);
    setDraft(null);
  }, [onShapeComplete]);
  useEffect(() => {
    const onWindowMouseUp = () => {
      if (isDrawing.current && draftRef.current) {
        isDrawing.current = false;
        const current = draftRef.current;
        draftRef.current = null;
        const tooSmall = current.type === "rect" && Math.abs(current.width ?? 0) < 8 && Math.abs(current.height ?? 0) < 8 || current.type === "arrow" && current.points !== void 0 && Math.hypot(
          current.points[2] - current.points[0],
          current.points[3] - current.points[1]
        ) < 8;
        if (!tooSmall) onShapeComplete(current);
        setDraft(null);
      }
    };
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => window.removeEventListener("mouseup", onWindowMouseUp);
  }, [onShapeComplete]);
  return /* @__PURE__ */ jsx3(
    Stage,
    {
      width,
      height,
      style: { position: "absolute", top: 0, left: 0, cursor: "crosshair" },
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      children: /* @__PURE__ */ jsxs2(Layer, { children: [
        shapes.map(renderShape),
        draft && renderShape(draft)
      ] })
    }
  );
}
function renderShape(s) {
  if (s.type === "rect") {
    return /* @__PURE__ */ jsx3(
      Rect,
      {
        x: s.x,
        y: s.y,
        width: s.width ?? 0,
        height: s.height ?? 0,
        stroke: "#ef4444",
        strokeWidth: 2,
        fill: "rgba(239,68,68,0.08)",
        dash: [6, 3],
        listening: false
      },
      s.id
    );
  }
  if (s.type === "arrow") {
    return /* @__PURE__ */ jsx3(
      Arrow,
      {
        points: s.points ? [...s.points] : [],
        stroke: "#ef4444",
        strokeWidth: 2.5,
        fill: "#ef4444",
        pointerLength: 10,
        pointerWidth: 8,
        listening: false
      },
      s.id
    );
  }
  if (s.type === "pin") {
    return /* @__PURE__ */ jsxs2(Group, { x: s.x, y: s.y, listening: false, children: [
      /* @__PURE__ */ jsx3(Circle, { radius: 14, fill: "#ef4444" }),
      /* @__PURE__ */ jsx3(
        Text,
        {
          text: String(s.pinNumber ?? "?"),
          fontSize: 12,
          fontStyle: "bold",
          fill: "white",
          align: "center",
          verticalAlign: "middle",
          x: -14,
          y: -8,
          width: 28,
          height: 16
        }
      )
    ] }, s.id);
  }
  return null;
}

// src/components/DrawingToolbar.tsx
import { Square, ArrowRight, MapPin } from "lucide-react";
import { jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
var TOOLS = [
  { tool: "rect", label: "\u0412\u0438\u0434\u0456\u043B\u0438\u0442\u0438 \u0437\u043E\u043D\u0443", Icon: Square },
  { tool: "arrow", label: "\u041D\u0430\u043C\u0430\u043B\u044E\u0432\u0430\u0442\u0438 \u0441\u0442\u0440\u0456\u043B\u043A\u0443", Icon: ArrowRight },
  { tool: "pin", label: "\u041F\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u0438 \u043F\u0456\u043D", Icon: MapPin }
];
function DrawingToolbar({
  activeTool,
  onToolChange,
  onSave,
  onCancel
}) {
  return /* @__PURE__ */ jsxs3(
    "div",
    {
      "data-buggy-bag": "true",
      className: "fixed top-4 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-2 bg-white rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.2)] px-3 py-2",
      children: [
        TOOLS.map(({ tool, label, Icon }) => /* @__PURE__ */ jsxs3(
          "button",
          {
            type: "button",
            onClick: () => onToolChange(tool),
            title: label,
            "aria-pressed": activeTool === tool,
            className: `flex items-center gap-[6px] h-[36px] px-[14px] rounded-[10px] text-[13px] font-bold transition-colors ${activeTool === tool ? "bg-[#1f1f1f] text-white" : "bg-transparent text-[#9a9a9a] hover:bg-[#f0f0f0] hover:text-[#1f1f1f]"}`,
            children: [
              /* @__PURE__ */ jsx4(Icon, { size: 14 }),
              label
            ]
          },
          tool
        )),
        /* @__PURE__ */ jsx4("div", { className: "w-px h-6 bg-[#e9e9e9] mx-1", "aria-hidden": "true" }),
        /* @__PURE__ */ jsx4(
          "button",
          {
            type: "button",
            onClick: onSave,
            className: "h-[36px] px-[18px] rounded-[10px] text-[13px] font-bold bg-[#1f1f1f] text-white hover:bg-[#303030] transition-colors",
            children: "\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0431\u0430\u0433"
          }
        ),
        /* @__PURE__ */ jsx4(
          "button",
          {
            type: "button",
            onClick: onCancel,
            className: "h-[36px] px-[18px] rounded-[10px] text-[13px] font-bold bg-[#f5f5f5] text-[#1f1f1f] hover:bg-[#ebebeb] transition-colors",
            children: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438"
          }
        )
      ]
    }
  );
}

// src/components/ShapeAnnotation.tsx
import { useState as useState2, useRef as useRef2, useEffect as useEffect2 } from "react";
import { Mic, MicOff, Check } from "lucide-react";
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
var POPUP_W = 288;
var POPUP_H = 160;
function calcPosition(shape, cw, ch) {
  let cx;
  let cy;
  if (shape.type === "rect") {
    const left = shape.width !== void 0 && shape.width < 0 ? shape.x + shape.width : shape.x;
    const top = shape.height !== void 0 && shape.height < 0 ? shape.y + shape.height : shape.y;
    const w = Math.abs(shape.width ?? 0);
    const h = Math.abs(shape.height ?? 0);
    cx = left + w / 2;
    cy = top + h + 12;
  } else if (shape.type === "arrow" && shape.points) {
    cx = shape.points[2];
    cy = shape.points[3] + 12;
  } else {
    cx = shape.x;
    cy = shape.y + 26;
  }
  const x = Math.max(8, Math.min(cx - POPUP_W / 2, cw - POPUP_W - 8));
  let y = cy;
  if (y + POPUP_H > ch - 8) {
    if (shape.type === "rect") {
      const top = shape.height !== void 0 && shape.height < 0 ? shape.y + shape.height : shape.y;
      y = top - POPUP_H - 8;
    } else if (shape.type === "arrow" && shape.points) {
      y = Math.min(shape.points[1], shape.points[3]) - POPUP_H - 8;
    } else {
      y = shape.y - POPUP_H - 30;
    }
  }
  y = Math.max(8, y);
  return { x, y };
}
function ShapeAnnotation({
  shape,
  containerWidth,
  containerHeight,
  onConfirm,
  onDismiss
}) {
  const [text, setText] = useState2("");
  const [listening, setListening] = useState2(false);
  const recRef = useRef2(null);
  const { x, y } = calcPosition(shape, containerWidth, containerHeight);
  const toggleVoice = () => {
    const SpeechRec = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechRec) return;
    if (recRef.current) {
      recRef.current.stop();
      recRef.current = null;
      setListening(false);
      return;
    }
    const rec = new SpeechRec();
    rec.lang = "uk-UA";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setText((prev) => (prev ? prev + " " + transcript : transcript).trim());
    };
    rec.onerror = () => {
      recRef.current = null;
      setListening(false);
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  };
  useEffect2(() => {
    return () => {
      if (recRef.current) {
        recRef.current.stop();
        recRef.current = null;
      }
    };
  }, []);
  const handleConfirm = () => {
    recRef.current?.stop();
    onConfirm(shape.id, text.trim());
  };
  const handleDismiss = () => {
    recRef.current?.stop();
    onDismiss();
  };
  const stopProp = (e) => e.stopPropagation();
  return /* @__PURE__ */ jsxs4(
    "div",
    {
      "data-buggy-bag": "true",
      className: "absolute z-[10002] w-[288px] bg-white rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.22)] p-3",
      style: { left: x, top: y },
      onClick: stopProp,
      onMouseDown: stopProp,
      children: [
        /* @__PURE__ */ jsx5(
          "label",
          {
            htmlFor: "buggy-annotation-text",
            className: "block text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-2 cursor-default",
            children: "\u0412\u043A\u0430\u0436\u0456\u0442\u044C \u043F\u0440\u0438\u0447\u0438\u043D\u0443..."
          }
        ),
        /* @__PURE__ */ jsx5(
          "textarea",
          {
            id: "buggy-annotation-text",
            value: text,
            onChange: (e) => setText(e.target.value),
            placeholder: "\u041E\u043F\u0438\u0448\u0456\u0442\u044C \u043F\u0440\u043E\u0431\u043B\u0435\u043C\u0443...",
            rows: 3,
            autoFocus: true,
            style: { userSelect: "text" },
            className: "w-full bg-[#f4f4f5] rounded-[10px] text-[13px] text-[#1f1f1f] placeholder:text-[#a3a3a3] resize-none outline-none border border-transparent focus:border-[#1f1f1f] p-[10px] transition-colors leading-relaxed",
            onKeyDown: (e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleConfirm();
              if (e.key === "Escape") handleDismiss();
            }
          }
        ),
        /* @__PURE__ */ jsxs4("div", { className: "flex gap-2 mt-2", children: [
          /* @__PURE__ */ jsx5(
            "button",
            {
              type: "button",
              onClick: toggleVoice,
              title: listening ? "\u0417\u0443\u043F\u0438\u043D\u0438\u0442\u0438 \u0437\u0430\u043F\u0438\u0441" : "\u0414\u0438\u043A\u0442\u0443\u0432\u0430\u0442\u0438 \u0433\u043E\u043B\u043E\u0441\u043E\u043C",
              "aria-label": listening ? "Stop voice recording" : "Start voice recording",
              "aria-pressed": listening,
              className: `w-[36px] h-[36px] rounded-[10px] flex items-center justify-center transition-colors shrink-0 ${listening ? "bg-[#ef4444] text-white animate-pulse" : "bg-[#f4f4f5] text-[#9a9a9a] hover:bg-[#e9e9e9] hover:text-[#1f1f1f]"}`,
              children: listening ? /* @__PURE__ */ jsx5(MicOff, { size: 14 }) : /* @__PURE__ */ jsx5(Mic, { size: 14 })
            }
          ),
          /* @__PURE__ */ jsx5(
            "button",
            {
              type: "button",
              onClick: handleDismiss,
              className: "flex-1 h-[36px] rounded-[10px] text-[13px] font-bold bg-[#f5f5f5] text-[#1f1f1f] hover:bg-[#ebebeb] transition-colors",
              children: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438"
            }
          ),
          /* @__PURE__ */ jsxs4(
            "button",
            {
              type: "button",
              onClick: handleConfirm,
              className: "flex-1 h-[36px] rounded-[10px] text-[13px] font-bold bg-[#1f1f1f] text-white hover:bg-[#303030] transition-colors flex items-center justify-center gap-[6px]",
              children: [
                /* @__PURE__ */ jsx5(Check, { size: 14 }),
                "OK"
              ]
            }
          )
        ] })
      ]
    }
  );
}

// src/components/CaptureMode.tsx
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
function CaptureMode({ onSave, onCancel }) {
  const [screenshotUrl, setScreenshotUrl] = useState3(null);
  const [tool, setTool] = useState3("rect");
  const [shapes, setShapes] = useState3([]);
  const [annotations, setAnnotations] = useState3({});
  const [pendingShape, setPendingShape] = useState3(null);
  const w = typeof window !== "undefined" ? window.innerWidth : 1280;
  const h = typeof window !== "undefined" ? window.innerHeight : 800;
  useEffect3(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const { default: html2canvas } = await import("html2canvas");
        const canvas = await html2canvas(document.body, {
          useCORS: true,
          allowTaint: true,
          logging: false,
          ignoreElements: (el) => el.getAttribute("data-buggy-bag") === "true"
        });
        if (!cancelled) {
          setScreenshotUrl(canvas.toDataURL("image/png"));
        }
      } catch {
        if (!cancelled) {
          onCancel();
        }
      }
    }, 80);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [onCancel]);
  const handleShapeComplete = useCallback2((shape) => {
    setShapes((prev) => [...prev, shape]);
    setPendingShape(shape);
  }, []);
  const handleAnnotationConfirm = useCallback2(
    (shapeId, text) => {
      setAnnotations((prev) => ({ ...prev, [shapeId]: text }));
      setPendingShape(null);
    },
    []
  );
  const handleAnnotationDismiss = useCallback2(() => {
    setPendingShape((pending) => {
      if (pending) {
        setShapes((prev) => prev.filter((s) => s.id !== pending.id));
      }
      return null;
    });
  }, []);
  const handleSave = useCallback2(() => {
    if (!screenshotUrl) return;
    onSave({ screenshotDataUrl: screenshotUrl, shapes, annotations });
  }, [screenshotUrl, shapes, annotations, onSave]);
  return /* @__PURE__ */ jsxs5(
    "div",
    {
      "data-buggy-bag": "true",
      className: "fixed inset-0 z-[10000]",
      style: { userSelect: "none" },
      children: [
        screenshotUrl ? /* @__PURE__ */ jsx6(
          "img",
          {
            src: screenshotUrl,
            alt: "Page screenshot",
            className: "absolute inset-0 w-full h-full object-cover pointer-events-none",
            draggable: false
          }
        ) : /* @__PURE__ */ jsx6("div", { className: "absolute inset-0 bg-black/50 flex items-center justify-center", children: /* @__PURE__ */ jsx6(
          "span",
          {
            role: "status",
            "aria-live": "polite",
            className: "text-white text-[16px] font-bold animate-pulse",
            children: "\u0417\u043D\u0456\u043C\u043E\u043A \u0435\u043A\u0440\u0430\u043D\u0443..."
          }
        ) }),
        screenshotUrl && !pendingShape && /* @__PURE__ */ jsx6(
          DrawingCanvas,
          {
            width: w,
            height: h,
            tool,
            shapes,
            onShapeComplete: handleShapeComplete
          }
        ),
        pendingShape && /* @__PURE__ */ jsx6(
          ShapeAnnotation,
          {
            shape: pendingShape,
            containerWidth: w,
            containerHeight: h,
            onConfirm: handleAnnotationConfirm,
            onDismiss: handleAnnotationDismiss
          }
        ),
        screenshotUrl && /* @__PURE__ */ jsx6(
          DrawingToolbar,
          {
            activeTool: tool,
            onToolChange: setTool,
            onSave: handleSave,
            onCancel
          }
        )
      ]
    }
  );
}

// src/components/Dashboard.tsx
import { useState as useState6 } from "react";

// src/components/ui/Dialog.tsx
import { useEffect as useEffect4 } from "react";
import { X } from "lucide-react";
import { jsx as jsx7, jsxs as jsxs6 } from "react/jsx-runtime";
var SIZE_MAP = {
  sm: "max-w-[480px]",
  md: "max-w-[640px]",
  lg: "max-w-[900px]",
  xl: "max-w-[1200px]"
};
function Dialog({ isOpen, onClose, title, children, size = "md" }) {
  useEffect4(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);
  if (!isOpen) return null;
  return /* @__PURE__ */ jsx7(
    "div",
    {
      className: "fixed inset-0 z-[9998] flex items-start justify-center bg-black/40 backdrop-blur-sm pt-12 overflow-y-auto",
      onClick: onClose,
      children: /* @__PURE__ */ jsxs6(
        "div",
        {
          className: `bg-white rounded-[24px] shadow-[0_25px_50px_rgba(0,0,0,0.15)] w-full mx-4 ${SIZE_MAP[size]}`,
          onClick: (e) => e.stopPropagation(),
          children: [
            title && /* @__PURE__ */ jsxs6("div", { className: "flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f0f0f0]", children: [
              /* @__PURE__ */ jsx7("h2", { className: "text-[18px] font-bold text-[#1f1f1f]", children: title }),
              /* @__PURE__ */ jsx7(
                "button",
                {
                  onClick: onClose,
                  "aria-label": "Close",
                  className: "p-1 text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#f4f4f5] rounded-[8px] transition-colors",
                  children: /* @__PURE__ */ jsx7(X, { size: 20 })
                }
              )
            ] }),
            /* @__PURE__ */ jsx7("div", { className: "px-6 py-5 overflow-y-auto max-h-[calc(100vh-200px)]", children })
          ]
        }
      )
    }
  );
}

// src/components/BugCard.tsx
import { useState as useState4 } from "react";
import { CheckCircle, RotateCcw, Archive, ChevronDown, ChevronUp } from "lucide-react";

// src/components/ui/Surface.tsx
import { jsx as jsx8 } from "react/jsx-runtime";
var VARIANTS = {
  panel: "bg-[#f4f4f5] rounded-[16px]",
  card: "bg-white rounded-[16px]",
  inset: "bg-[#f0f0f0] rounded-[16px]"
};
var PADDING = {
  none: "",
  sm: "p-[12px]",
  md: "p-[16px]",
  lg: "p-[20px]",
  xl: "p-[24px]"
};
function Surface({
  variant = "panel",
  padding = "md",
  className = "",
  children
}) {
  return /* @__PURE__ */ jsx8("div", { className: `${VARIANTS[variant]} ${PADDING[padding]} ${className}`, children });
}

// src/components/ui/Button.tsx
import { jsx as jsx9, jsxs as jsxs7 } from "react/jsx-runtime";
var SIZES = {
  sm: "h-[28px] px-[12px] text-[12px] rounded-[10px]",
  md: "h-[32px] px-[16px] text-[13px] rounded-[10px]",
  lg: "h-[36px] px-[18px] text-[13px] rounded-[10px]",
  icon: "w-[32px] h-[32px] rounded-[10px] p-0"
};
var VARIANTS2 = {
  primary: "bg-[#1f1f1f] text-white hover:bg-[#303030]",
  secondary: "bg-[#f5f5f5] text-[#1f1f1f] hover:bg-[#ebebeb]",
  ghost: "bg-transparent text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#f0f0f0]",
  danger: "bg-[#ef4444] text-white hover:bg-[#dc2626]"
};
function Button({
  children,
  variant = "primary",
  size = "lg",
  icon: Icon,
  className = "",
  ...props
}) {
  const iconSize = size === "lg" ? 16 : size === "sm" ? 12 : 14;
  return /* @__PURE__ */ jsxs7(
    "button",
    {
      type: "button",
      className: `inline-flex items-center justify-center gap-[6px] font-bold leading-none transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${SIZES[size]} ${VARIANTS2[variant]} ${className}`,
      ...props,
      children: [
        Icon && /* @__PURE__ */ jsx9(Icon, { size: iconSize }),
        children && /* @__PURE__ */ jsx9("span", { className: size === "icon" ? "sr-only" : "", children })
      ]
    }
  );
}

// src/components/BugCard.tsx
import { Fragment as Fragment2, jsx as jsx10, jsxs as jsxs8 } from "react/jsx-runtime";
function pluralizeShapes(n) {
  const abs = Math.abs(n);
  if (abs % 100 >= 11 && abs % 100 <= 14) return "\u0444\u0456\u0433\u0443\u0440";
  switch (abs % 10) {
    case 1:
      return "\u0444\u0456\u0433\u0443\u0440\u0430";
    case 2:
    case 3:
    case 4:
      return "\u0444\u0456\u0433\u0443\u0440\u0438";
    default:
      return "\u0444\u0456\u0433\u0443\u0440";
  }
}
var STATUS_LABEL = {
  active: "\u0410\u043A\u0442\u0438\u0432\u043D\u0438\u0439",
  fixed: "\u0412\u0438\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0439",
  archived: "\u0410\u0440\u0445\u0456\u0432"
};
var STATUS_COLOR = {
  active: "bg-[#fef3c7] text-[#92400e]",
  fixed: "bg-[#dcfce7] text-[#166534]",
  archived: "bg-[#f4f4f5] text-[#9a9a9a]"
};
function BugCard({ bug, onStatusChange }) {
  const [expanded, setExpanded] = useState4(false);
  const notes = Object.entries(bug.annotations).filter(([, v]) => v.trim());
  return /* @__PURE__ */ jsxs8(Surface, { variant: "panel", padding: "md", className: "flex flex-col gap-3", children: [
    /* @__PURE__ */ jsxs8("div", { className: "flex items-start gap-3", children: [
      /* @__PURE__ */ jsx10(
        "img",
        {
          src: bug.screenshotDataUrl,
          alt: "Bug screenshot thumbnail",
          className: "w-[80px] h-[52px] rounded-[10px] object-cover shrink-0 border border-[#e9e9e9]"
        }
      ),
      /* @__PURE__ */ jsxs8("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxs8("div", { className: "flex items-center gap-2 mb-1 flex-wrap", children: [
          /* @__PURE__ */ jsx10(
            "span",
            {
              className: `inline-flex items-center h-[22px] px-[10px] rounded-full text-[11px] font-bold ${STATUS_COLOR[bug.status]}`,
              children: STATUS_LABEL[bug.status]
            }
          ),
          /* @__PURE__ */ jsx10("span", { className: "text-[11px] text-[#9a9a9a]", children: new Date(bug.createdAt).toLocaleDateString("uk-UA", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          }) })
        ] }),
        notes[0] && /* @__PURE__ */ jsx10("p", { className: "text-[13px] text-[#1f1f1f] line-clamp-2 leading-snug", children: notes[0][1] }),
        notes.length === 0 && /* @__PURE__ */ jsx10("p", { className: "text-[13px] text-[#9a9a9a] italic", children: "\u0411\u0435\u0437 \u043E\u043F\u0438\u0441\u0443" })
      ] }),
      /* @__PURE__ */ jsx10(
        "button",
        {
          type: "button",
          onClick: () => setExpanded((v) => !v),
          "aria-label": expanded ? "Collapse bug details" : "Expand bug details",
          "aria-expanded": expanded,
          className: "p-1 text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#f0f0f0] rounded-[8px] transition-colors shrink-0",
          children: expanded ? /* @__PURE__ */ jsx10(ChevronUp, { size: 16 }) : /* @__PURE__ */ jsx10(ChevronDown, { size: 16 })
        }
      )
    ] }),
    expanded && /* @__PURE__ */ jsxs8("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsx10(
        "img",
        {
          src: bug.screenshotDataUrl,
          alt: "Full bug screenshot",
          className: "w-full rounded-[10px] border border-[#e9e9e9] max-h-[300px] object-contain bg-[#f4f4f5]"
        }
      ),
      notes.length > 0 && /* @__PURE__ */ jsx10("div", { className: "flex flex-col gap-1", children: notes.map(([id, text]) => /* @__PURE__ */ jsx10(Surface, { variant: "inset", padding: "sm", children: /* @__PURE__ */ jsx10("p", { className: "text-[12px] text-[#1f1f1f] leading-relaxed", children: text }) }, id)) }),
      /* @__PURE__ */ jsxs8("p", { className: "text-[11px] text-[#9a9a9a]", children: [
        bug.shapes.length,
        " ",
        pluralizeShapes(bug.shapes.length),
        " \u043D\u0430\u043C\u0430\u043B\u044C\u043E\u0432\u0430\u043D\u043E"
      ] })
    ] }),
    /* @__PURE__ */ jsxs8("div", { className: "flex gap-2 flex-wrap", children: [
      bug.status === "active" && /* @__PURE__ */ jsxs8(Fragment2, { children: [
        /* @__PURE__ */ jsx10(
          Button,
          {
            variant: "secondary",
            size: "sm",
            icon: CheckCircle,
            onClick: () => onStatusChange(bug.id, "fixed"),
            children: "\u0412\u0438\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0439"
          }
        ),
        /* @__PURE__ */ jsx10(
          Button,
          {
            variant: "ghost",
            size: "sm",
            icon: Archive,
            onClick: () => onStatusChange(bug.id, "archived"),
            children: "\u0410\u0440\u0445\u0456\u0432"
          }
        )
      ] }),
      (bug.status === "fixed" || bug.status === "archived") && /* @__PURE__ */ jsx10(
        Button,
        {
          variant: "ghost",
          size: "sm",
          icon: RotateCcw,
          onClick: () => onStatusChange(bug.id, "active"),
          children: "\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438 \u0432 Active"
        }
      )
    ] })
  ] });
}

// src/components/AIReport.tsx
import { useState as useState5, useEffect as useEffect5, useRef as useRef3 } from "react";
import { Copy, Check as Check2, Loader } from "lucide-react";
import { Fragment as Fragment3, jsx as jsx11, jsxs as jsxs9 } from "react/jsx-runtime";
function AIReport({ isOpen, onClose, activeBugs }) {
  const [prompt, setPrompt] = useState5("");
  const [loading, setLoading] = useState5(false);
  const [copied, setCopied] = useState5(false);
  const [error, setError] = useState5(null);
  const copyTimeoutRef = useRef3(null);
  const handleClose = () => {
    setPrompt("");
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
      const res = await fetch("/api/generate-ai-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bugs: activeBugs.map((b) => ({
            id: b.id,
            screenshotDataUrl: b.screenshotDataUrl,
            annotations: b.annotations,
            shapes: b.shapes,
            createdAt: b.createdAt
          }))
        })
      });
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      const data = await res.json();
      const promptText = data !== null && typeof data === "object" && "prompt" in data && typeof data.prompt === "string" ? data.prompt : JSON.stringify(data, null, 2);
      setPrompt(promptText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "\u041D\u0435\u0432\u0456\u0434\u043E\u043C\u0430 \u043F\u043E\u043C\u0438\u043B\u043A\u0430");
    } finally {
      setLoading(false);
    }
  };
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2e3);
    } catch {
      setError("\u041D\u0435 \u0432\u0434\u0430\u043B\u043E\u0441\u044F \u0441\u043A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438 \u0432 \u0431\u0443\u0444\u0435\u0440 \u043E\u0431\u043C\u0456\u043D\u0443");
    }
  };
  useEffect5(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);
  return /* @__PURE__ */ jsxs9(Dialog, { isOpen, onClose: handleClose, title: "AI \u0411\u0430\u0433-\u0440\u0435\u043F\u043E\u0440\u0442", size: "lg", children: [
    !prompt && !loading && !error && /* @__PURE__ */ jsxs9("div", { className: "py-8 text-center", children: [
      /* @__PURE__ */ jsx11("p", { className: "text-[14px] text-[#9a9a9a] mb-1", children: "\u0410\u043A\u0442\u0438\u0432\u043D\u0438\u0445 \u0431\u0430\u0433\u0456\u0432 \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0456\u0437\u0443:" }),
      /* @__PURE__ */ jsx11("p", { className: "text-[32px] font-bold text-[#1f1f1f] mb-6 leading-none", children: activeBugs.length }),
      /* @__PURE__ */ jsx11("p", { className: "text-[13px] text-[#9a9a9a] mb-6 max-w-[340px] mx-auto", children: "\u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \xAB\u0413\u0435\u043D\u0435\u0440\u0443\u0432\u0430\u0442\u0438\xBB, \u0449\u043E\u0431 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438 \u0441\u043A\u0440\u0456\u043D\u0448\u043E\u0442\u0438 \u0442\u0430 \u043E\u043F\u0438\u0441 \u0431\u0430\u0433\u0456\u0432 \u0430\u0433\u0435\u043D\u0442\u0443 Antigravity \u0456 \u043E\u0442\u0440\u0438\u043C\u0430\u0442\u0438 \u0433\u043E\u0442\u043E\u0432\u0438\u0439 \u043F\u0440\u043E\u043C\u043F\u0442." }),
      /* @__PURE__ */ jsx11(
        "button",
        {
          type: "button",
          onClick: generate,
          className: "h-[44px] px-[28px] rounded-[12px] text-[14px] font-bold bg-[#1f1f1f] text-white hover:bg-[#303030] transition-colors",
          children: "\u0413\u0435\u043D\u0435\u0440\u0443\u0432\u0430\u0442\u0438"
        }
      )
    ] }),
    loading && /* @__PURE__ */ jsxs9(
      "div",
      {
        role: "status",
        "aria-live": "polite",
        className: "flex items-center justify-center gap-3 py-12 text-[#9a9a9a]",
        children: [
          /* @__PURE__ */ jsx11(Loader, { size: 20, className: "animate-spin", "aria-hidden": "true" }),
          /* @__PURE__ */ jsx11("span", { className: "text-[14px]", children: "\u0413\u0435\u043D\u0435\u0440\u0443\u0454\u0442\u044C\u0441\u044F \u043F\u0440\u043E\u043C\u043F\u0442..." })
        ]
      }
    ),
    error && !loading && /* @__PURE__ */ jsxs9("div", { className: "flex flex-col gap-4", children: [
      /* @__PURE__ */ jsx11("div", { className: "rounded-[12px] bg-[#fee2e2] p-4 text-[13px] text-[#991b1b]", children: error }),
      /* @__PURE__ */ jsx11(
        "button",
        {
          type: "button",
          onClick: generate,
          className: "h-[40px] px-[20px] rounded-[10px] text-[13px] font-bold bg-[#f5f5f5] text-[#1f1f1f] hover:bg-[#ebebeb] transition-colors self-start",
          children: "\u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438 \u0449\u0435 \u0440\u0430\u0437"
        }
      )
    ] }),
    prompt && !loading && /* @__PURE__ */ jsxs9("div", { className: "flex flex-col gap-4", children: [
      /* @__PURE__ */ jsx11("div", { className: "relative", children: /* @__PURE__ */ jsx11(
        "textarea",
        {
          readOnly: true,
          value: prompt,
          rows: 16,
          "aria-label": "Generated AI prompt",
          className: "w-full resize-none rounded-[12px] bg-[#f4f4f5] p-4 font-mono text-[12px] text-[#1f1f1f] outline-none leading-relaxed"
        }
      ) }),
      /* @__PURE__ */ jsxs9("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsx11(
          "button",
          {
            type: "button",
            onClick: copyToClipboard,
            className: "flex flex-1 h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[#1f1f1f] text-[14px] font-bold text-white transition-colors hover:bg-[#303030]",
            children: copied ? /* @__PURE__ */ jsxs9(Fragment3, { children: [
              /* @__PURE__ */ jsx11(Check2, { size: 16, "aria-hidden": "true" }),
              "\u0421\u043A\u043E\u043F\u0456\u0439\u043E\u0432\u0430\u043D\u043E!"
            ] }) : /* @__PURE__ */ jsxs9(Fragment3, { children: [
              /* @__PURE__ */ jsx11(Copy, { size: 16, "aria-hidden": "true" }),
              "\u0421\u043A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438 \u0434\u043B\u044F Antigravity"
            ] })
          }
        ),
        /* @__PURE__ */ jsx11(
          "button",
          {
            type: "button",
            onClick: generate,
            className: "h-[44px] px-[20px] rounded-[12px] text-[13px] font-bold bg-[#f5f5f5] text-[#1f1f1f] hover:bg-[#ebebeb] transition-colors",
            children: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0438"
          }
        )
      ] })
    ] })
  ] });
}

// src/components/Dashboard.tsx
import { Fragment as Fragment4, jsx as jsx12, jsxs as jsxs10 } from "react/jsx-runtime";
var FILTERS = [
  { value: "all", label: "\u0423\u0441\u0456" },
  { value: "active", label: "Active" },
  { value: "fixed", label: "Fixed" },
  { value: "archived", label: "Archived" }
];
function Dashboard({ isOpen, onClose, bugs, onStatusChange }) {
  const [filter, setFilter] = useState6("all");
  const [showAIReport, setShowAIReport] = useState6(false);
  const filtered = filter === "all" ? bugs : bugs.filter((b) => b.status === filter);
  const activeBugs = bugs.filter((b) => b.status === "active");
  const countFor = (status) => bugs.filter((b) => b.status === status).length;
  const handleClose = () => {
    setFilter("all");
    setShowAIReport(false);
    onClose();
  };
  return /* @__PURE__ */ jsxs10(Fragment4, { children: [
    /* @__PURE__ */ jsxs10(Dialog, { isOpen, onClose: handleClose, title: "Bug Inbox", size: "lg", children: [
      /* @__PURE__ */ jsx12("div", { className: "flex gap-1 mb-4 bg-[#f4f4f5] rounded-[12px] p-1", children: FILTERS.map(({ value, label }) => /* @__PURE__ */ jsxs10(
        "button",
        {
          type: "button",
          onClick: () => setFilter(value),
          "aria-pressed": filter === value,
          className: `flex-1 h-[32px] rounded-[10px] text-[13px] font-bold transition-colors ${filter === value ? "bg-white text-[#1f1f1f] shadow-sm" : "text-[#9a9a9a] hover:text-[#1f1f1f]"}`,
          children: [
            label,
            value !== "all" && /* @__PURE__ */ jsxs10("span", { className: "ml-1 text-[11px] opacity-60", children: [
              "(",
              countFor(value),
              ")"
            ] })
          ]
        },
        value
      )) }),
      /* @__PURE__ */ jsx12("div", { className: "flex flex-col gap-3", children: filtered.length === 0 ? /* @__PURE__ */ jsx12("div", { className: "py-12 text-center text-[14px] text-[#9a9a9a]", children: "\u041D\u0435\u043C\u0430\u0454 \u0431\u0430\u0433\u0456\u0432 \u0443 \u0446\u044C\u043E\u043C\u0443 \u0444\u0456\u043B\u044C\u0442\u0440\u0456" }) : filtered.map((bug) => /* @__PURE__ */ jsx12(BugCard, { bug, onStatusChange }, bug.id)) }),
      activeBugs.length > 0 && /* @__PURE__ */ jsx12("div", { className: "mt-6 pt-4 border-t border-[#f0f0f0]", children: /* @__PURE__ */ jsxs10(
        "button",
        {
          type: "button",
          onClick: () => setShowAIReport(true),
          className: "w-full h-[44px] rounded-[12px] text-[14px] font-bold bg-[#1f1f1f] text-white hover:bg-[#303030] transition-colors",
          children: [
            "\u041E\u0442\u0440\u0438\u043C\u0430\u0442\u0438 \u0431\u0430\u0433-\u0440\u0435\u043F\u043E\u0440\u0442 (",
            activeBugs.length,
            " active)"
          ]
        }
      ) })
    ] }),
    /* @__PURE__ */ jsx12(
      AIReport,
      {
        isOpen: showAIReport,
        onClose: () => setShowAIReport(false),
        activeBugs
      }
    )
  ] });
}

// #style-inject:#style-inject
function styleInject(css, { insertAt } = {}) {
  if (!css || typeof document === "undefined") return;
  const head = document.head || document.getElementsByTagName("head")[0];
  const style = document.createElement("style");
  style.type = "text/css";
  if (insertAt === "top") {
    if (head.firstChild) {
      head.insertBefore(style, head.firstChild);
    } else {
      head.appendChild(style);
    }
  } else {
    head.appendChild(style);
  }
  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    style.appendChild(document.createTextNode(css));
  }
}

// src/styles.css
styleInject('*,\n::before,\n::after {\n  --tw-border-spacing-x: 0;\n  --tw-border-spacing-y: 0;\n  --tw-translate-x: 0;\n  --tw-translate-y: 0;\n  --tw-rotate: 0;\n  --tw-skew-x: 0;\n  --tw-skew-y: 0;\n  --tw-scale-x: 1;\n  --tw-scale-y: 1;\n  --tw-pan-x: ;\n  --tw-pan-y: ;\n  --tw-pinch-zoom: ;\n  --tw-scroll-snap-strictness: proximity;\n  --tw-gradient-from-position: ;\n  --tw-gradient-via-position: ;\n  --tw-gradient-to-position: ;\n  --tw-ordinal: ;\n  --tw-slashed-zero: ;\n  --tw-numeric-figure: ;\n  --tw-numeric-spacing: ;\n  --tw-numeric-fraction: ;\n  --tw-ring-inset: ;\n  --tw-ring-offset-width: 0px;\n  --tw-ring-offset-color: #fff;\n  --tw-ring-color: rgb(59 130 246 / 0.5);\n  --tw-ring-offset-shadow: 0 0 #0000;\n  --tw-ring-shadow: 0 0 #0000;\n  --tw-shadow: 0 0 #0000;\n  --tw-shadow-colored: 0 0 #0000;\n  --tw-blur: ;\n  --tw-brightness: ;\n  --tw-contrast: ;\n  --tw-grayscale: ;\n  --tw-hue-rotate: ;\n  --tw-invert: ;\n  --tw-saturate: ;\n  --tw-sepia: ;\n  --tw-drop-shadow: ;\n  --tw-backdrop-blur: ;\n  --tw-backdrop-brightness: ;\n  --tw-backdrop-contrast: ;\n  --tw-backdrop-grayscale: ;\n  --tw-backdrop-hue-rotate: ;\n  --tw-backdrop-invert: ;\n  --tw-backdrop-opacity: ;\n  --tw-backdrop-saturate: ;\n  --tw-backdrop-sepia: ;\n  --tw-contain-size: ;\n  --tw-contain-layout: ;\n  --tw-contain-paint: ;\n  --tw-contain-style: ;\n}\n::backdrop {\n  --tw-border-spacing-x: 0;\n  --tw-border-spacing-y: 0;\n  --tw-translate-x: 0;\n  --tw-translate-y: 0;\n  --tw-rotate: 0;\n  --tw-skew-x: 0;\n  --tw-skew-y: 0;\n  --tw-scale-x: 1;\n  --tw-scale-y: 1;\n  --tw-pan-x: ;\n  --tw-pan-y: ;\n  --tw-pinch-zoom: ;\n  --tw-scroll-snap-strictness: proximity;\n  --tw-gradient-from-position: ;\n  --tw-gradient-via-position: ;\n  --tw-gradient-to-position: ;\n  --tw-ordinal: ;\n  --tw-slashed-zero: ;\n  --tw-numeric-figure: ;\n  --tw-numeric-spacing: ;\n  --tw-numeric-fraction: ;\n  --tw-ring-inset: ;\n  --tw-ring-offset-width: 0px;\n  --tw-ring-offset-color: #fff;\n  --tw-ring-color: rgb(59 130 246 / 0.5);\n  --tw-ring-offset-shadow: 0 0 #0000;\n  --tw-ring-shadow: 0 0 #0000;\n  --tw-shadow: 0 0 #0000;\n  --tw-shadow-colored: 0 0 #0000;\n  --tw-blur: ;\n  --tw-brightness: ;\n  --tw-contrast: ;\n  --tw-grayscale: ;\n  --tw-hue-rotate: ;\n  --tw-invert: ;\n  --tw-saturate: ;\n  --tw-sepia: ;\n  --tw-drop-shadow: ;\n  --tw-backdrop-blur: ;\n  --tw-backdrop-brightness: ;\n  --tw-backdrop-contrast: ;\n  --tw-backdrop-grayscale: ;\n  --tw-backdrop-hue-rotate: ;\n  --tw-backdrop-invert: ;\n  --tw-backdrop-opacity: ;\n  --tw-backdrop-saturate: ;\n  --tw-backdrop-sepia: ;\n  --tw-contain-size: ;\n  --tw-contain-layout: ;\n  --tw-contain-paint: ;\n  --tw-contain-style: ;\n}\n*,\n::before,\n::after {\n  box-sizing: border-box;\n  border-width: 0;\n  border-style: solid;\n  border-color: #e5e7eb;\n}\n::before,\n::after {\n  --tw-content: "";\n}\nhtml,\n:host {\n  line-height: 1.5;\n  -webkit-text-size-adjust: 100%;\n  -moz-tab-size: 4;\n  -o-tab-size: 4;\n  tab-size: 4;\n  font-family:\n    ui-sans-serif,\n    system-ui,\n    sans-serif,\n    "Apple Color Emoji",\n    "Segoe UI Emoji",\n    "Segoe UI Symbol",\n    "Noto Color Emoji";\n  font-feature-settings: normal;\n  font-variation-settings: normal;\n  -webkit-tap-highlight-color: transparent;\n}\nbody {\n  margin: 0;\n  line-height: inherit;\n}\nhr {\n  height: 0;\n  color: inherit;\n  border-top-width: 1px;\n}\nabbr:where([title]) {\n  -webkit-text-decoration: underline dotted;\n  text-decoration: underline dotted;\n}\nh1,\nh2,\nh3,\nh4,\nh5,\nh6 {\n  font-size: inherit;\n  font-weight: inherit;\n}\na {\n  color: inherit;\n  text-decoration: inherit;\n}\nb,\nstrong {\n  font-weight: bolder;\n}\ncode,\nkbd,\nsamp,\npre {\n  font-family:\n    ui-monospace,\n    SFMono-Regular,\n    Menlo,\n    Monaco,\n    Consolas,\n    "Liberation Mono",\n    "Courier New",\n    monospace;\n  font-feature-settings: normal;\n  font-variation-settings: normal;\n  font-size: 1em;\n}\nsmall {\n  font-size: 80%;\n}\nsub,\nsup {\n  font-size: 75%;\n  line-height: 0;\n  position: relative;\n  vertical-align: baseline;\n}\nsub {\n  bottom: -0.25em;\n}\nsup {\n  top: -0.5em;\n}\ntable {\n  text-indent: 0;\n  border-color: inherit;\n  border-collapse: collapse;\n}\nbutton,\ninput,\noptgroup,\nselect,\ntextarea {\n  font-family: inherit;\n  font-feature-settings: inherit;\n  font-variation-settings: inherit;\n  font-size: 100%;\n  font-weight: inherit;\n  line-height: inherit;\n  letter-spacing: inherit;\n  color: inherit;\n  margin: 0;\n  padding: 0;\n}\nbutton,\nselect {\n  text-transform: none;\n}\nbutton,\ninput:where([type=button]),\ninput:where([type=reset]),\ninput:where([type=submit]) {\n  -webkit-appearance: button;\n  background-color: transparent;\n  background-image: none;\n}\n:-moz-focusring {\n  outline: auto;\n}\n:-moz-ui-invalid {\n  box-shadow: none;\n}\nprogress {\n  vertical-align: baseline;\n}\n::-webkit-inner-spin-button,\n::-webkit-outer-spin-button {\n  height: auto;\n}\n[type=search] {\n  -webkit-appearance: textfield;\n  outline-offset: -2px;\n}\n::-webkit-search-decoration {\n  -webkit-appearance: none;\n}\n::-webkit-file-upload-button {\n  -webkit-appearance: button;\n  font: inherit;\n}\nsummary {\n  display: list-item;\n}\nblockquote,\ndl,\ndd,\nh1,\nh2,\nh3,\nh4,\nh5,\nh6,\nhr,\nfigure,\np,\npre {\n  margin: 0;\n}\nfieldset {\n  margin: 0;\n  padding: 0;\n}\nlegend {\n  padding: 0;\n}\nol,\nul,\nmenu {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\ndialog {\n  padding: 0;\n}\ntextarea {\n  resize: vertical;\n}\ninput::-moz-placeholder,\ntextarea::-moz-placeholder {\n  opacity: 1;\n  color: #9ca3af;\n}\ninput::placeholder,\ntextarea::placeholder {\n  opacity: 1;\n  color: #9ca3af;\n}\nbutton,\n[role=button] {\n  cursor: pointer;\n}\n:disabled {\n  cursor: default;\n}\nimg,\nsvg,\nvideo,\ncanvas,\naudio,\niframe,\nembed,\nobject {\n  display: block;\n  vertical-align: middle;\n}\nimg,\nvideo {\n  max-width: 100%;\n  height: auto;\n}\n[hidden]:where(:not([hidden=until-found])) {\n  display: none;\n}\n.sr-only {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip: rect(0, 0, 0, 0);\n  white-space: nowrap;\n  border-width: 0;\n}\n.pointer-events-none {\n  pointer-events: none;\n}\n.visible {\n  visibility: visible;\n}\n.fixed {\n  position: fixed;\n}\n.absolute {\n  position: absolute;\n}\n.relative {\n  position: relative;\n}\n.inset-0 {\n  inset: 0px;\n}\n.-right-1 {\n  right: -0.25rem;\n}\n.-top-1 {\n  top: -0.25rem;\n}\n.bottom-6 {\n  bottom: 1.5rem;\n}\n.left-1\\/2 {\n  left: 50%;\n}\n.left-\\[12px\\] {\n  left: 12px;\n}\n.right-6 {\n  right: 1.5rem;\n}\n.top-1\\/2 {\n  top: 50%;\n}\n.top-4 {\n  top: 1rem;\n}\n.z-\\[10000\\] {\n  z-index: 10000;\n}\n.z-\\[10001\\] {\n  z-index: 10001;\n}\n.z-\\[10002\\] {\n  z-index: 10002;\n}\n.z-\\[9997\\] {\n  z-index: 9997;\n}\n.z-\\[9998\\] {\n  z-index: 9998;\n}\n.mx-1 {\n  margin-left: 0.25rem;\n  margin-right: 0.25rem;\n}\n.mx-4 {\n  margin-left: 1rem;\n  margin-right: 1rem;\n}\n.mx-auto {\n  margin-left: auto;\n  margin-right: auto;\n}\n.mb-1 {\n  margin-bottom: 0.25rem;\n}\n.mb-2 {\n  margin-bottom: 0.5rem;\n}\n.mb-4 {\n  margin-bottom: 1rem;\n}\n.mb-6 {\n  margin-bottom: 1.5rem;\n}\n.ml-1 {\n  margin-left: 0.25rem;\n}\n.mt-2 {\n  margin-top: 0.5rem;\n}\n.mt-6 {\n  margin-top: 1.5rem;\n}\n.line-clamp-2 {\n  overflow: hidden;\n  display: -webkit-box;\n  -webkit-box-orient: vertical;\n  -webkit-line-clamp: 2;\n}\n.block {\n  display: block;\n}\n.flex {\n  display: flex;\n}\n.inline-flex {\n  display: inline-flex;\n}\n.hidden {\n  display: none;\n}\n.h-6 {\n  height: 1.5rem;\n}\n.h-\\[18px\\] {\n  height: 18px;\n}\n.h-\\[22px\\] {\n  height: 22px;\n}\n.h-\\[28px\\] {\n  height: 28px;\n}\n.h-\\[32px\\] {\n  height: 32px;\n}\n.h-\\[36px\\] {\n  height: 36px;\n}\n.h-\\[40px\\] {\n  height: 40px;\n}\n.h-\\[44px\\] {\n  height: 44px;\n}\n.h-\\[52px\\] {\n  height: 52px;\n}\n.h-full {\n  height: 100%;\n}\n.max-h-\\[300px\\] {\n  max-height: 300px;\n}\n.max-h-\\[calc\\(100vh-200px\\)\\] {\n  max-height: calc(100vh - 200px);\n}\n.w-\\[18px\\] {\n  width: 18px;\n}\n.w-\\[288px\\] {\n  width: 288px;\n}\n.w-\\[32px\\] {\n  width: 32px;\n}\n.w-\\[36px\\] {\n  width: 36px;\n}\n.w-\\[44px\\] {\n  width: 44px;\n}\n.w-\\[52px\\] {\n  width: 52px;\n}\n.w-\\[80px\\] {\n  width: 80px;\n}\n.w-full {\n  width: 100%;\n}\n.w-px {\n  width: 1px;\n}\n.min-w-0 {\n  min-width: 0px;\n}\n.max-w-\\[1200px\\] {\n  max-width: 1200px;\n}\n.max-w-\\[340px\\] {\n  max-width: 340px;\n}\n.max-w-\\[480px\\] {\n  max-width: 480px;\n}\n.max-w-\\[640px\\] {\n  max-width: 640px;\n}\n.max-w-\\[900px\\] {\n  max-width: 900px;\n}\n.flex-1 {\n  flex: 1 1 0%;\n}\n.shrink-0 {\n  flex-shrink: 0;\n}\n.-translate-x-1\\/2 {\n  --tw-translate-x: -50%;\n  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));\n}\n.-translate-y-1\\/2 {\n  --tw-translate-y: -50%;\n  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));\n}\n@keyframes pulse {\n  50% {\n    opacity: .5;\n  }\n}\n.animate-pulse {\n  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.animate-spin {\n  animation: spin 1s linear infinite;\n}\n.cursor-default {\n  cursor: default;\n}\n.resize-none {\n  resize: none;\n}\n.flex-col {\n  flex-direction: column;\n}\n.flex-wrap {\n  flex-wrap: wrap;\n}\n.items-start {\n  align-items: flex-start;\n}\n.items-center {\n  align-items: center;\n}\n.justify-center {\n  justify-content: center;\n}\n.justify-between {\n  justify-content: space-between;\n}\n.gap-1 {\n  gap: 0.25rem;\n}\n.gap-2 {\n  gap: 0.5rem;\n}\n.gap-3 {\n  gap: 0.75rem;\n}\n.gap-4 {\n  gap: 1rem;\n}\n.gap-\\[6px\\] {\n  gap: 6px;\n}\n.self-start {\n  align-self: flex-start;\n}\n.overflow-y-auto {\n  overflow-y: auto;\n}\n.rounded-\\[10px\\] {\n  border-radius: 10px;\n}\n.rounded-\\[12px\\] {\n  border-radius: 12px;\n}\n.rounded-\\[16px\\] {\n  border-radius: 16px;\n}\n.rounded-\\[24px\\] {\n  border-radius: 24px;\n}\n.rounded-\\[8px\\] {\n  border-radius: 8px;\n}\n.rounded-full {\n  border-radius: 9999px;\n}\n.border {\n  border-width: 1px;\n}\n.border-b {\n  border-bottom-width: 1px;\n}\n.border-t {\n  border-top-width: 1px;\n}\n.border-\\[\\#e9e9e9\\] {\n  --tw-border-opacity: 1;\n  border-color: rgb(233 233 233 / var(--tw-border-opacity, 1));\n}\n.border-\\[\\#f0f0f0\\] {\n  --tw-border-opacity: 1;\n  border-color: rgb(240 240 240 / var(--tw-border-opacity, 1));\n}\n.border-red-500 {\n  --tw-border-opacity: 1;\n  border-color: rgb(239 68 68 / var(--tw-border-opacity, 1));\n}\n.border-transparent {\n  border-color: transparent;\n}\n.bg-\\[\\#1f1f1f\\] {\n  --tw-bg-opacity: 1;\n  background-color: rgb(31 31 31 / var(--tw-bg-opacity, 1));\n}\n.bg-\\[\\#dcfce7\\] {\n  --tw-bg-opacity: 1;\n  background-color: rgb(220 252 231 / var(--tw-bg-opacity, 1));\n}\n.bg-\\[\\#e9e9e9\\] {\n  --tw-bg-opacity: 1;\n  background-color: rgb(233 233 233 / var(--tw-bg-opacity, 1));\n}\n.bg-\\[\\#ef4444\\] {\n  --tw-bg-opacity: 1;\n  background-color: rgb(239 68 68 / var(--tw-bg-opacity, 1));\n}\n.bg-\\[\\#f0f0f0\\] {\n  --tw-bg-opacity: 1;\n  background-color: rgb(240 240 240 / var(--tw-bg-opacity, 1));\n}\n.bg-\\[\\#f4f4f5\\] {\n  --tw-bg-opacity: 1;\n  background-color: rgb(244 244 245 / var(--tw-bg-opacity, 1));\n}\n.bg-\\[\\#f5f5f5\\] {\n  --tw-bg-opacity: 1;\n  background-color: rgb(245 245 245 / var(--tw-bg-opacity, 1));\n}\n.bg-\\[\\#fee2e2\\] {\n  --tw-bg-opacity: 1;\n  background-color: rgb(254 226 226 / var(--tw-bg-opacity, 1));\n}\n.bg-\\[\\#fef3c7\\] {\n  --tw-bg-opacity: 1;\n  background-color: rgb(254 243 199 / var(--tw-bg-opacity, 1));\n}\n.bg-black\\/40 {\n  background-color: rgb(0 0 0 / 0.4);\n}\n.bg-black\\/50 {\n  background-color: rgb(0 0 0 / 0.5);\n}\n.bg-red-50 {\n  --tw-bg-opacity: 1;\n  background-color: rgb(254 242 242 / var(--tw-bg-opacity, 1));\n}\n.bg-transparent {\n  background-color: transparent;\n}\n.bg-white {\n  --tw-bg-opacity: 1;\n  background-color: rgb(255 255 255 / var(--tw-bg-opacity, 1));\n}\n.object-contain {\n  -o-object-fit: contain;\n  object-fit: contain;\n}\n.object-cover {\n  -o-object-fit: cover;\n  object-fit: cover;\n}\n.p-0 {\n  padding: 0px;\n}\n.p-1 {\n  padding: 0.25rem;\n}\n.p-3 {\n  padding: 0.75rem;\n}\n.p-4 {\n  padding: 1rem;\n}\n.p-\\[10px\\] {\n  padding: 10px;\n}\n.p-\\[12px\\] {\n  padding: 12px;\n}\n.p-\\[16px\\] {\n  padding: 16px;\n}\n.p-\\[20px\\] {\n  padding: 20px;\n}\n.p-\\[24px\\] {\n  padding: 24px;\n}\n.px-3 {\n  padding-left: 0.75rem;\n  padding-right: 0.75rem;\n}\n.px-6 {\n  padding-left: 1.5rem;\n  padding-right: 1.5rem;\n}\n.px-\\[10px\\] {\n  padding-left: 10px;\n  padding-right: 10px;\n}\n.px-\\[12px\\] {\n  padding-left: 12px;\n  padding-right: 12px;\n}\n.px-\\[14px\\] {\n  padding-left: 14px;\n  padding-right: 14px;\n}\n.px-\\[16px\\] {\n  padding-left: 16px;\n  padding-right: 16px;\n}\n.px-\\[18px\\] {\n  padding-left: 18px;\n  padding-right: 18px;\n}\n.px-\\[20px\\] {\n  padding-left: 20px;\n  padding-right: 20px;\n}\n.px-\\[28px\\] {\n  padding-left: 28px;\n  padding-right: 28px;\n}\n.py-12 {\n  padding-top: 3rem;\n  padding-bottom: 3rem;\n}\n.py-2 {\n  padding-top: 0.5rem;\n  padding-bottom: 0.5rem;\n}\n.py-5 {\n  padding-top: 1.25rem;\n  padding-bottom: 1.25rem;\n}\n.py-8 {\n  padding-top: 2rem;\n  padding-bottom: 2rem;\n}\n.pb-4 {\n  padding-bottom: 1rem;\n}\n.pl-\\[12px\\] {\n  padding-left: 12px;\n}\n.pl-\\[36px\\] {\n  padding-left: 36px;\n}\n.pr-\\[12px\\] {\n  padding-right: 12px;\n}\n.pt-12 {\n  padding-top: 3rem;\n}\n.pt-4 {\n  padding-top: 1rem;\n}\n.pt-6 {\n  padding-top: 1.5rem;\n}\n.text-center {\n  text-align: center;\n}\n.font-mono {\n  font-family:\n    ui-monospace,\n    SFMono-Regular,\n    Menlo,\n    Monaco,\n    Consolas,\n    "Liberation Mono",\n    "Courier New",\n    monospace;\n}\n.text-\\[10px\\] {\n  font-size: 10px;\n}\n.text-\\[11px\\] {\n  font-size: 11px;\n}\n.text-\\[12px\\] {\n  font-size: 12px;\n}\n.text-\\[13px\\] {\n  font-size: 13px;\n}\n.text-\\[14px\\] {\n  font-size: 14px;\n}\n.text-\\[16px\\] {\n  font-size: 16px;\n}\n.text-\\[18px\\] {\n  font-size: 18px;\n}\n.text-\\[32px\\] {\n  font-size: 32px;\n}\n.font-bold {\n  font-weight: 700;\n}\n.uppercase {\n  text-transform: uppercase;\n}\n.italic {\n  font-style: italic;\n}\n.leading-none {\n  line-height: 1;\n}\n.leading-relaxed {\n  line-height: 1.625;\n}\n.leading-snug {\n  line-height: 1.375;\n}\n.tracking-wider {\n  letter-spacing: 0.05em;\n}\n.text-\\[\\#166534\\] {\n  --tw-text-opacity: 1;\n  color: rgb(22 101 52 / var(--tw-text-opacity, 1));\n}\n.text-\\[\\#1f1f1f\\] {\n  --tw-text-opacity: 1;\n  color: rgb(31 31 31 / var(--tw-text-opacity, 1));\n}\n.text-\\[\\#92400e\\] {\n  --tw-text-opacity: 1;\n  color: rgb(146 64 14 / var(--tw-text-opacity, 1));\n}\n.text-\\[\\#991b1b\\] {\n  --tw-text-opacity: 1;\n  color: rgb(153 27 27 / var(--tw-text-opacity, 1));\n}\n.text-\\[\\#9a9a9a\\] {\n  --tw-text-opacity: 1;\n  color: rgb(154 154 154 / var(--tw-text-opacity, 1));\n}\n.text-white {\n  --tw-text-opacity: 1;\n  color: rgb(255 255 255 / var(--tw-text-opacity, 1));\n}\n.opacity-60 {\n  opacity: 0.6;\n}\n.shadow-\\[0_25px_50px_rgba\\(0\\,0\\,0\\,0\\.15\\)\\] {\n  --tw-shadow: 0 25px 50px rgba(0,0,0,0.15);\n  --tw-shadow-colored: 0 25px 50px var(--tw-shadow-color);\n  box-shadow:\n    var(--tw-ring-offset-shadow, 0 0 #0000),\n    var(--tw-ring-shadow, 0 0 #0000),\n    var(--tw-shadow);\n}\n.shadow-\\[0_8px_24px_rgba\\(0\\,0\\,0\\,0\\.25\\)\\] {\n  --tw-shadow: 0 8px 24px rgba(0,0,0,0.25);\n  --tw-shadow-colored: 0 8px 24px var(--tw-shadow-color);\n  box-shadow:\n    var(--tw-ring-offset-shadow, 0 0 #0000),\n    var(--tw-ring-shadow, 0 0 #0000),\n    var(--tw-shadow);\n}\n.shadow-\\[0_8px_32px_rgba\\(0\\,0\\,0\\,0\\.2\\)\\] {\n  --tw-shadow: 0 8px 32px rgba(0,0,0,0.2);\n  --tw-shadow-colored: 0 8px 32px var(--tw-shadow-color);\n  box-shadow:\n    var(--tw-ring-offset-shadow, 0 0 #0000),\n    var(--tw-ring-shadow, 0 0 #0000),\n    var(--tw-shadow);\n}\n.shadow-\\[0_8px_32px_rgba\\(0\\,0\\,0\\,0\\.22\\)\\] {\n  --tw-shadow: 0 8px 32px rgba(0,0,0,0.22);\n  --tw-shadow-colored: 0 8px 32px var(--tw-shadow-color);\n  box-shadow:\n    var(--tw-ring-offset-shadow, 0 0 #0000),\n    var(--tw-ring-shadow, 0 0 #0000),\n    var(--tw-shadow);\n}\n.shadow-md {\n  --tw-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);\n  --tw-shadow-colored: 0 4px 6px -1px var(--tw-shadow-color), 0 2px 4px -2px var(--tw-shadow-color);\n  box-shadow:\n    var(--tw-ring-offset-shadow, 0 0 #0000),\n    var(--tw-ring-shadow, 0 0 #0000),\n    var(--tw-shadow);\n}\n.shadow-sm {\n  --tw-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);\n  --tw-shadow-colored: 0 1px 2px 0 var(--tw-shadow-color);\n  box-shadow:\n    var(--tw-ring-offset-shadow, 0 0 #0000),\n    var(--tw-ring-shadow, 0 0 #0000),\n    var(--tw-shadow);\n}\n.outline-none {\n  outline: 2px solid transparent;\n  outline-offset: 2px;\n}\n.filter {\n  filter: var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow);\n}\n.backdrop-blur-sm {\n  --tw-backdrop-blur: blur(4px);\n  backdrop-filter: var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia);\n}\n.transition-all {\n  transition-property: all;\n  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);\n  transition-duration: 150ms;\n}\n.transition-colors {\n  transition-property:\n    color,\n    background-color,\n    border-color,\n    text-decoration-color,\n    fill,\n    stroke;\n  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);\n  transition-duration: 150ms;\n}\n.duration-200 {\n  transition-duration: 200ms;\n}\n.placeholder\\:text-\\[\\#a3a3a3\\]::-moz-placeholder {\n  --tw-text-opacity: 1;\n  color: rgb(163 163 163 / var(--tw-text-opacity, 1));\n}\n.placeholder\\:text-\\[\\#a3a3a3\\]::placeholder {\n  --tw-text-opacity: 1;\n  color: rgb(163 163 163 / var(--tw-text-opacity, 1));\n}\n.hover\\:scale-105:hover {\n  --tw-scale-x: 1.05;\n  --tw-scale-y: 1.05;\n  transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y));\n}\n.hover\\:bg-\\[\\#303030\\]:hover {\n  --tw-bg-opacity: 1;\n  background-color: rgb(48 48 48 / var(--tw-bg-opacity, 1));\n}\n.hover\\:bg-\\[\\#dc2626\\]:hover {\n  --tw-bg-opacity: 1;\n  background-color: rgb(220 38 38 / var(--tw-bg-opacity, 1));\n}\n.hover\\:bg-\\[\\#e9e9e9\\]:hover {\n  --tw-bg-opacity: 1;\n  background-color: rgb(233 233 233 / var(--tw-bg-opacity, 1));\n}\n.hover\\:bg-\\[\\#ebebeb\\]:hover {\n  --tw-bg-opacity: 1;\n  background-color: rgb(235 235 235 / var(--tw-bg-opacity, 1));\n}\n.hover\\:bg-\\[\\#f0f0f0\\]:hover {\n  --tw-bg-opacity: 1;\n  background-color: rgb(240 240 240 / var(--tw-bg-opacity, 1));\n}\n.hover\\:bg-\\[\\#f4f4f5\\]:hover {\n  --tw-bg-opacity: 1;\n  background-color: rgb(244 244 245 / var(--tw-bg-opacity, 1));\n}\n.hover\\:text-\\[\\#1f1f1f\\]:hover {\n  --tw-text-opacity: 1;\n  color: rgb(31 31 31 / var(--tw-text-opacity, 1));\n}\n.hover\\:shadow-lg:hover {\n  --tw-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);\n  --tw-shadow-colored: 0 10px 15px -3px var(--tw-shadow-color), 0 4px 6px -4px var(--tw-shadow-color);\n  box-shadow:\n    var(--tw-ring-offset-shadow, 0 0 #0000),\n    var(--tw-ring-shadow, 0 0 #0000),\n    var(--tw-shadow);\n}\n.focus\\:border-\\[\\#1f1f1f\\]:focus {\n  --tw-border-opacity: 1;\n  border-color: rgb(31 31 31 / var(--tw-border-opacity, 1));\n}\n.focus\\:outline-none:focus {\n  outline: 2px solid transparent;\n  outline-offset: 2px;\n}\n.disabled\\:cursor-not-allowed:disabled {\n  cursor: not-allowed;\n}\n.disabled\\:opacity-50:disabled {\n  opacity: 0.5;\n}\n');

// src/components/BuggyBag.tsx
import { Fragment as Fragment5, jsx as jsx13, jsxs as jsxs11 } from "react/jsx-runtime";
function BuggyBagInner({ apiEndpoint, projectId }) {
  const [mode, setMode] = useState7("idle");
  const { bugs, addBug, updateBugStatus } = useBugStore();
  const activeBugCount = bugs.filter((b) => b.status === "active").length;
  const handleSaveBug = async (data) => {
    addBug({
      ...data,
      id: Math.random().toString(36).slice(2, 11),
      createdAt: Date.now(),
      status: "active"
    });
    setMode("dashboard");
    if (apiEndpoint) {
      const base64Image = data.screenshotDataUrl.replace(/^data:image\/\w+;base64,/, "");
      const annotationsArray = Object.entries(data.annotations).map(([id, text]) => ({ id, text }));
      try {
        await fetch(apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: projectId ?? "",
            image: base64Image,
            annotations: annotationsArray
          })
        });
      } catch {
      }
    }
  };
  return /* @__PURE__ */ jsxs11(Fragment5, { children: [
    /* @__PURE__ */ jsx13(
      FloatingButton,
      {
        onCapture: () => setMode("capture"),
        onDashboard: () => setMode((m) => m === "dashboard" ? "idle" : "dashboard"),
        activeBugCount,
        showDashboardButton: bugs.length > 0 && mode !== "capture"
      }
    ),
    mode === "capture" && /* @__PURE__ */ jsx13(
      CaptureMode,
      {
        onSave: handleSaveBug,
        onCancel: () => setMode("idle")
      }
    ),
    /* @__PURE__ */ jsx13(
      Dashboard,
      {
        isOpen: mode === "dashboard",
        onClose: () => setMode("idle"),
        bugs,
        onStatusChange: updateBugStatus
      }
    )
  ] });
}
function BuggyBag({ apiEndpoint, projectId } = {}) {
  return /* @__PURE__ */ jsx13(GodModeGuard, { children: /* @__PURE__ */ jsx13(BuggyBagInner, { apiEndpoint, projectId }) });
}
export {
  BuggyBag,
  useBugStore
};
//# sourceMappingURL=index.mjs.map