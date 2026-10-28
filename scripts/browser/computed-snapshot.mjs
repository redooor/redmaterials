#!/usr/bin/env node
// Computed-style snapshot of the docs, to prove a refactor did not change what the library renders.
//
//   node scripts/browser/computed-snapshot.mjs <file|http|URL> --out snapshot.json [--theme redmaterials|bootstrap] [--mode light|dark] [--widths 1280,360]
//   node scripts/browser/computed-snapshot.mjs --diff before.json after.json [--show N]
//
// Records, for every element of both docs pages (code snippets included): the colour, border, outline, shadow, filter, text-fill,
// background and accent computed properties, the same for the pseudo-elements the library styles (::before, ::after,
// ::placeholder, slider parts, ::marker, ::file-selector-button), in the default state, with dropdown menus, tooltips and popovers
// open, and under forced :hover, :focus, :active and :focus-visible for every distinct variant of the interactive components,
// at each viewport width. Background images are compared by a hash of their full value (so a changed SVG arrow is detected).
// "Parity" means identical computed rendering, not identical CSS bytes.
//
// Parts of native controls that computed styles cannot report (the range slider's thumb and track, the file input's button,
// progress and meter) are covered by PROBES: a hash of an element screenshot, in the default state and focused.
//
// NOT seen by this snapshot (compare screenshots for these): layout and geometry, fonts, animations/keyframes (frozen here),
// :checked/:disabled/:invalid element states other than those present in the docs markup, and anything outside the two pages.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import puppeteer from 'puppeteer-core';
import { chromePath, resolveBase, sleep, forEachForcedState, withOverlaysOpen, setDocsState } from './lib/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const flag = n => { const i = argv.indexOf('--' + n); return i < 0 ? undefined : argv[i + 1]; };

if (argv.includes('--diff')) {
  const [a, b] = argv.slice(argv.indexOf('--diff') + 1, argv.indexOf('--diff') + 3).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  const names = (i, key) => { if (key.includes('|probe:')) return 'screenshot'; const per = a.props.length; return i < per ? a.props[i] : a.pseudos[Math.floor(i / per) - 1] + ' ' + a.props[i % per]; };
  const diffs = [];
  for (const key of new Set([...Object.keys(a.records), ...Object.keys(b.records)])) {
    const x = a.records[key], y = b.records[key];
    if (!x || !y) { diffs.push(`${key}: ${x ? 'missing after' : 'missing before'}`); continue; }
    const dx = i => a.dict[i], dy = i => b.dict[i];
    if (x.v.length !== y.v.length || x.v.some((v, i) => dx(v) !== dy(y.v[i]))) diffs.push(`${key} <${x.tag}.${x.cls}>: ${x.v.map((v, i) => dx(v) !== dy(y.v[i]) ? `${names(i, key)} ${String(dx(v)).slice(0, 40)} -> ${String(dy(y.v[i])).slice(0, 40)}` : '').filter(Boolean).join('; ')}`);
  }
  console.log(`${Object.keys(a.records).length} records before, ${Object.keys(b.records).length} after, ${diffs.length} differ`);
  for (const d of diffs.slice(0, +(flag('show') || 20))) console.log('  -', d.slice(0, 300));
  process.exit(diffs.length ? 1 : 0);
}

const mode0 = argv.find(a => !a.startsWith('--') && a !== flag('out') && a !== flag('theme') && a !== flag('mode') && a !== flag('widths') && a !== flag('show'));
if (!mode0 || !flag('out')) { console.error('usage: computed-snapshot.mjs <file|http|URL> --out file.json | --diff a.json b.json'); process.exit(2); }
const theme = flag('theme') || 'redmaterials', colorMode = flag('mode') || 'light';
if (!['bootstrap', 'redmaterials'].includes(theme) || !['light', 'dark'].includes(colorMode)) { console.error('invalid --theme or --mode'); process.exit(2); }
const WIDTHS = (flag('widths') || '1280,360').split(',').map(Number);
const docsDir = process.env.DOCS_DIR ? path.resolve(process.env.DOCS_DIR) : path.join(root, 'docs');
const { base, close } = await resolveBase(mode0, docsDir);
const PROPS = ['color', '-webkit-text-fill-color', '-webkit-text-stroke-color', '-webkit-text-stroke-width', 'background-color', 'background-image', 'background-position', 'background-size', 'background-repeat', 'background-clip',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'outline-color', 'outline-width', 'outline-style', 'outline-offset', 'box-shadow', 'text-shadow', 'text-decoration-color', 'text-decoration-line', 'fill', 'stroke', 'opacity', 'filter', 'backdrop-filter', 'mix-blend-mode', 'accent-color', 'caret-color', 'scrollbar-color', 'content'];
const PSEUDOS = ['::before', '::after', '::placeholder', '::-webkit-slider-thumb', '::-webkit-slider-runnable-track', '::marker', '::file-selector-button'];

const recorder = (props, pseudos) => `(function (props, pseudos) {
  function h(s) { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return 'h' + (x >>> 0).toString(36) + ':' + s.length; }
  function vals(cs) { return props.map(p => { const v = cs.getPropertyValue(p); return p === 'background-image' && v.length > 60 ? h(v) : v; }); }
  function sig(el) { const out = vals(getComputedStyle(el)); for (const pe of pseudos) { const cs = getComputedStyle(el, pe); const v = vals(cs); out.push(...v); } return out; }
  function path(el) { const p = []; for (let n = el; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) { const same = n.parentElement ? [...n.parentElement.children].filter(c => c.tagName === n.tagName) : [n]; p.unshift(n.tagName.toLowerCase() + (same.length > 1 ? ':' + (same.indexOf(n) + 1) : '')); } return p.join('>'); }
  window.__snap = { tree(rootEl) { const out = []; for (const el of [rootEl, ...rootEl.querySelectorAll('*')]) { if (el.closest('script, style')) continue; out.push({ key: path(el), tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 50), v: sig(el) }); } return out; } };
})(${JSON.stringify(props)}, ${JSON.stringify(pseudos)})`;

const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new', args: ['--no-sandbox'] });
const records = {};
// values are stored once in a dictionary; a record is a list of indices (keeps the file small)
const dict = [], dictIndex = new Map();
const idx = v => { let i = dictIndex.get(v); if (i === undefined) { i = dict.length; dict.push(v); dictIndex.set(v, i); } return i; };
const put = (tag, state, list) => { for (const r of list) { const v = r.v.map(idx); records[`${tag}|${r.key}|${state}`] = { tag: r.tag, cls: r.cls, v, sig: v.join(',') }; } };
for (const width of WIDTHS) {
  for (const file of ['index.html', 'redmaterials.html']) {
    const tag = `${file}@${width}`;
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    const c0 = await page.createCDPSession();
    try { await c0.send('Storage.clearDataForOrigin', { origin: base.startsWith('file:') ? 'file://' : new URL(base).origin, storageTypes: 'local_storage,session_storage' }); } catch (e) { /* best effort */ }
    await c0.detach();
    await page.goto(base + file, { waitUntil: 'networkidle0' });
    // freeze animations and transitions so computed values are final and repeatable (test harness only)
    await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
    await page.evaluate(recorder(PROPS, PSEUDOS));
    await setDocsState(page, theme, colorMode);
    await sleep(400);
    put(tag, 'default', await page.evaluate(() => window.__snap.tree(document.body)));
    // screenshot probes for native control parts that getComputedStyle cannot see
    for (const sel of ['input[type=range]', 'input[type=file]', 'progress', 'meter']) {
      const handles = (await page.$$(`main ${sel}`)).slice(0, 12);
      for (let i = 0; i < handles.length; i++) {
        for (const st of ['default', 'focus']) {
          try {
            if (st === 'focus') await handles[i].focus();
            const png = await handles[i].screenshot({ type: 'png' });
            const h = crypto.createHash('sha1').update(png).digest('hex').slice(0, 16);
            records[`${tag}|probe:${sel}#${i}|${st}`] = { tag: 'probe', cls: sel, v: [idx(h)], sig: String(idx(h)) };
          } catch (e) { /* element not renderable at this width */ }
        }
      }
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
    }
    await page.evaluate(() => document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('show')));
    put(tag, 'open', await page.evaluate(() => [...document.querySelectorAll('.dropdown-menu.show')].flatMap(m => window.__snap.tree(m))));
    await page.evaluate(() => document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show')));
    await withOverlaysOpen(page, async () => put(tag, 'overlay', await page.evaluate(() => [...document.querySelectorAll('.tooltip.show, .popover.show')].flatMap(m => window.__snap.tree(m)))));
    const cdp = await page.createCDPSession();
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    await forEachForcedState(cdp, page, async (state, objectId, pick) => {
      const r = await cdp.send('Runtime.callFunctionOn', { objectId, functionDeclaration: 'function(){ return window.__snap.tree(this); }', returnByValue: true });
      put(tag, `${state}@${pick}`, r.result.value || []);   // the forced target is part of the key: a row's hover and its link's hover must not overwrite each other
    });
    await page.close();
  }
}
await browser.close(); close();
fs.writeFileSync(flag('out'), JSON.stringify({ theme, mode: colorMode, widths: WIDTHS, props: PROPS, pseudos: PSEUDOS, dict, records }));
console.log(`snapshot ${theme} x ${colorMode} @ ${WIDTHS.join(',')}: ${Object.keys(records).length} records -> ${flag('out')} (${(fs.statSync(flag('out')).size / 1e6).toFixed(1)} MB)`);
