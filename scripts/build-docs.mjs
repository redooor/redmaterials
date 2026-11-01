import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import hljs from 'highlight.js';

export const COLORS = ['red', 'pink', 'purple', 'deep-purple', 'indigo', 'blue', 'light-blue', 'cyan', 'teal',
  'green', 'light-green', 'lime', 'yellow', 'amber', 'orange', 'deep-orange', 'brown', 'grey', 'blue-grey'];

export function expandIncludes(html, readPartial, stack = []) {
  return html.replace(/<!--@include\s+(\S+?)\s*-->/g, (_, file) => {
    if (stack.includes(file)) throw new Error(`include cycle: ${[...stack, file].join(' -> ')}`);
    const body = readPartial(file);
    if (body === undefined) throw new Error(`missing partial: ${file}`);
    return expandIncludes(body, readPartial, [...stack, file]);
  });
}

// <!--@each-color …--> repeats over the 19 palette colours; <!--@each-color+default …--> also includes `default` first.
// A template written as a block (starting on the line after the marker, indented like the marker) keeps the author's
// indentation in every copy: the first copy borrows the marker's own indentation, the others carry theirs, and no
// blank lines are left between copies, so the copyable snippet stays tidy.
export function expandColors(html) {
  return html.replace(/<!--@each-color(\+default)?([ \t]*\n[ \t]*|\s+)([\s\S]*?)-->/g, (_, withDefault, gap, tpl) => {
    const block = gap.includes('\n');
    const indent = block ? gap.slice(gap.lastIndexOf('\n') + 1) : '';
    return (withDefault ? ['default', ...COLORS] : COLORS)
      .map((c, i) => (block && i > 0 ? indent : '') + tpl.replace(/\{color\}/g, c).trimEnd())
      .join('\n');
  });
}

export function expandInline(html, readFile) {
  return html.replace(/<!--@inline\s+(\S+?)\s*-->/g, (_, file) => {
    const body = readFile(file);
    if (body === undefined) throw new Error(`missing inline file: ${file}`);
    return `<script>${body}</script>`;
  });
}

// Any directive prefix still present after every expansion is a malformed or unsupported marker (missing <!--@end-->,
// unterminated marker, unsupported attribute, typo): fail the build instead of publishing it. Snippet bodies are
// escaped by then, so a raw <!--@ can only be a leftover.
export function assertNoDirectives(html, where) {
  const m = html.match(/<!--@[\w-]+/);
  if (m) throw new Error(`unconsumed directive in ${where}: ${html.slice(m.index, m.index + 60)}`);
}

export function expandVersion(html, version) {
  return html.replace(/(\\)?\{\{version\}\}/g, (m, esc) => esc ? '{{version}}' : version);
}

const escapeHtml = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dedent = s => {
  const lines = s.replace(/^\n+|\s+$/g, '').split('\n');
  const sized = lines.filter(l => l.trim());
  const indent = sized.length ? Math.min(...sized.map(l => l.match(/^ */)[0].length)) : 0;
  return lines.map(l => l.slice(indent)).join('\n');
};
// Highlighted at build time (no runtime script). The code element deliberately lacks the `hljs` class: that class
// carries the theme's own background and text colour, so only the token colours (hljs-*) apply on Bootstrap's surface.
const LANGUAGES = ['xml', 'javascript', 'css', 'scss', 'bash', 'json'];
const snippet = inner => `<pre class="docs-snippet border rounded p-3 mb-3 bg-body overflow-auto"><code>${hljs.highlightAuto(dedent(inner), LANGUAGES).value}</code></pre>`;

export function expandExamples(html) {
  return html
    .replace(/<!--@example((?:\s+class="[^">]*")?)\s*-->([\s\S]*?)<!--@end-->/g, (_, attrs, inner) => {
      const cls = (attrs.match(/class="([^"]*)"/) || [, ''])[1];
      return `<div class="bs-component border rounded p-3 mb-3${cls ? ' ' + cls : ''}">${inner}</div>\n${snippet(inner)}`;
    })
    .replace(/<!--@code\s*-->([\s\S]*?)<!--@end-->/g, (_, inner) => snippet(inner));
}

// The sidebar is Bootstrap's own `nav`, themed by Redmaterials: no docs CSS. The first section starts as the static
// active default; docs.js keeps the active styling (bold + aria-current) in step with scrollspy as the reader scrolls.
export function renderSidebar(sections) {
  const links = sections.redmaterials.map((s, i) => {
    const active = i === 0;
    return `<li class="nav-item"><a class="nav-link link-body-emphasis${active ? ' active fw-bold' : ''}" href="#${s.id}"${active ? ' aria-current="location"' : ''}>${s.title}</a></li>`;
  }).join('\n');
  return `<ul class="nav flex-column" id="nav_spy">\n${links}\n</ul>`;
}

// {{root}} is '' (pages live next to dist/ and assets/), so every asset URL is relative and works from file://.
export function build({ srcDir, outDir, pkg }) {
  const read = f => { try { return fs.readFileSync(path.join(srcDir, f), 'utf8').replace(/\r\n/g, '\n'); } catch { return undefined; } };
  const sections = JSON.parse(read('sections.json'));
  const render = (file, root) => {
    const src = read(file);
    if (src === undefined) throw new Error(`missing page: ${file}`);
    let html = expandIncludes(src, read);
    html = expandVersion(expandColors(html), pkg.version).replace(/\{\{root\}\}/g, root);
    html = expandExamples(expandInline(html, read));
    html = html.replace(/<!--@sidebar\s*-->/g, renderSidebar(sections));
    assertNoDirectives(html, file);
    return html;
  };
  fs.writeFileSync(path.join(outDir, 'index.html'), render('pages/index.html', ''));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  build({ srcDir: path.join(root, 'docs-src'), outDir: path.join(root, 'docs'),
          pkg: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) });
  console.log('docs built');
}
