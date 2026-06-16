import type { Plugin } from 'vite';
import { transformCode } from './lib/transform';
import path from 'path';

export interface BuggyBagPluginOptions {
  include?: string[];
  exclude?: string[];
  devOnly?: boolean;
}

export function buggyBagPlugin(options: BuggyBagPluginOptions = {}): Plugin {
  const { devOnly = false } = options;

  return {
    name: 'vite-plugin-buggy-bag',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (devOnly && process.env.NODE_ENV === 'production') {
        return null;
      }

      if (id.includes('node_modules')) return null;
      if (!/\.(tsx|jsx|ts)$/.test(id)) return null;

      try {
        const transformed = transformCode(code, {
          cwd: process.cwd(),
          filename: id,
        });
        return {
          code: transformed,
          map: null, // Keep it simple, or generate map from Babel if needed
        };
      } catch (e) {
        console.warn(`[buggy-bag] Failed to transform ${id}:`, e);
        return null;
      }
    }
  };
}
