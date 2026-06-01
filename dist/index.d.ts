import * as zustand_middleware from 'zustand/middleware';
import * as zustand from 'zustand';

interface BuggyBagProps {
    apiEndpoint?: string;
    apiKey?: string;
}
declare function BuggyBag({ apiEndpoint, apiKey }?: BuggyBagProps): null;

type DrawTool = 'rect' | 'arrow' | 'pin';
type BugStatus = 'active' | 'fixed' | 'archived';
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
interface Bug {
    id: string;
    screenshotDataUrl: string;
    shapes: DrawShape[];
    annotations: Record<string, string>;
    status: BugStatus;
    createdAt: number;
}

interface BugStore {
    bugs: Bug[];
    addBug: (bug: Bug) => void;
    updateBugStatus: (id: string, status: BugStatus) => void;
    removeBug: (id: string) => void;
}
declare const useBugStore: zustand.UseBoundStore<Omit<zustand.StoreApi<BugStore>, "persist"> & {
    persist: {
        setOptions: (options: Partial<zustand_middleware.PersistOptions<BugStore, {
            bugs: Bug[];
        }>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: BugStore) => void) => () => void;
        onFinishHydration: (fn: (state: BugStore) => void) => () => void;
        getOptions: () => Partial<zustand_middleware.PersistOptions<BugStore, {
            bugs: Bug[];
        }>>;
    };
}>;

export { type Bug, type BugStatus, BuggyBag, type BuggyBagProps, type DrawShape, type DrawTool, useBugStore };
