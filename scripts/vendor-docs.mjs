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
