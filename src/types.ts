export type DrawTool = 'rect' | 'arrow' | 'pin';
export type BugStatus = 'active' | 'fixed' | 'archived';

export interface DrawShape {
  id: string;
  type: DrawTool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[];   // arrow: [x1, y1, x2, y2]
  pinNumber?: number;  // pin label
}

export interface Bug {
  id: string;
  screenshotDataUrl: string;
  shapes: DrawShape[];
  annotations: Record<string, string>; // shapeId → description text
  status: BugStatus;
  createdAt: number;
}
