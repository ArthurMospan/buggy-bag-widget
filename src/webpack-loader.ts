import { transformCode } from './lib/transform';
import type { LoaderContext } from 'webpack';

export interface BuggyBagLoaderOptions {
  devOnly?: boolean;
}

export function buggyBagLoader(this: LoaderContext<BuggyBagLoaderOptions>, source: string): string {
  const options = this.getOptions() || {};
  const { devOnly = false } = options;

  if (devOnly && this.mode === 'production') {
    return source;
  }

  const id = this.resourcePath;
  if (id.includes('node_modules')) return source;
  if (!/\.(tsx|jsx|ts)$/.test(id)) return source;

  try {
    return transformCode(source, {
      cwd: process.cwd(), // or this.rootContext if available
      filename: id,
    });
  } catch (e) {
    console.warn(`[buggy-bag] Failed to transform ${id}:`, e);
    return source;
  }
}

export default buggyBagLoader;
