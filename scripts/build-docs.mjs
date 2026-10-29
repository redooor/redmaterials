import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
export function expandColors(html) {
  return html.replace(/<!--@each-color(\+default)?\s+([\s\S]*?)-->/g, (_, withDefault, tpl) =>
    (withDefault ? ['default', ...COLORS] : COLORS).map(c => tpl.replace(/\{color\}/g, c)).join('\n'));
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
const snippet = inner => `<pre class="docs-snippet border rounded p-3 mb-3 bg-body-tertiary overflow-auto"><code>${escapeHtml(dedent(inner))}</code></pre>`;

export function expandExamples(html) {
  return html
    .replace(/<!--@example((?:\s+class="[^">]*")?)\s*-->([\s\S]*?)<!--@end-->/g, (_, attrs, inner) => {
      const cls = (attrs.match(/class="([^"]*)"/) || [, ''])[1];
      return `<div class="bs-component border rounded p-3 mb-3${cls ? ' ' + cls : ''}">${inner}</div>\n${snippet(inner)}`;
    })
    .replace(/<!--@code\s*-->([\s\S]*?)<!--@end-->/g, (_, inner) => snippet(inner));
}

// The current page's links live in #nav_spy (the Bootstrap scrollspy target); links to the other
// page sit in a second list OUTSIDE it, so scrollspy can never match a same-named hash on the other page.
// Markup is Bootstrap's own `nav` (stock Bootstrap in "Bootstrap" mode, themed by Redmaterials otherwise): no docs CSS.
export function renderSidebar(sections, page) {
  const other = page === 'bootstrap' ? 'redmaterials' : 'bootstrap';
  const otherPage = other === 'bootstrap' ? 'index.html' : 'redmaterials.html';
  const label = n => n === 'bootstrap' ? 'Bootstrap' : 'Redmaterials';
  const head = n => `<li class="nav-item px-3 pt-3 text-uppercase fw-bold small text-body-secondary">${label(n)}</li>`;
  // The current page starts at its first section, so that link is the static active default. docs.js keeps the
  // active styling (bold + aria-current) in step with scrollspy as the reader scrolls.
  const links = (name, prefix) => sections[name].map((s, i) => {
    const active = name === page && i === 0;
    return `<li class="nav-item"><a class="nav-link link-body-emphasis${active ? ' active fw-bold' : ''}" href="${prefix}#${s.id}"${active ? ' aria-current="location"' : ''}>${s.title}</a></li>`;
  }).join('\n');
  return `<ul class="nav flex-column" id="nav_spy">\n${head(page)}\n${links(page, '')}\n</ul>\n`
    + `<ul class="nav flex-column">\n${head(other)}\n${links(other, otherPage)}\n</ul>`;
}

// {{root}} is '' (pages live next to dist/ and assets/), so every asset URL is relative and works from file://.
export function build({ srcDir, outDir, pkg }) {
  const read = f => { try { return fs.readFileSync(path.join(srcDir, f), 'utf8').replace(/\r\n/g, '\n'); } catch { return undefined; } };
  const sections = JSON.parse(read('sections.json'));
  const render = (file, root, page) => {
    const src = read(file);
    if (src === undefined) throw new Error(`missing page: ${file}`);
    let html = expandIncludes(src, read);
    html = expandVersion(expandColors(html), pkg.version).replace(/\{\{root\}\}/g, root);
    html = expandExamples(expandInline(html, read));
    if (page) html = html.replace(/<!--@sidebar\s*-->/g, renderSidebar(sections, page));
    assertNoDirectives(html, file);
    return html;
  };
  for (const page of ['index', 'redmaterials']) {
    fs.writeFileSync(path.join(outDir, `${page}.html`), render(`pages/${page}.html`, '', page === 'index' ? 'bootstrap' : 'redmaterials'));
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  build({ srcDir: path.join(root, 'docs-src'), outDir: path.join(root, 'docs'),
          pkg: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) });
  console.log('docs built');
}
