// Copies Bootstrap's CSS, bundle JS and licence into docs/dist/vendor/bootstrap (no network).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'node_modules', 'bootstrap');
const to = path.join(root, 'docs', 'dist', 'vendor', 'bootstrap');
fs.mkdirSync(to, { recursive: true });
for (const [src, dest] of [['dist/css/bootstrap.min.css', 'bootstrap.min.css'], ['dist/js/bootstrap.bundle.min.js', 'bootstrap.bundle.min.js'], ['LICENSE', 'LICENSE']]) {
  fs.copyFileSync(path.join(from, src), path.join(to, dest));
}
console.log('bootstrap vendored to docs/dist/vendor/bootstrap');

// Syntax-highlighting themes (the snippets are highlighted at build time; only the token colours are needed).
const hl = path.join(root, 'node_modules', 'highlight.js');
const hlTo = path.join(root, 'docs', 'dist', 'vendor', 'highlightjs');
fs.mkdirSync(hlTo, { recursive: true });
for (const [src, dest] of [['styles/a11y-light.min.css', 'a11y-light.min.css'], ['styles/a11y-dark.min.css', 'a11y-dark.min.css'], ['LICENSE', 'LICENSE']]) {
  fs.copyFileSync(path.join(hl, src), path.join(hlTo, dest));
}
console.log('highlight.js themes vendored to docs/dist/vendor/highlightjs');
