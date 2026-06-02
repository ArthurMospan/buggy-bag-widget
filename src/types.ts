export type DrawTool = 'rect' | 'arrow' | 'pin' | 'measure';
export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface DrawShape {
  id: string;
  type: DrawTool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: [number, number, number, number]; // arrow: [x1, y1, x2, y2]
  pinNumber?: number;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  durationMs: number;
  isError: boolean;
}

export interface ConsoleEntry {
  level: 'error' | 'warn';
  message: string;
  source?: string; // file:line if available
}

export interface EventLogEntry {
  type: 'navigation' | 'click' | 'network_error' | 'console_error' | 'store_change';
  description: string;
  timestamp: number;
}

export interface ComponentInfo {
  name: string;
  props?: Record<string, unknown>;
  filePath?: string; // e.g. "src/components/ProductCard.tsx"
}

export interface TechContext {
  route: string;
  viewport: string;           // e.g. "1440x900"
  userAgent: string;
  component: ComponentInfo | null;
  storeSnapshot: Record<string, unknown> | null;
  networkRequests: NetworkRequest[];
  consoleErrors: ConsoleEntry[];
  eventLog: EventLogEntry[];  // last 30s of interactions
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
