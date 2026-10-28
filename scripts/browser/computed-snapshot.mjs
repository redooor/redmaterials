#!/usr/bin/env node
// Light-mode computed-style snapshot of the docs, to prove a refactor did not change what the library renders.
//
//   node scripts/browser/computed-snapshot.mjs <file|http|URL> --out snapshot.json [--theme redmaterials|bootstrap] [--mode light|dark]
//   node scripts/browser/computed-snapshot.mjs --diff before.json after.json
//
// For every element of both docs pages (outside code snippets) it records the colour-related computed properties in the
// default state, with the dropdown menus opened, and under forced :hover and :focus on a sample of interactive elements.
// Parity means "identical computed rendering", not identical CSS bytes.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { chromePath, resolveBase, sleep, forEachForcedState } from './lib/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const flag = n => { const i = argv.indexOf('--' + n); return i < 0 ? undefined : argv[i + 1]; };

if (argv.includes('--diff')) {
  const [a, b] = argv.slice(argv.indexOf('--diff') + 1, argv.indexOf('--diff') + 3).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  const diffs = [];
  for (const key of new Set([...Object.keys(a.records), ...Object.keys(b.records)])) {
    const x = a.records[key], y = b.records[key];
    if (!x || !y) { diffs.push(`${key}: ${x ? 'missing after' : 'missing before'}`); continue; }
    if (x.sig !== y.sig) diffs.push(`${key} <${x.tag}.${x.cls}>: ${a.props.filter((_, i) => x.v[i] !== y.v[i]).map(p => { const i = a.props.indexOf(p); return `${p} ${x.v[i]} -> ${y.v[i]}`; }).join('; ')}`);
  }
  console.log(`${Object.keys(a.records).length} records before, ${Object.keys(b.records).length} after, ${diffs.length} differ`);
  for (const d of diffs.slice(0, +(flag('show') || 20))) console.log('  -', d.slice(0, 240));
  process.exit(diffs.length ? 1 : 0);
}

const mode0 = argv.find(a => !a.startsWith('--') && a !== flag('out') && a !== flag('theme') && a !== flag('mode'));
if (!mode0 || !flag('out')) { console.error('usage: computed-snapshot.mjs <file|http|URL> --out file.json | --diff a.json b.json'); process.exit(2); }
const theme = flag('theme') || 'redmaterials', colorMode = flag('mode') || 'light';
const docsDir = process.env.DOCS_DIR ? path.resolve(process.env.DOCS_DIR) : path.join(root, 'docs');
const { base, close } = await resolveBase(mode0, docsDir);
const PROPS = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'box-shadow', 'outline-color', 'text-decoration-color', 'fill', 'stroke', 'opacity', 'background-image', 'caret-color'];

// Records one element: a compact signature of its colour-related computed values.
const recorder = (props) => `(function (props) {
  function sig(el) { const cs = getComputedStyle(el); return props.map(p => { const v = cs.getPropertyValue(p); return p === 'background-image' && v.startsWith('url(') ? 'url(' + v.length + ')' : v; }); }
  function path(el) { const p = []; for (let n = el; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) { const same = n.parentElement ? [...n.parentElement.children].filter(c => c.tagName === n.tagName) : [n]; p.unshift(n.tagName.toLowerCase() + (same.length > 1 ? ':' + (same.indexOf(n) + 1) : '')); } return p.join('>'); }
  window.__snap = { sig, path, tree(rootEl) { const out = []; for (const el of [rootEl, ...rootEl.querySelectorAll('*')]) { if (el.closest('pre.docs-snippet, script, style')) continue; out.push({ key: path(el), tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 50), v: sig(el) }); } return out; } };
})(${JSON.stringify(props)})`;

const browser = await puppeteer.launch({ executablePath: chromePath, headless: 'new', args: ['--no-sandbox'] });
const records = {};
const put = (file, state, list) => { for (const r of list) records[`${file}|${r.key}|${state}`] = { tag: r.tag, cls: r.cls, v: r.v, sig: r.v.join('\u0001') }; };
for (const file of ['index.html', 'redmaterials.html']) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  const c0 = await page.createCDPSession();
  try { await c0.send('Storage.clearDataForOrigin', { origin: base.startsWith('file:') ? 'file://' : new URL(base).origin, storageTypes: 'local_storage,session_storage' }); } catch (e) { /* best effort */ }
  await c0.detach();
  await page.evaluateOnNewDocument(t => { try { localStorage.setItem('docs-theme', t); } catch (e) { /* ignore */ } }, theme);
  await page.goto(base + file, { waitUntil: 'networkidle0' });
  // freeze animations and transitions so computed colours are final and repeatable (test harness only)
  await page.addStyleTag({ content: '*, *::before, *::after { animation: none !important; transition: none !important; }' });
  await page.evaluate(recorder(PROPS));
  await page.evaluate(m => docsState.set({ mode: m }), colorMode);
  await sleep(500);
  put(file, 'default', await page.evaluate(() => window.__snap.tree(document.body)));
  await page.evaluate(() => document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('show')));
  put(file, 'open', await page.evaluate(() => [...document.querySelectorAll('.dropdown-menu.show')].flatMap(m => window.__snap.tree(m))));
  await page.evaluate(() => document.querySelectorAll('.dropdown-menu.show').forEach(m => m.classList.remove('show')));
  const cdp = await page.createCDPSession();
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  await forEachForcedState(cdp, async (label, objectId) => {
    const r = await cdp.send('Runtime.callFunctionOn', { objectId, functionDeclaration: 'function(){ return window.__snap.tree(this); }', returnByValue: true });
    put(file, label, r.result.value || []);
  });
  await page.close();
}
await browser.close(); close();
fs.writeFileSync(flag('out'), JSON.stringify({ theme, mode: colorMode, props: PROPS, records }));
console.log(`snapshot ${theme} x ${colorMode}: ${Object.keys(records).length} records -> ${flag('out')} (${(fs.statSync(flag('out')).size / 1e6).toFixed(1)} MB)`);
