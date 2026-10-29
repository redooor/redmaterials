#!/usr/bin/env node
// Class inventory audit for the docs: every class Redmaterials defines, whether the built docs use it in a live
// .bs-component example, and whether Bootstrap already defines it (restyled) or Redmaterials adds it.
// The report is an audit aid, not a gate: the CLI always exits 0.
//
//   node scripts/audit-classes.mjs
//
// Writes the same report to audit-report.txt in the repository root.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS_FILE = path.join(root, 'dist/css/redmaterials.css');
const BOOTSTRAP_DIR = path.join(root, 'docs/dist/vendor/bootstrap');
const EXCLUSIONS_FILE = path.join(root, 'docs-src/audit-exclusions.json');
const REPORT_FILE = path.join(root, 'audit-report.txt');
const DOCS_PAGES = ['index.html', 'redmaterials.html'].map(file => path.join(root, 'docs', file));

// Remove :not(...) arguments first: `.a:not(.b)` defines only `a`. Repeated passes handle nested :not().
function stripNotArguments(selector) {
  let out = selector;
  for (;;) {
    const next = out.replace(/:not\([^()]*\)/gi, '');
    if (next === out) return out;
    out = next;
  }
}

export function extractClassesFromSelector(selector) {
  const cleaned = stripNotArguments(selector)
    .replace(/\[(?:[^\]"']|"[^"]*"|'[^']*')*\]/g, '') // attribute selectors; quoted values may contain ] or .x
    .replace(/::?[-\w]+/g, '');                        // pseudo-element/pseudo-class names
  const classes = new Set();
  for (const match of cleaned.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) classes.add(match[1]);
  return classes;
}

// postcss walks rules nested in @media/@supports as well as top-level rules.
export function collectClassesFromCss(cssText) {
  const classes = new Set();
  postcss.parse(cssText).walkRules(rule => {
    for (const cls of extractClassesFromSelector(rule.selector)) classes.add(cls);
  });
  return classes;
}

const EXAMPLE_START = '<div class="bs-component';
// Comments, opening <div> tags with quoted attributes, and closing </div> tags. A quoted ">" must not end a tag.
const DIV_TAG = /<!--[\s\S]*?-->|<div\b(?:[^>"']|"[^"]*"|'[^']*')*>|<\/div\s*>/gi;

function findTagEnd(html, from) {
  let quote = null;
  for (let i = from; i < html.length; i += 1) {
    const ch = html[i];
    if (quote) {
      if (ch === quote && html[i - 1] !== '\\') quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i;
    }
  }
  return -1;
}

// Match the wrapper's own closing </div>, so nested divs and prose after the example stay out of the scan.
function findMatchingDivClose(html, from) {
  DIV_TAG.lastIndex = from;
  let depth = 1;
  let match;
  while ((match = DIV_TAG.exec(html))) {
    if (match[0].startsWith('<!--')) continue;
    if (match[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0) return match.index;
    } else {
      depth += 1;
    }
  }
  return -1;
}

export function extractLiveExampleClasses(html) {
  const classes = new Set();
  // Snippets are escaped copies of examples. Splitting on the snippet boundary keeps their class="" text out.
  const chunks = html.split(/<pre\s+class="docs-snippet/);
  for (const chunk of chunks) {
    let cursor = 0;
    for (;;) {
      const start = chunk.indexOf(EXAMPLE_START, cursor);
      if (start === -1) break;
      const openEnd = findTagEnd(chunk, start);
      if (openEnd === -1) break;
      const close = findMatchingDivClose(chunk, openEnd + 1);
      const body = chunk.slice(openEnd + 1, close === -1 ? chunk.length : close);
      for (const match of body.matchAll(/class\s*=\s*"([^"]*)"/g)) {
        for (const cls of match[1].split(/\s+/)) if (cls) classes.add(cls);
      }
      cursor = close === -1 ? chunk.length : close + '</div>'.length;
    }
  }
  return classes;
}

function kindOf(cls, bootstrapClasses) {
  return bootstrapClasses.has(cls) ? 'restyled' : 'added';
}

function readBootstrapClasses() {
  const expanded = path.join(BOOTSTRAP_DIR, 'bootstrap.css');
  const file = fs.existsSync(expanded) ? expanded : path.join(BOOTSTRAP_DIR, 'bootstrap.min.css');
  if (!fs.existsSync(file)) return new Set();
  return collectClassesFromCss(fs.readFileSync(file, 'utf8'));
}

function readExclusions() {
  if (!fs.existsSync(EXCLUSIONS_FILE)) return [];
  const list = JSON.parse(fs.readFileSync(EXCLUSIONS_FILE, 'utf8'));
  if (!Array.isArray(list)) throw new Error('docs-src/audit-exclusions.json must be an array');
  for (const entry of list) {
    const valid = entry && typeof entry.class === 'string' && entry.class
      && typeof entry.reason === 'string' && entry.reason.trim();
    if (!valid) throw new Error(`invalid exclusion entry: ${JSON.stringify(entry)}`);
  }
  return list;
}

async function loadSourceLookup(cssFile) {
  const mapFile = `${cssFile}.map`;
  if (!fs.existsSync(mapFile)) return null;
  let SourceMapConsumer;
  for (const pkg of ['source-map', 'source-map-js']) {
    try {
      const mod = await import(pkg);
      SourceMapConsumer = mod.SourceMapConsumer || (mod.default && mod.default.SourceMapConsumer);
      if (SourceMapConsumer) break;
    } catch {
      // Try the next available source-map implementation.
    }
  }
  if (!SourceMapConsumer) return null;
  const consumer = await new SourceMapConsumer(JSON.parse(fs.readFileSync(mapFile, 'utf8')));
  return ({ line, column }) => {
    const pos = consumer.originalPositionFor({ line, column: Math.max(0, column - 1) });
    if (!pos || !pos.source) return null;
    // The map lives in dist/css, so its sources are ../../scss/...; report repository-relative paths.
    const source = pos.source.replace(/\\/g, '/').replace(/^(?:\.\.\/)+/, '');
    return source === 'redmaterials.css' ? 'dist/css/redmaterials.css' : source;
  };
}

function collectClassInfo(cssText, sourceFor) {
  const info = new Map();
  postcss.parse(cssText).walkRules(rule => {
    const names = extractClassesFromSelector(rule.selector);
    if (!names.size) return;
    const source = sourceFor ? sourceFor(rule.source.start) : null;
    for (const cls of names) {
      let entry = info.get(cls);
      if (!entry) info.set(cls, entry = { sources: [], exact: null });
      if (!source) continue;
      if (!entry.sources.includes(source)) entry.sources.push(source);
      // Prefer the standalone `.class` rule over a compound selector elsewhere (for example `.btn .ink`).
      if (!entry.exact && rule.selector.trim() === `.${cls}`) entry.exact = source;
    }
  });
  const result = new Map();
  for (const [cls, entry] of info) result.set(cls, entry.exact || entry.sources[0] || null);
  return result;
}

function readLiveExampleClasses() {
  const classes = new Set();
  for (const file of DOCS_PAGES) {
    if (!fs.existsSync(file)) continue;
    for (const cls of extractLiveExampleClasses(fs.readFileSync(file, 'utf8'))) classes.add(cls);
  }
  return classes;
}

function buildReport({ info, bootstrapClasses, used, exclusions, hasSource }) {
  const exclusionByClass = new Map(exclusions.map(entry => [entry.class, entry]));
  const excluded = [];
  const unused = [];
  let usedCount = 0;
  for (const [cls, source] of info) {
    const exclusion = exclusionByClass.get(cls);
    if (exclusion) {
      excluded.push({ cls, source, kind: kindOf(cls, bootstrapClasses), reason: exclusion.reason });
    } else if (used.has(cls)) {
      usedCount += 1;
    } else {
      unused.push({ cls, source, kind: kindOf(cls, bootstrapClasses) });
    }
  }

  const lines = [
    'Redmaterials class inventory audit',
    '',
    `total classes: ${info.size}`,
    `used: ${usedCount}`,
    `unused: ${unused.length}`,
    `excluded: ${excluded.length}`,
    '',
  ];

  if (!unused.length) {
    lines.push('No unused classes.', '');
  } else {
    lines.push('Unused classes (not used in a live .bs-component example and not excluded):', '');
    if (hasSource) {
      const bySource = new Map();
      for (const row of unused) {
        const key = row.source || '(source unavailable)';
        if (!bySource.has(key)) bySource.set(key, []);
        bySource.get(key).push(row);
      }
      for (const source of [...bySource.keys()].sort((a, b) => a.localeCompare(b))) {
        lines.push(source);
        for (const row of bySource.get(source).sort((a, b) => a.cls.localeCompare(b.cls))) {
          lines.push(`  ${row.cls}  ${row.kind}  ${row.source || '(unknown)'}`);
        }
        lines.push('');
      }
    } else {
      for (const row of unused.sort((a, b) => a.cls.localeCompare(b.cls))) lines.push(`${row.cls}  ${row.kind}`);
      lines.push('');
    }
  }

  lines.push('Excluded classes (runtime-only, verified in source):');
  if (!excluded.length) {
    lines.push('  (none)');
  } else {
    for (const row of excluded.sort((a, b) => a.cls.localeCompare(b.cls))) {
      const source = hasSource ? `  ${row.source || '(unknown)'}` : '';
      lines.push(`  ${row.cls}  ${row.kind}${source}  - ${row.reason}`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const css = fs.readFileSync(CSS_FILE, 'utf8');
  const sourceFor = await loadSourceLookup(CSS_FILE);
  const info = collectClassInfo(css, sourceFor);
  const report = buildReport({
    info,
    bootstrapClasses: readBootstrapClasses(),
    used: readLiveExampleClasses(),
    exclusions: readExclusions(),
    hasSource: Boolean(sourceFor),
  });
  process.stdout.write(report);
  fs.writeFileSync(REPORT_FILE, report);
  process.exitCode = 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`audit-classes: ${error.message}`);
    process.exitCode = 0; // an audit aid, not a gate
  });
}
