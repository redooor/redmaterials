#!/usr/bin/env node
// Contrast and light-surface audit of the docs in a given {theme} x {colour mode}.
//
//   node scripts/browser/contrast-audit.mjs <file|http|URL> --theme <bootstrap|redmaterials> --mode <light|dark> [--json out.json]
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
import { chromePath, resolveBase, sleep, forEachForcedState } from './lib/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const flag = n => { const i = argv.indexOf('--' + n); return i < 0 ? undefined : argv[i + 1]; };
const selftest = argv.includes('--selftest');
const mode0 = argv.find(a => !a.startsWith('--') && a !== flag('theme') && a !== flag('mode') && a !== flag('json'));
const theme = flag('theme') || 'redmaterials', colorMode = flag('mode') || 'dark';
const docsDir = process.env.DOCS_DIR ? path.resolve(process.env.DOCS_DIR) : path.join(root, 'docs');
const engine = fs.readFileSync(path.join(root, 'scripts/browser/lib/contrast-page.js'), 'utf8');
const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new', args: ['--no-sandbox'] });

if (selftest) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(path.join(root, 'scripts/browser/fixtures/contrast.html')).href);
  await page.evaluate(engine);
  const res = await page.evaluate(() => [...document.querySelectorAll('[data-expect]')].map(el => {
    const r = window.__contrast.auditElement(el);
    return { id: el.id, expect: el.getAttribute('data-expect'), got: r.length ? r.map(x => x.status).join('+') : 'none', ratio: r.map(x => x.ratio).join('/') };
  }));
  let bad = 0;
  for (const r of res) { const ok = r.got === r.expect; if (!ok) bad++; console.log(`${ok ? 'PASS' : 'FAIL'} ${r.id}: expected ${r.expect}, got ${r.got} (${r.ratio})`); }
  await browser.close();
  console.log(`\n${res.length - bad}/${res.length} selftest cases correct`);
  process.exit(bad ? 1 : 0);
}

// ---------------------------------------------------------------- audit of the docs
if (!mode0) { console.error('usage: contrast-audit.mjs <file|http|URL> --theme <bootstrap|redmaterials> --mode <light|dark> | --selftest'); process.exit(2); }
const { base, close: closeServer } = await resolveBase(mode0, docsDir);

const allow = JSON.parse(fs.readFileSync(path.join(root, 'docs-src/audit-allowlist.json'), 'utf8'));
for (const e of allow.lightSurfaces) if (!e.reason) { console.error('allowlist entry without a reason:', e.selector); process.exit(2); }
const allowSelectors = allow.lightSurfaces.map(e => e.selector);
const CHROME = 'nav.sticky-top, #docs-sidebar, footer:not(.blockquote-footer), pre.docs-snippet, main :is(h1,h2,h3,p,li,dt,dd):not(.bs-component *):not(.card *):not(.alert *):not(.modal *):not(.well *):not(.navbar *):not(.btn *):not(.list-group *):not(table *):not(.nav *):not(.dropdown-menu *):not(.toast *):not(.popover *):not(.tooltip *)';
const PAGES = ['index.html', 'redmaterials.html'];
async function collect(page, cdp, colorModeName) {
  await page.evaluate(m => docsState.set({ mode: m }), colorModeName);
  await sleep(400);
  const out = [];
  const add = (arr, state) => arr.forEach(r => out.push({ ...r, key: r.key + (state ? '|' + state : ''), state: state || 'default' }));
  add(await page.evaluate(sel => window.__contrast.auditTree(document.body, sel), CHROME), '');
  // open dropdown menus
  await page.evaluate(() => document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('show')));
  add(await page.evaluate(sel => [...document.querySelectorAll('.dropdown-menu.show')].flatMap(m => window.__contrast.auditTree(m, sel)), CHROME), 'open');
  await page.evaluate(() => document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show')));
  // forced pseudo states on a sample of interactive elements
  await forEachForcedState(cdp, async (label, objectId) => {
    const r = await cdp.send('Runtime.callFunctionOn', { objectId, functionDeclaration: 'function(sel){ return window.__contrast.auditTree(this, sel); }', arguments: [{ value: CHROME }], returnByValue: true });
    add(r.result.value || [], label);
  });
  const stray = colorModeName === 'dark' ? await page.evaluate((s) => window.__contrast.lightSurfaces(document.body, s), allowSelectors) : [];
  return { results: out, stray };
}

const summary = { low: [], worse: [], stray: [], unverified: 0, checked: 0 };
for (const file of PAGES) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  const cdp0 = await page.createCDPSession();
  try { await cdp0.send('Storage.clearDataForOrigin', { origin: base.startsWith('file:') ? 'file://' : new URL(base).origin, storageTypes: 'local_storage,session_storage' }); } catch (e) { /* best effort */ }
  await cdp0.detach();
  await page.evaluateOnNewDocument(t => { try { localStorage.setItem('docs-theme', t); } catch (e) { /* ignore */ } }, theme);
  await page.goto(base + file, { waitUntil: 'networkidle0' });
  // freeze animations and transitions so computed colours are final and repeatable (test harness only)
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
  await page.addScriptTag({ content: engine });
  const cdp = await page.createCDPSession();
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const light = await collect(page, cdp, 'light');
  const current = colorModeName0();
  const cur = current === 'light' ? light : await collect(page, cdp, current);
  const lightByKey = new Map(light.results.map(r => [r.key, r]));
  for (const r of cur.results) {
    summary.checked++;
    if (r.status === 'unverified') { summary.unverified++; continue; }
    const where = `${file}#${r.section} ${r.key}`;
    if (r.chrome && r.status === 'low') summary.low.push({ rule: 3, where, ...pick(r) });
    if (current === 'dark') {
      const l = lightByKey.get(r.key);
      if (l && l.status === 'ok' && r.status === 'low') summary.worse.push({ rule: 1, where, ...pick(r), lightRatio: l.ratio });
    }
  }
  for (const s of cur.stray) summary.stray.push({ rule: 2, where: `${file}#${s.section} ${s.key}`, comp: s.comp, tag: s.tag, cls: s.cls, bg: s.bg });
  await page.close();
}
function colorModeName0() { return colorMode; }
function pick(r) { return { comp: r.comp, text: r.text, tag: r.tag, cls: r.cls, ratio: r.ratio, need: r.need, fg: r.fg, bg: r.bg, state: r.state }; }

if (flag('json')) fs.writeFileSync(flag('json'), JSON.stringify(summary, null, 1));
const byComp = list => { const g = {}; for (const x of list) g[x.comp || '?'] = (g[x.comp || '?'] || 0) + 1; return Object.fromEntries(Object.entries(g).sort((a, b) => b[1] - a[1])); };
// Only the Redmaterials theme is ours to fix: in "bootstrap" mode rules 1 and 2 describe Bootstrap's own dark palette and are
// informational; rule 3 (the docs chrome, which we author) still gates.
const gating = theme === 'redmaterials';
console.log(`audit ${theme} x ${colorMode}: ${summary.checked} text/placeholder checks, ${summary.unverified} unverified (need visual review)`);
console.log(`rule 1 (dark worse than light)${gating ? '' : ' [informational]'}: ${summary.worse.length}  ${JSON.stringify(byComp(summary.worse))}`);
console.log(`rule 2 (stray light surfaces)${gating ? '' : ' [informational]'}:  ${summary.stray.length}  ${JSON.stringify(byComp(summary.stray))}`);
console.log(`rule 3 (chrome below AA):       ${summary.low.length}  ${JSON.stringify(byComp(summary.low))}`);
for (const x of [...summary.low, ...summary.worse, ...summary.stray].slice(0, +(flag('show') || 12))) console.log('  -', JSON.stringify(x).slice(0, 230));
await browser.close();
closeServer();
process.exit(summary.low.length + (gating ? summary.worse.length + summary.stray.length : 0) ? 1 : 0);
