const fs = require('node:fs');
const path = require('node:path');

const packageRoot = path.dirname(require.resolve('html2canvas/package.json'));
const packageJson = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
);

if (packageJson.version !== '1.4.1') {
  throw new Error(
    `Expected html2canvas 1.4.1, found ${packageJson.version}. Review the mask patch before upgrading.`,
  );
}

const patches = [
  {
    file: 'dist/html2canvas.js',
    before: 'this.formatPath(paths.slice(0).reverse());',
    after: 'this.formatPath(paths.slice(0).reverse().map(function (path) { return isBezierCurve(path) ? path.reverse() : path; }));',
  },
  {
    file: 'dist/html2canvas.esm.js',
    before: 'this.formatPath(paths.slice(0).reverse());',
    after: 'this.formatPath(paths.slice(0).reverse().map(function (path) { return isBezierCurve(path) ? path.reverse() : path; }));',
  },
  {
    file: 'dist/lib/render/canvas/canvas-renderer.js',
    before: 'this.formatPath(paths.slice(0).reverse());',
    after: 'this.formatPath(paths.slice(0).reverse().map(function (path) { return bezier_curve_1.isBezierCurve(path) ? path.reverse() : path; }));',
  },
];

for (const patch of patches) {
  const filePath = path.join(packageRoot, patch.file);
  const source = fs.readFileSync(filePath, 'utf8');
  if (source.includes(patch.after)) continue;

  const occurrences = source.split(patch.before).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `Could not safely patch ${patch.file}: expected one mask path, found ${occurrences}.`,
    );
  }

  fs.writeFileSync(filePath, source.replace(patch.before, patch.after));
}
