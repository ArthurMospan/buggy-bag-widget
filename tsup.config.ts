import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  injectStyle: true,
  external: ['react', 'react-dom'],
  esbuildOptions(options, context) {
    if (context.format === 'esm') {
      options.banner = { js: '"use client";' };
    }
  },
});
