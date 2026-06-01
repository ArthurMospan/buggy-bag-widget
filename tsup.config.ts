import { defineConfig } from 'tsup';
import { writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// Process styles.css with PostCSS/Tailwind and write the result as a TypeScript
// module before tsup/esbuild runs. This sidesteps tsup 8.x's CSS extraction
// pipeline which intercepts .css imports before esbuild plugins can handle them
// (causing styles_default = {} in the bundle instead of the CSS string).
async function generateStyles() {
  const cssPath = path.join(process.cwd(), 'src/styles.css');
  const genPath = path.join(process.cwd(), 'src/styles.gen.ts');
  const source = await readFile(cssPath, 'utf8');
  const result = await postcss([tailwindcss, autoprefixer]).process(source, {
    from: cssPath,
  });
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
    external: ['react', 'react-dom'],
    noExternal: ['html-to-image'],
    esbuildOptions(options, context) {
      if (context.format === 'esm') {
        options.banner = { js: '"use client";' };
      }
    },
  };
});
