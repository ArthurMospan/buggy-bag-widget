import { defineConfig } from 'tsup';
import { writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

async function generateStyles() {
  const cssPath = path.join(process.cwd(), 'src/styles.css');
  const genPath = path.join(process.cwd(), 'src/styles.gen.ts');
  const source = await readFile(cssPath, 'utf8');
  const result = await postcss([tailwindcss, autoprefixer]).process(source, { from: cssPath });
  writeFileSync(genPath, `const styles = ${JSON.stringify(result.css)};\nexport default styles;\n`);
}

export default defineConfig(async () => {
  await generateStyles();
  return [
    {
      entry: ['src/index.ts'],
      format: ['cjs', 'esm'],
      dts: true,
      sourcemap: true,
      clean: true,
      platform: 'browser',
      external: ['react', 'react-dom'],
      noExternal: ['html-to-image', 'konva', 'react-konva'],
      esbuildOptions(options, context) {
        options.conditions = ['browser'];
        if (context.format === 'esm') {
          options.banner = { js: '"use client";' };
        }
      },
    },
    {
      entry: {
        'buggy-bag-standalone': 'src/standalone.tsx'
      },
      format: ['iife'],
      globalName: 'BuggyBagStandalone',
      sourcemap: true,
      clean: false,
      minify: true,
      platform: 'browser',
      external: [],
      noExternal: ['react', 'react-dom', 'html-to-image', 'konva', 'react-konva', 'zustand', 'lucide-react'],
      esbuildOptions(options) {
        options.conditions = ['browser'];
        options.define = {
          'process.env.NODE_ENV': '"production"'
        };
      },
      onSuccess: async () => {
        const { copyFileSync, existsSync, mkdirSync } = await import('fs');
        const path = await import('path');
        const src = path.join(process.cwd(), 'dist/buggy-bag-standalone.global.js');
        const dest = path.join(process.cwd(), '../buggy-bag-portal/public/buggy-bag-standalone.js');
        try {
          if (existsSync(src)) {
            copyFileSync(src, dest);
            console.log('Successfully copied buggy-bag-standalone.js to portal public directory');
          }
        } catch (e) {
          console.error('Failed to copy standalone file', e);
        }
      }
    }
  ];
});
