interface BuggyBagProps {
    apiEndpoint?: string;
    apiKey?: string;
    portalUrl?: string;
}
declare function BuggyBag({ apiEndpoint, apiKey, portalUrl }?: BuggyBagProps): null;
declare function isActive(): boolean;
declare function activateFromUrl(): void;

type DrawTool = 'rect' | 'arrow' | 'pin' | 'measure';
type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
interface DrawShape {
    id: string;
    type: DrawTool;
    x: number;
    y: number;
    width?: number;
    height?: number;
    points?: [number, number, number, number];
    pinNumber?: number;
}
interface NetworkRequest {
    url: string;
    method: string;
    status: number;
    durationMs: number;
    isError: boolean;
}
interface ConsoleEntry {
    level: 'error' | 'warn';
    message: string;
    source?: string;
}
interface EventLogEntry {
    type: 'navigation' | 'click' | 'network_error' | 'console_error' | 'store_change';
    description: string;
    timestamp: number;
}
interface ComponentInfo {
    name: string;
    props?: Record<string, unknown>;
    filePath?: string;
}
interface TechContext {
    route: string;
    viewport: string;
    userAgent: string;
    component: ComponentInfo | null;
    storeSnapshot: Record<string, unknown> | null;
    networkRequests: NetworkRequest[];
    consoleErrors: ConsoleEntry[];
    eventLog: EventLogEntry[];
    autoSeverity: BugSeverity;
}
interface SubmitBugPayload {
    api_key: string;
    base64_image: string;
    shapes: DrawShape[];
    annotations: Record<string, string>;
    description: string;
    tech_context: TechContext;
}

/**
 * collector.ts
 * Automatically collects technical context when a bug is reported.
 * Intercepts fetch/XHR, console errors, and tracks user interactions.
 */

/** Call once when the widget mounts */
declare function initCollector(): void;
/** Collect full tech context at the moment of capture */
declare function collectTechContext(clickedElement?: HTMLElement | null): TechContext;

export { type BugSeverity, BuggyBag, type BuggyBagProps, type ComponentInfo, type ConsoleEntry, type DrawShape, type DrawTool, type EventLogEntry, type NetworkRequest, type SubmitBugPayload, type TechContext, activateFromUrl, collectTechContext, initCollector, isActive };
