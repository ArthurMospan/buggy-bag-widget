"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  BuggyBag: () => BuggyBag,
  useBugStore: () => useBugStore
});
module.exports = __toCommonJS(index_exports);

// src/components/BuggyBag.tsx
var import_react9 = require("react");
var import_client = require("react-dom/client");

// src/guard.tsx
var import_react = __toESM(require("react"));
var import_jsx_runtime = require("react/jsx-runtime");
function isGodModeActive() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("BUGGY_BAG_ACCESS") === "active";
}
function GodModeGuard({ children }) {
  const [active, setActive] = import_react.default.useState(false);
  import_react.default.useEffect(() => {
    setActive(isGodModeActive());
  }, []);
  if (!active) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}

// src/store.ts
var import_zustand = require("zustand");
var import_middleware = require("zustand/middleware");
var useBugStore = (0, import_zustand.create)()(
  (0, import_middleware.persist)(
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
var import_lucide_react = require("lucide-react");
var import_jsx_runtime2 = require("react/jsx-runtime");
function FloatingButton({
  onCapture,
  onDashboard,
  activeBugCount,
  showDashboardButton
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "div",
    {
      "data-buggy-bag": "true",
      className: "fixed bottom-6 right-6 z-[9997] flex items-center gap-2",
      children: [
        showDashboardButton && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "button",
          {
            type: "button",
            onClick: onDashboard,
            "aria-label": "Open Bug Dashboard",
            className: "relative w-[44px] h-[44px] bg-white border border-[#e9e9e9] text-[#1f1f1f] rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center justify-center",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react.List, { size: 18 }),
              activeBugCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#ef4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none", children: activeBugCount > 9 ? "9+" : activeBugCount })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            onClick: onCapture,
            "aria-label": "Capture Bug Screenshot",
            className: "w-[52px] h-[52px] bg-[#1f1f1f] text-white rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:bg-[#303030] hover:scale-105 transition-all duration-200 flex items-center justify-center",
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react.Bug, { size: 22 })
          }
        )
      ]
    }
  );
}

// src/components/CaptureMode.tsx
var import_react4 = require("react");

// src/components/DrawingCanvas.tsx
var import_react2 = require("react");
var import_react_konva = require("react-konva");
var import_jsx_runtime3 = require("react/jsx-runtime");
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
  const isDrawing = (0, import_react2.useRef)(false);
  const origin = (0, import_react2.useRef)({ x: 0, y: 0 });
  const [draft, setDraft] = (0, import_react2.useState)(null);
  const draftRef = (0, import_react2.useRef)(null);
  const handleMouseDown = (0, import_react2.useCallback)(
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
  const handleMouseMove = (0, import_react2.useCallback)(
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
  const handleMouseUp = (0, import_react2.useCallback)(() => {
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
  const handleMouseLeave = (0, import_react2.useCallback)(() => {
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
  (0, import_react2.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    import_react_konva.Stage,
    {
      width,
      height,
      style: { position: "absolute", top: 0, left: 0, cursor: "crosshair" },
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_react_konva.Layer, { children: [
        shapes.map(renderShape),
        draft && renderShape(draft)
      ] })
    }
  );
}
function renderShape(s) {
  if (s.type === "rect") {
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      import_react_konva.Rect,
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
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      import_react_konva.Arrow,
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
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_react_konva.Group, { x: s.x, y: s.y, listening: false, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_react_konva.Circle, { radius: 14, fill: "#ef4444" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        import_react_konva.Text,
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
var import_lucide_react2 = require("lucide-react");
var import_jsx_runtime4 = require("react/jsx-runtime");
var TOOLS = [
  { tool: "rect", label: "\u0412\u0438\u0434\u0456\u043B\u0438\u0442\u0438 \u0437\u043E\u043D\u0443", Icon: import_lucide_react2.Square },
  { tool: "arrow", label: "\u041D\u0430\u043C\u0430\u043B\u044E\u0432\u0430\u0442\u0438 \u0441\u0442\u0440\u0456\u043B\u043A\u0443", Icon: import_lucide_react2.ArrowRight },
  { tool: "pin", label: "\u041F\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u0438 \u043F\u0456\u043D", Icon: import_lucide_react2.MapPin }
];
function DrawingToolbar({
  activeTool,
  onToolChange,
  onSave,
  onCancel
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "div",
    {
      "data-buggy-bag": "true",
      className: "fixed top-4 left-1/2 -translate-x-1/2 z-[10001] flex items-center gap-2 bg-white rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.2)] px-3 py-2",
      children: [
        TOOLS.map(({ tool, label, Icon }) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          "button",
          {
            type: "button",
            onClick: () => onToolChange(tool),
            title: label,
            "aria-pressed": activeTool === tool,
            className: `flex items-center gap-[6px] h-[36px] px-[14px] rounded-[10px] text-[13px] font-bold transition-colors ${activeTool === tool ? "bg-[#1f1f1f] text-white" : "bg-transparent text-[#9a9a9a] hover:bg-[#f0f0f0] hover:text-[#1f1f1f]"}`,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Icon, { size: 14 }),
              label
            ]
          },
          tool
        )),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "w-px h-6 bg-[#e9e9e9] mx-1", "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "button",
          {
            type: "button",
            onClick: onSave,
            className: "h-[36px] px-[18px] rounded-[10px] text-[13px] font-bold bg-[#1f1f1f] text-white hover:bg-[#303030] transition-colors",
            children: "\u0417\u0431\u0435\u0440\u0435\u0433\u0442\u0438 \u0431\u0430\u0433"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
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
var import_react3 = require("react");
var import_lucide_react3 = require("lucide-react");
var import_jsx_runtime5 = require("react/jsx-runtime");
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
  const [text, setText] = (0, import_react3.useState)("");
  const [listening, setListening] = (0, import_react3.useState)(false);
  const recRef = (0, import_react3.useRef)(null);
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
  (0, import_react3.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
    "div",
    {
      "data-buggy-bag": "true",
      className: "absolute z-[10002] w-[288px] bg-white rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.22)] p-3",
      style: { left: x, top: y },
      onClick: stopProp,
      onMouseDown: stopProp,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "label",
          {
            htmlFor: "buggy-annotation-text",
            className: "block text-[11px] font-bold text-[#9a9a9a] uppercase tracking-wider mb-2 cursor-default",
            children: "\u0412\u043A\u0430\u0436\u0456\u0442\u044C \u043F\u0440\u0438\u0447\u0438\u043D\u0443..."
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex gap-2 mt-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            "button",
            {
              type: "button",
              onClick: toggleVoice,
              title: listening ? "\u0417\u0443\u043F\u0438\u043D\u0438\u0442\u0438 \u0437\u0430\u043F\u0438\u0441" : "\u0414\u0438\u043A\u0442\u0443\u0432\u0430\u0442\u0438 \u0433\u043E\u043B\u043E\u0441\u043E\u043C",
              "aria-label": listening ? "Stop voice recording" : "Start voice recording",
              "aria-pressed": listening,
              className: `w-[36px] h-[36px] rounded-[10px] flex items-center justify-center transition-colors shrink-0 ${listening ? "bg-[#ef4444] text-white animate-pulse" : "bg-[#f4f4f5] text-[#9a9a9a] hover:bg-[#e9e9e9] hover:text-[#1f1f1f]"}`,
              children: listening ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.MicOff, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.Mic, { size: 14 })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            "button",
            {
              type: "button",
              onClick: handleDismiss,
              className: "flex-1 h-[36px] rounded-[10px] text-[13px] font-bold bg-[#f5f5f5] text-[#1f1f1f] hover:bg-[#ebebeb] transition-colors",
              children: "\u0421\u043A\u0430\u0441\u0443\u0432\u0430\u0442\u0438"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
            "button",
            {
              type: "button",
              onClick: handleConfirm,
              className: "flex-1 h-[36px] rounded-[10px] text-[13px] font-bold bg-[#1f1f1f] text-white hover:bg-[#303030] transition-colors flex items-center justify-center gap-[6px]",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react3.Check, { size: 14 }),
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
var import_jsx_runtime6 = require("react/jsx-runtime");
function CaptureMode({ onSave, onCancel }) {
  const [screenshotUrl, setScreenshotUrl] = (0, import_react4.useState)(null);
  const [tool, setTool] = (0, import_react4.useState)("rect");
  const [shapes, setShapes] = (0, import_react4.useState)([]);
  const [annotations, setAnnotations] = (0, import_react4.useState)({});
  const [pendingShape, setPendingShape] = (0, import_react4.useState)(null);
  const w = typeof window !== "undefined" ? window.innerWidth : 1280;
  const h = typeof window !== "undefined" ? window.innerHeight : 800;
  (0, import_react4.useEffect)(() => {
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
  const handleShapeComplete = (0, import_react4.useCallback)((shape) => {
    setShapes((prev) => [...prev, shape]);
    setPendingShape(shape);
  }, []);
  const handleAnnotationConfirm = (0, import_react4.useCallback)(
    (shapeId, text) => {
      setAnnotations((prev) => ({ ...prev, [shapeId]: text }));
      setPendingShape(null);
    },
    []
  );
  const handleAnnotationDismiss = (0, import_react4.useCallback)(() => {
    setPendingShape((pending) => {
      if (pending) {
        setShapes((prev) => prev.filter((s) => s.id !== pending.id));
      }
      return null;
    });
  }, []);
  const handleSave = (0, import_react4.useCallback)(() => {
    if (!screenshotUrl) return;
    onSave({ screenshotDataUrl: screenshotUrl, shapes, annotations });
  }, [screenshotUrl, shapes, annotations, onSave]);
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
    "div",
    {
      "data-buggy-bag": "true",
      className: "fixed inset-0 z-[10000]",
      style: { userSelect: "none" },
      children: [
        screenshotUrl ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          "img",
          {
            src: screenshotUrl,
            alt: "Page screenshot",
            className: "absolute inset-0 w-full h-full object-cover pointer-events-none",
            draggable: false
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "absolute inset-0 bg-black/50 flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          "span",
          {
            role: "status",
            "aria-live": "polite",
            className: "text-white text-[16px] font-bold animate-pulse",
            children: "\u0417\u043D\u0456\u043C\u043E\u043A \u0435\u043A\u0440\u0430\u043D\u0443..."
          }
        ) }),
        screenshotUrl && !pendingShape && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          DrawingCanvas,
          {
            width: w,
            height: h,
            tool,
            shapes,
            onShapeComplete: handleShapeComplete
          }
        ),
        pendingShape && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          ShapeAnnotation,
          {
            shape: pendingShape,
            containerWidth: w,
            containerHeight: h,
            onConfirm: handleAnnotationConfirm,
            onDismiss: handleAnnotationDismiss
          }
        ),
        screenshotUrl && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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
var import_react8 = require("react");

// src/components/ui/Dialog.tsx
var import_react5 = require("react");
var import_lucide_react4 = require("lucide-react");
var import_jsx_runtime7 = require("react/jsx-runtime");
var SIZE_MAP = {
  sm: "max-w-[480px]",
  md: "max-w-[640px]",
  lg: "max-w-[900px]",
  xl: "max-w-[1200px]"
};
function Dialog({ isOpen, onClose, title, children, size = "md" }) {
  (0, import_react5.useEffect)(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);
  if (!isOpen) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
    "div",
    {
      className: "fixed inset-0 z-[9998] flex items-start justify-center bg-black/40 backdrop-blur-sm pt-12 overflow-y-auto",
      onClick: onClose,
      children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
        "div",
        {
          className: `bg-white rounded-[24px] shadow-[0_25px_50px_rgba(0,0,0,0.15)] w-full mx-4 ${SIZE_MAP[size]}`,
          onClick: (e) => e.stopPropagation(),
          children: [
            title && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#f0f0f0]", children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h2", { className: "text-[18px] font-bold text-[#1f1f1f]", children: title }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                "button",
                {
                  onClick: onClose,
                  "aria-label": "Close",
                  className: "p-1 text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#f4f4f5] rounded-[8px] transition-colors",
                  children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_lucide_react4.X, { size: 20 })
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "px-6 py-5 overflow-y-auto max-h-[calc(100vh-200px)]", children })
          ]
        }
      )
    }
  );
}

// src/components/BugCard.tsx
var import_react6 = require("react");
var import_lucide_react5 = require("lucide-react");

// src/components/ui/Surface.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
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
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: `${VARIANTS[variant]} ${PADDING[padding]} ${className}`, children });
}

// src/components/ui/Button.tsx
var import_jsx_runtime9 = require("react/jsx-runtime");
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
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
    "button",
    {
      type: "button",
      className: `inline-flex items-center justify-center gap-[6px] font-bold leading-none transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${SIZES[size]} ${VARIANTS2[variant]} ${className}`,
      ...props,
      children: [
        Icon && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Icon, { size: iconSize }),
        children && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: size === "icon" ? "sr-only" : "", children })
      ]
    }
  );
}

// src/components/BugCard.tsx
var import_jsx_runtime10 = require("react/jsx-runtime");
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
  const [expanded, setExpanded] = (0, import_react6.useState)(false);
  const notes = Object.entries(bug.annotations).filter(([, v]) => v.trim());
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(Surface, { variant: "panel", padding: "md", className: "flex flex-col gap-3", children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "flex items-start gap-3", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        "img",
        {
          src: bug.screenshotDataUrl,
          alt: "Bug screenshot thumbnail",
          className: "w-[80px] h-[52px] rounded-[10px] object-cover shrink-0 border border-[#e9e9e9]"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "flex items-center gap-2 mb-1 flex-wrap", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
            "span",
            {
              className: `inline-flex items-center h-[22px] px-[10px] rounded-full text-[11px] font-bold ${STATUS_COLOR[bug.status]}`,
              children: STATUS_LABEL[bug.status]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "text-[11px] text-[#9a9a9a]", children: new Date(bug.createdAt).toLocaleDateString("uk-UA", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          }) })
        ] }),
        notes[0] && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "text-[13px] text-[#1f1f1f] line-clamp-2 leading-snug", children: notes[0][1] }),
        notes.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "text-[13px] text-[#9a9a9a] italic", children: "\u0411\u0435\u0437 \u043E\u043F\u0438\u0441\u0443" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        "button",
        {
          type: "button",
          onClick: () => setExpanded((v) => !v),
          "aria-label": expanded ? "Collapse bug details" : "Expand bug details",
          "aria-expanded": expanded,
          className: "p-1 text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#f0f0f0] rounded-[8px] transition-colors shrink-0",
          children: expanded ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_lucide_react5.ChevronUp, { size: 16 }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(import_lucide_react5.ChevronDown, { size: 16 })
        }
      )
    ] }),
    expanded && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        "img",
        {
          src: bug.screenshotDataUrl,
          alt: "Full bug screenshot",
          className: "w-full rounded-[10px] border border-[#e9e9e9] max-h-[300px] object-contain bg-[#f4f4f5]"
        }
      ),
      notes.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "flex flex-col gap-1", children: notes.map(([id, text]) => /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Surface, { variant: "inset", padding: "sm", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "text-[12px] text-[#1f1f1f] leading-relaxed", children: text }) }, id)) }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("p", { className: "text-[11px] text-[#9a9a9a]", children: [
        bug.shapes.length,
        " ",
        pluralizeShapes(bug.shapes.length),
        " \u043D\u0430\u043C\u0430\u043B\u044C\u043E\u0432\u0430\u043D\u043E"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "flex gap-2 flex-wrap", children: [
      bug.status === "active" && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          Button,
          {
            variant: "secondary",
            size: "sm",
            icon: import_lucide_react5.CheckCircle,
            onClick: () => onStatusChange(bug.id, "fixed"),
            children: "\u0412\u0438\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0439"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          Button,
          {
            variant: "ghost",
            size: "sm",
            icon: import_lucide_react5.Archive,
            onClick: () => onStatusChange(bug.id, "archived"),
            children: "\u0410\u0440\u0445\u0456\u0432"
          }
        )
      ] }),
      (bug.status === "fixed" || bug.status === "archived") && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        Button,
        {
          variant: "ghost",
          size: "sm",
          icon: import_lucide_react5.RotateCcw,
          onClick: () => onStatusChange(bug.id, "active"),
          children: "\u041F\u043E\u0432\u0435\u0440\u043D\u0443\u0442\u0438 \u0432 Active"
        }
      )
    ] })
  ] });
}

// src/components/AIReport.tsx
var import_react7 = require("react");
var import_lucide_react6 = require("lucide-react");
var import_jsx_runtime11 = require("react/jsx-runtime");
function AIReport({ isOpen, onClose, activeBugs }) {
  const [prompt, setPrompt] = (0, import_react7.useState)("");
  const [loading, setLoading] = (0, import_react7.useState)(false);
  const [copied, setCopied] = (0, import_react7.useState)(false);
  const [error, setError] = (0, import_react7.useState)(null);
  const copyTimeoutRef = (0, import_react7.useRef)(null);
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
  (0, import_react7.useEffect)(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(Dialog, { isOpen, onClose: handleClose, title: "AI \u0411\u0430\u0433-\u0440\u0435\u043F\u043E\u0440\u0442", size: "lg", children: [
    !prompt && !loading && !error && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "py-8 text-center", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { className: "text-[14px] text-[#9a9a9a] mb-1", children: "\u0410\u043A\u0442\u0438\u0432\u043D\u0438\u0445 \u0431\u0430\u0433\u0456\u0432 \u0434\u043B\u044F \u0430\u043D\u0430\u043B\u0456\u0437\u0443:" }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { className: "text-[32px] font-bold text-[#1f1f1f] mb-6 leading-none", children: activeBugs.length }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { className: "text-[13px] text-[#9a9a9a] mb-6 max-w-[340px] mx-auto", children: "\u041D\u0430\u0442\u0438\u0441\u043D\u0456\u0442\u044C \xAB\u0413\u0435\u043D\u0435\u0440\u0443\u0432\u0430\u0442\u0438\xBB, \u0449\u043E\u0431 \u043D\u0430\u0434\u0456\u0441\u043B\u0430\u0442\u0438 \u0441\u043A\u0440\u0456\u043D\u0448\u043E\u0442\u0438 \u0442\u0430 \u043E\u043F\u0438\u0441 \u0431\u0430\u0433\u0456\u0432 \u0430\u0433\u0435\u043D\u0442\u0443 Antigravity \u0456 \u043E\u0442\u0440\u0438\u043C\u0430\u0442\u0438 \u0433\u043E\u0442\u043E\u0432\u0438\u0439 \u043F\u0440\u043E\u043C\u043F\u0442." }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        "button",
        {
          type: "button",
          onClick: generate,
          className: "h-[44px] px-[28px] rounded-[12px] text-[14px] font-bold bg-[#1f1f1f] text-white hover:bg-[#303030] transition-colors",
          children: "\u0413\u0435\u043D\u0435\u0440\u0443\u0432\u0430\u0442\u0438"
        }
      )
    ] }),
    loading && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
      "div",
      {
        role: "status",
        "aria-live": "polite",
        className: "flex items-center justify-center gap-3 py-12 text-[#9a9a9a]",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_lucide_react6.Loader, { size: 20, className: "animate-spin", "aria-hidden": "true" }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "text-[14px]", children: "\u0413\u0435\u043D\u0435\u0440\u0443\u0454\u0442\u044C\u0441\u044F \u043F\u0440\u043E\u043C\u043F\u0442..." })
        ]
      }
    ),
    error && !loading && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "flex flex-col gap-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "rounded-[12px] bg-[#fee2e2] p-4 text-[13px] text-[#991b1b]", children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        "button",
        {
          type: "button",
          onClick: generate,
          className: "h-[40px] px-[20px] rounded-[10px] text-[13px] font-bold bg-[#f5f5f5] text-[#1f1f1f] hover:bg-[#ebebeb] transition-colors self-start",
          children: "\u0421\u043F\u0440\u043E\u0431\u0443\u0432\u0430\u0442\u0438 \u0449\u0435 \u0440\u0430\u0437"
        }
      )
    ] }),
    prompt && !loading && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "flex flex-col gap-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "relative", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        "textarea",
        {
          readOnly: true,
          value: prompt,
          rows: 16,
          "aria-label": "Generated AI prompt",
          className: "w-full resize-none rounded-[12px] bg-[#f4f4f5] p-4 font-mono text-[12px] text-[#1f1f1f] outline-none leading-relaxed"
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          "button",
          {
            type: "button",
            onClick: copyToClipboard,
            className: "flex flex-1 h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[#1f1f1f] text-[14px] font-bold text-white transition-colors hover:bg-[#303030]",
            children: copied ? /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_jsx_runtime11.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_lucide_react6.Check, { size: 16, "aria-hidden": "true" }),
              "\u0421\u043A\u043E\u043F\u0456\u0439\u043E\u0432\u0430\u043D\u043E!"
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_jsx_runtime11.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(import_lucide_react6.Copy, { size: 16, "aria-hidden": "true" }),
              "\u0421\u043A\u043E\u043F\u0456\u044E\u0432\u0430\u0442\u0438 \u0434\u043B\u044F Antigravity"
            ] })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
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
var import_jsx_runtime12 = require("react/jsx-runtime");
var FILTERS = [
  { value: "all", label: "\u0423\u0441\u0456" },
  { value: "active", label: "Active" },
  { value: "fixed", label: "Fixed" },
  { value: "archived", label: "Archived" }
];
function Dashboard({ isOpen, onClose, bugs, onStatusChange }) {
  const [filter, setFilter] = (0, import_react8.useState)("all");
  const [showAIReport, setShowAIReport] = (0, import_react8.useState)(false);
  const filtered = filter === "all" ? bugs : bugs.filter((b) => b.status === filter);
  const activeBugs = bugs.filter((b) => b.status === "active");
  const countFor = (status) => bugs.filter((b) => b.status === status).length;
  const handleClose = () => {
    setFilter("all");
    setShowAIReport(false);
    onClose();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(import_jsx_runtime12.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(Dialog, { isOpen, onClose: handleClose, title: "Bug Inbox", size: "lg", children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "flex gap-1 mb-4 bg-[#f4f4f5] rounded-[12px] p-1", children: FILTERS.map(({ value, label }) => /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
        "button",
        {
          type: "button",
          onClick: () => setFilter(value),
          "aria-pressed": filter === value,
          className: `flex-1 h-[32px] rounded-[10px] text-[13px] font-bold transition-colors ${filter === value ? "bg-white text-[#1f1f1f] shadow-sm" : "text-[#9a9a9a] hover:text-[#1f1f1f]"}`,
          children: [
            label,
            value !== "all" && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("span", { className: "ml-1 text-[11px] opacity-60", children: [
              "(",
              countFor(value),
              ")"
            ] })
          ]
        },
        value
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "flex flex-col gap-3", children: filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "py-12 text-center text-[14px] text-[#9a9a9a]", children: "\u041D\u0435\u043C\u0430\u0454 \u0431\u0430\u0433\u0456\u0432 \u0443 \u0446\u044C\u043E\u043C\u0443 \u0444\u0456\u043B\u044C\u0442\u0440\u0456" }) : filtered.map((bug) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(BugCard, { bug, onStatusChange }, bug.id)) }),
      activeBugs.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "mt-6 pt-4 border-t border-[#f0f0f0]", children: /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
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
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
      AIReport,
      {
        isOpen: showAIReport,
        onClose: () => setShowAIReport(false),
        activeBugs
      }
    )
  ] });
}

// src/styles.css
var styles_default = {};

// src/components/BuggyBag.tsx
var import_jsx_runtime13 = require("react/jsx-runtime");
function BuggyBagInner({ apiEndpoint, projectId }) {
  const [mode, setMode] = (0, import_react9.useState)("idle");
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
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(import_jsx_runtime13.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
      FloatingButton,
      {
        onCapture: () => setMode("capture"),
        onDashboard: () => setMode((m) => m === "dashboard" ? "idle" : "dashboard"),
        activeBugCount,
        showDashboardButton: bugs.length > 0 && mode !== "capture"
      }
    ),
    mode === "capture" && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(CaptureMode, { onSave: handleSaveBug, onCancel: () => setMode("idle") }),
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
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
  (0, import_react9.useEffect)(() => {
    const host = document.createElement("div");
    host.setAttribute("data-buggy-bag", "true");
    host.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;overflow:visible;";
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const styleEl = document.createElement("style");
    styleEl.textContent = styles_default;
    shadow.appendChild(styleEl);
    const mountPoint = document.createElement("div");
    shadow.appendChild(mountPoint);
    const root = (0, import_client.createRoot)(mountPoint);
    root.render(
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(GodModeGuard, { children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(BuggyBagInner, { apiEndpoint, projectId }) })
    );
    return () => {
      setTimeout(() => {
        root.unmount();
        host.remove();
      }, 0);
    };
  }, []);
  return null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BuggyBag,
  useBugStore
});
//# sourceMappingURL=index.js.map