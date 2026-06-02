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
  return {
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
  };
});
