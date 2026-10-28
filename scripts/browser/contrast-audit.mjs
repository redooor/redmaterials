#!/usr/bin/env node
// Contrast and light-surface audit of the docs in a given {theme} x {colour mode}.
//
//   node scripts/browser/contrast-audit.mjs <file|http|URL> --theme <bootstrap|redmaterials> --mode <light|dark> [--json out.json] [--show N] [--strict-unverified]
//   node scripts/browser/contrast-audit.mjs --selftest
//
// Rules (a regression gate, not a redesign):
//   1. dark must not be worse than light: text that passes in light must pass in dark
//   2. no stray light surfaces in dark (allowlist: docs-src/audit-allowlist.json, each entry with a reason)
//   3. chrome (mobile bar, sidebar, footer, snippets, page prose) must reach 4.5:1 (3:1 large) in the audited mode
// States are exercised first (hover, focus, open dropdown menus). Backgrounds that cannot be modelled (gradients, images,
// opacity ancestors with a background) are reported as UNVERIFIED and need a visual review.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { chromePath, resolveBase, sleep, forEachForcedState, withOverlaysOpen, setDocsState } from './lib/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const flag = n => { const i = argv.indexOf('--' + n); return i < 0 ? undefined : argv[i + 1]; };
const selftest = argv.includes('--selftest');
const mode0 = argv.find(a => !a.startsWith('--') && a !== flag('theme') && a !== flag('mode') && a !== flag('json'));
const theme = flag('theme') || 'redmaterials', colorMode = flag('mode') || 'dark';
if (!['bootstrap', 'redmaterials'].includes(theme) || !['light', 'dark'].includes(colorMode)) { console.error(`invalid --theme (${theme}) or --mode (${colorMode}); use bootstrap|redmaterials and light|dark`); process.exit(2); }
const docsDir = process.env.DOCS_DIR ? path.resolve(process.env.DOCS_DIR) : path.join(root, 'docs');
const engine = fs.readFileSync(path.join(root, 'scripts/browser/lib/contrast-page.js'), 'utf8');
// Chrome = the docs shell plus authored prose that is not itself (or inside) a component
const PROSE = 'h1, h2, h3, h4, h5, h6, p, li, dt, dd, a, small, blockquote';
const EXCLUDE = '.bs-component, .card, .alert, .modal, .well, .navbar, .btn, .list-group, table, .nav, .dropdown-menu, .toast, .popover, .tooltip, .badge, .pagination, .breadcrumb, .accordion, .carousel, .progress, .input-group, .form-text, .corner-ribbon';
const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new', args: ['--no-sandbox'] });

if (selftest) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 6000 });   // tall, so every case is in the viewport (the occlusion check needs that)
  await page.goto(pathToFileURL(path.join(root, 'scripts/browser/fixtures/contrast.html')).href);
  await page.evaluate(engine);
  const opts = { chromeBase: 'nav.sticky-top, #docs-sidebar, footer:not(.blockquote-footer), pre.docs-snippet', prose: PROSE, exclude: EXCLUDE };
  const res = await page.evaluate(() => [...document.querySelectorAll('[data-expect]')].map(el => {
    const kind = el.getAttribute('data-kind') || 'text';
    const r = window.__contrast.auditElement(el).filter(x => x.kind === kind);
    return { id: el.id, expect: el.getAttribute('data-expect'), got: r.length ? r.map(x => x.status).join('+') : 'none', ratio: r.map(x => x.ratio).join('/') };
  }));
  const chromeRes = await page.evaluate(o => [...document.querySelectorAll('[data-chrome]')].map(el => ({ id: el.id, expect: el.getAttribute('data-chrome'), got: window.__contrast.isChrome(el, o) ? 'yes' : 'no' })), opts);
  const surf = await page.evaluate(() => window.__contrast.lightSurfaces(document.getElementById('dark-zone'), ['.bg-white']).map(x => x.key));
  const surfRes = [{ id: 'allowlist exempts only the paint owner', expect: 'child flagged, owner not', got: surf.some(k => /div>div$/.test(k) && surf.length === 1) ? 'child flagged, owner not' : JSON.stringify(surf) }];
  let bad = 0;
  for (const r of [...res, ...chromeRes, ...surfRes]) { const ok = r.got === r.expect; if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'} ${r.id}: expected ${r.expect}, got ${r.got}${r.ratio ? ' (' + r.ratio + ')' : ''}`); }
  await browser.close();
  console.log(`\n${res.length + chromeRes.length + surfRes.length - bad}/${res.length + chromeRes.length + surfRes.length} selftest cases correct`);
  process.exit(bad ? 1 : 0);
}

// ---------------------------------------------------------------- audit of the docs
if (!mode0) { console.error('usage: contrast-audit.mjs <file|http|URL> --theme <bootstrap|redmaterials> --mode <light|dark> | --selftest'); process.exit(2); }
const { base, close: closeServer } = await resolveBase(mode0, docsDir);
const allow = JSON.parse(fs.readFileSync(path.join(root, 'docs-src/audit-allowlist.json'), 'utf8'));
for (const e of allow.lightSurfaces) if (!e.reason) { console.error('allowlist entry without a reason:', e.selector); process.exit(2); }
const allowSelectors = allow.lightSurfaces.map(e => e.selector);
const OPTS = { chromeBase: 'nav.sticky-top, #docs-sidebar, footer:not(.blockquote-footer), pre.docs-snippet', prose: PROSE, exclude: EXCLUDE };
const PAGES = ['index.html', 'redmaterials.html'];
const WIDTHS = (flag('widths') || '1280,360').split(',').map(Number);

// Collects every audited record for one colour mode: default state, open dropdown menus, open tooltips and popovers, and every
// distinct variant of the interactive components under forced :hover, :focus, :active and :focus-visible.
async function collect(page, cdp, mode) {
  await setDocsState(page, theme, mode);
  await sleep(300);
  const results = [], stray = [];
  const add = (arr, state) => arr.forEach(r => results.push({ ...r, key: r.key + (state ? '|' + state : ''), state: state || 'default' }));
  const addStray = (arr, state) => arr.forEach(r => stray.push({ ...r, key: r.key + '|' + state, state }));
  const audit = sel => page.evaluate((s, o) => window.__contrast.auditTree(document.querySelector(s), o), sel, OPTS);

  add(await audit('body'), '');
  if (mode === 'dark') addStray(await page.evaluate(a => window.__contrast.lightSurfaces(document.body, a), allowSelectors), 'default');

  await page.evaluate(() => document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('show')));
  add(await page.evaluate(o => [...document.querySelectorAll('.dropdown-menu.show')].flatMap(m => window.__contrast.auditTree(m, o)), OPTS), 'open');
  if (mode === 'dark') addStray(await page.evaluate(a => [...document.querySelectorAll('.dropdown-menu.show')].flatMap(m => window.__contrast.lightSurfaces(m, a)), allowSelectors), 'open');
  await page.evaluate(() => document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show')));

  await withOverlaysOpen(page, async () => {
    add(await page.evaluate(o => [...document.querySelectorAll('.tooltip.show, .popover.show')].flatMap(m => window.__contrast.auditTree(m, o)), OPTS), 'overlay');
    if (mode === 'dark') addStray(await page.evaluate(a => [...document.querySelectorAll('.tooltip.show, .popover.show')].flatMap(m => window.__contrast.lightSurfaces(m, a)), allowSelectors), 'overlay');
  });

  await forEachForcedState(cdp, page, async (state, objectId, pick) => {
    const r = await cdp.send('Runtime.callFunctionOn', { objectId, functionDeclaration: 'function(o){ return window.__contrast.auditTree(this, o); }', arguments: [{ value: OPTS }], returnByValue: true });
    add(r.result.value || [], `${state}@${pick}`);
    if (mode === 'dark') {
      const sr = await cdp.send('Runtime.callFunctionOn', { objectId, functionDeclaration: 'function(a){ return window.__contrast.lightSurfaces(this, a); }', arguments: [{ value: allowSelectors }], returnByValue: true });
      addStray(sr.result.value || [], `${state}@${pick}`);
    }
  });
  return { results, stray };
}

const summary = { low: [], worse: [], stray: [], unverified: [], checked: 0 };
const seen = new Set();
for (const width of WIDTHS) {
  for (const file of PAGES) {
    const where0 = `${file}@${width}`;
    const page = await browser.newPage();
    await page.setViewport({ width, height: width >= 1000 ? 16000 : 12000 });   // tall, so the occlusion check sees the whole page
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    const c0 = await page.createCDPSession();
    try { await c0.send('Storage.clearDataForOrigin', { origin: base.startsWith('file:') ? 'file://' : new URL(base).origin, storageTypes: 'local_storage,session_storage' }); } catch (e) { /* best effort */ }
    await c0.detach();
    await page.goto(base + file, { waitUntil: 'networkidle0' });
    // freeze animations and transitions so computed colours are final and repeatable (test harness only)
    await page.addStyleTag({ content: '*, *::before, *::after, *::file-selector-button, *::-webkit-slider-thumb { animation: none !important; transition: none !important; }' });
    await page.addScriptTag({ content: engine });
    const cdp = await page.createCDPSession();
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const light = await collect(page, cdp, 'light');
    const cur = colorMode === 'light' ? light : await collect(page, cdp, colorMode);
    // forced-state keys carry the sample's stable pick index, so the light and the current pass identify the same target
    const stable = k => k;
    const lightByKey = new Map(light.results.map(r => [r.key, r]));
    for (const r of cur.results) {
      summary.checked++;
      const where = `${where0}#${r.section} ${stable(r.key)}`;
      if (r.status === 'unverified') { summary.unverified.push({ where, comp: r.comp, text: r.text, reason: r.reason, state: r.state, kind: r.kind }); continue; }
      const id = where + '|' + r.status;
      if (r.chrome && r.status === 'low' && !seen.has(id)) { seen.add(id); summary.low.push({ rule: 3, where, ...pick(r) }); }
      if (colorMode === 'dark') {
        const l = lightByKey.get(stable(r.key));
        if (l && l.status === 'ok' && r.status === 'low' && !seen.has('w' + id)) { seen.add('w' + id); summary.worse.push({ rule: 1, where, ...pick(r), lightRatio: l.ratio }); }
      }
    }
    for (const s of cur.stray) { const id = `${where0} ${stable(s.key)}`; if (!seen.has('s' + id)) { seen.add('s' + id); summary.stray.push({ rule: 2, where: `${where0}#${s.section} ${stable(s.key)}`, comp: s.comp, tag: s.tag, cls: s.cls, bg: s.bg, state: s.state }); } }
    await page.close();
  }
}
function pick(r) { return { comp: r.comp, kind: r.kind, text: r.text, tag: r.tag, cls: r.cls, ratio: r.ratio, need: r.need, fg: r.fg, bg: r.bg, state: r.state }; }

if (flag('json')) fs.writeFileSync(flag('json'), JSON.stringify(summary, null, 1));
const byComp = list => { const g = {}; for (const x of list) g[x.comp || '?'] = (g[x.comp || '?'] || 0) + 1; return Object.fromEntries(Object.entries(g).sort((a, b) => b[1] - a[1])); };
// Only the Redmaterials theme is ours to fix: in "bootstrap" mode rules 1 and 2 describe Bootstrap's own dark palette and are
// informational; rule 3 (the docs chrome, which we author) gates in both themes.
const gating = theme === 'redmaterials';
const strict = argv.includes('--strict-unverified');
console.log(`audit ${theme} x ${colorMode} (widths ${WIDTHS.join(', ')}): ${summary.checked} text, value, placeholder and generated-text checks; ${summary.unverified.length} UNVERIFIED (need visual review${strict ? '; failing: --strict-unverified' : ''})`);
console.log(`rule 1 (dark worse than light)${gating ? '' : ' [informational]'}: ${summary.worse.length}  ${JSON.stringify(byComp(summary.worse))}`);
console.log(`rule 2 (stray light surfaces)${gating ? '' : ' [informational]'}:  ${summary.stray.length}  ${JSON.stringify(byComp(summary.stray))}`);
console.log(`rule 3 (chrome below AA):       ${summary.low.length}  ${JSON.stringify(byComp(summary.low))}`);
const reasons = {}; for (const u of summary.unverified) reasons[u.reason] = (reasons[u.reason] || 0) + 1;
if (summary.unverified.length) console.log(`unverified by reason: ${JSON.stringify(reasons)}`);
for (const x of [...summary.low, ...summary.worse, ...summary.stray].slice(0, +(flag('show') || 12))) console.log('  -', JSON.stringify(x).slice(0, 230));
await browser.close();
closeServer();
process.exit(summary.low.length + (gating ? summary.worse.length + summary.stray.length : 0) + (strict ? summary.unverified.length : 0) ? 1 : 0);
