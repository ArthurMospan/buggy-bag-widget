import { defineConfig } from 'tsup';
import type { Plugin } from 'esbuild';
import { readFile } from 'fs/promises';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// Intercepts every .css import and returns the PostCSS-processed result as a
// JS string export so the widget can inject it into its shadow root at runtime.
const cssToStringPlugin: Plugin = {
  name: 'css-to-string',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async ({ path: filePath }) => {
      const source = await readFile(filePath, 'utf8');
      const result = await postcss([tailwindcss, autoprefixer]).process(source, {
        from: filePath,
      });
      return {
        contents: `export default ${JSON.stringify(result.css)}`,
        loader: 'js',
      };
    });
  },
};

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  esbuildPlugins: [cssToStringPlugin],
  esbuildOptions(options, context) {
    if (context.format === 'esm') {
      options.banner = { js: '"use client";' };
    }
  },
});
