export type DrawTool = 'rect' | 'arrow' | 'pin' | 'measure' | 'eraser';
export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DebugOverlay = 'invert' | 'spacing' | 'show-code' | 'zoom' | 'auto-bugs' | 'typography';

/**
 * DOM context captured when a pin is placed on a specific element.
 * Gives developers instant "what did the user click on" without guessing.
 */
export interface PinElementContext {
  tagName: string;                   // e.g. "button"
  id?: string;                       // element id if present
  classes: string[];                 // list of CSS class names
  selector: string;                  // unique CSS selector, e.g. "button#add-to-cart"
  ariaLabel?: string;                // aria-label if present
  innerText?: string;                // first 80 chars of visible text
  role?: string;                     // aria role
  href?: string;                     // for anchor elements
  inputType?: string;                // for input elements (text, checkbox, etc.)
  inputName?: string;                // name attribute for form elements
  placeholder?: string;              // placeholder text for inputs
  dataSources?: string[];            // data-buggy-source attributes (from element + ancestors)
  reactComponent?: {
    name: string;
    filePath?: string;               // from fiber._debugSource.fileName (dev builds only)
    lineNumber?: number;             // from fiber._debugSource.lineNumber
    props?: Record<string, unknown>; // primitive props only
  };
  boundingRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DrawShape {
  id: string;
  type: DrawTool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: [number, number, number, number]; // arrow: [x1, y1, x2, y2]
  pinNumber?: number;
  /** DOM context captured when pin was placed — only set for 'pin' type */
  elementContext?: PinElementContext;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  durationMs: number;
  isError: boolean;
  /** Request body (first 500 chars) — only captured for error responses */
  requestBody?: string;
  /** Response body (first 500 chars) — only captured for error responses */
  responseBody?: string;
  /** Safe request headers (Auth/Cookie stripped) — only for error responses */
  requestHeaders?: Record<string, string>;
}

export interface ConsoleEntry {
  level: 'error' | 'warn';
  message: string;
  source?: string; // file:line if available
}

export interface EventLogEntry {
  type: 'navigation' | 'click' | 'network_error' | 'console_error' | 'store_change'
      | 'form_change' | 'scroll' | 'focus';
  description: string;
  timestamp: number;
  /** Populated at report time: how many ms before the report this event happened */
  relativeMs?: number;
}

export interface ComponentInfo {
  name: string;
  props?: Record<string, unknown>;
  filePath?: string;   // e.g. "src/components/ProductCard.tsx"
  lineNumber?: number; // source line number (dev builds only)
}

export interface TechContext {
  route: string;
  viewport: string;           // e.g. "1440x900"
  userAgent: string;
  component: ComponentInfo | null;
  storeSnapshot: Record<string, unknown> | null;
  /** Task 6: which store fields changed between page load and bug report */
  storeDiff?: Record<string, { before: unknown; after: unknown }>;
  networkRequests: NetworkRequest[];
  consoleErrors: ConsoleEntry[];
  eventLog: EventLogEntry[];  // last 5min of interactions
  autoSeverity: BugSeverity;
}

// What the widget sends to /api/bugs/submit
export interface SubmitBugPayload {
  api_key: string;
  base64_image: string;          // "data:image/png;base64,..."
  shapes: DrawShape[];
  annotations: Record<string, string>;
  description: string;
  tech_context: TechContext;
}
