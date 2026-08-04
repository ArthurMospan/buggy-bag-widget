import * as react_jsx_runtime from 'react/jsx-runtime';

interface BuggyBagProps {
    apiEndpoint?: string;
    apiKey?: string;
    portalUrl?: string;
}
declare function BuggyBag({ apiEndpoint, apiKey, portalUrl }?: BuggyBagProps): react_jsx_runtime.JSX.Element;
declare function isActive(): boolean;

type DrawTool = 'rect' | 'arrow' | 'pin' | 'measure' | 'eraser';
type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
/**
 * DOM context captured when a pin is placed on a specific element.
 * Gives developers instant "what did the user click on" without guessing.
 */
interface PinElementContext {
    tagName: string;
    id?: string;
    classes: string[];
    selector: string;
    ariaLabel?: string;
    innerText?: string;
    role?: string;
    href?: string;
    inputType?: string;
    inputName?: string;
    placeholder?: string;
    dataSources?: string[];
    reactComponent?: {
        name: string;
        filePath?: string;
        lineNumber?: number;
        props?: Record<string, unknown>;
    };
    boundingRect: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
interface DrawShape {
    id: string;
    type: DrawTool;
    x: number;
    y: number;
    width?: number;
    height?: number;
    points?: [number, number, number, number];
    pinNumber?: number;
    /** DOM context captured at the shape's anchor point — set for pin, rect, arrow, and measure types */
    elementContext?: PinElementContext;
}
interface NetworkRequest {
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
interface ConsoleEntry {
    level: 'error' | 'warn';
    message: string;
    source?: string;
}
interface EventLogEntry {
    type: 'navigation' | 'click' | 'network_error' | 'console_error' | 'store_change' | 'form_change' | 'scroll' | 'focus';
    description: string;
    timestamp: number;
    /** Populated at report time: how many ms before the report this event happened */
    relativeMs?: number;
}
interface ComponentInfo {
    name: string;
    props?: Record<string, unknown>;
    filePath?: string;
    lineNumber?: number;
}
interface DesignAuditResult {
    fonts: {
        value: string;
        count: number;
        elements?: HTMLElement[];
    }[];
    fontSizes: {
        value: string;
        count: number;
        elements?: HTMLElement[];
    }[];
    colors: {
        value: string;
        count: number;
        elements?: HTMLElement[];
    }[];
    spacings: {
        value: string;
        count: number;
        elements?: HTMLElement[];
    }[];
    borderRadii: {
        value: string;
        count: number;
        elements?: HTMLElement[];
    }[];
    shadows: {
        value: string;
        count: number;
        elements?: HTMLElement[];
    }[];
}
interface TechContext {
    route: string;
    viewport: string;
    userAgent: string;
    component: ComponentInfo | null;
    storeSnapshot: Record<string, unknown> | null;
    /** Task 6: which store fields changed between page load and bug report */
    storeDiff?: Record<string, {
        before: unknown;
        after: unknown;
    }>;
    networkRequests: NetworkRequest[];
    consoleErrors: ConsoleEntry[];
    eventLog: EventLogEntry[];
    autoSeverity: BugSeverity;
    designAudit?: DesignAuditResult | null;
    screenshotRenderer?: 'html2canvas' | 'html2canvas-normalized' | 'html-to-image-scroll-aware' | 'failed';
}
interface SubmitBugPayload {
    api_key: string;
    base64_image: string;
    shapes: DrawShape[];
    annotations: Record<string, string>;
    shape_attachments?: Record<string, {
        name: string;
        type: string;
        base64: string;
    }[]>;
    description: string;
    tech_context: TechContext;
}

/**
 * collector.ts
 * Automatically collects technical context when a bug is reported.
 * Intercepts fetch/XHR, console errors, and tracks user interactions.
 */

/**
 * Register a CSS selector → data source mapping.
 * When a pin lands on a matching element, the source is included in the report.
 * @example BuggyBag.registerDataSource('#price', 'supabase:products.price')
 */
declare function registerDataSource(selector: string, source: string): void;
/** Call once when the widget mounts */
declare function initCollector(): void;
/** Collect full tech context at the moment of capture */
declare function collectTechContext(clickedElement?: HTMLElement | null): TechContext;

export { type BugSeverity, BuggyBag, type BuggyBagProps, type ComponentInfo, type ConsoleEntry, type DrawShape, type DrawTool, type EventLogEntry, type NetworkRequest, type SubmitBugPayload, type TechContext, collectTechContext, initCollector, isActive, registerDataSource };
