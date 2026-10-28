#!/usr/bin/env node
// Behaviour checks for js/redmaterials.js (ripple effect and nav-sidebar toggle) in headless Chrome.
//
//   node scripts/browser/redmaterials-js-check.mjs [--with-jquery] [path-to-js]
//
// Default JS is dist/js/redmaterials.js. Without --with-jquery the fixture page loads NO jQuery, so a jQuery
// dependency shows up as a failure. With --with-jquery the run is a BASELINE of the jQuery build: it prints
// the result table and always exits 0. CHROME selects the browser binary.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const withJquery = args.includes('--with-jquery');
const jsPath = path.resolve(args.find(a => !a.startsWith('--')) || path.join(root, 'dist/js/redmaterials.js'));
const cssPath = path.join(root, 'dist/css/redmaterials.css');
const jqueryPath = [path.join(root, 'node_modules/jquery/dist/jquery.min.js'), path.join(root, '../redminportal/node_modules/jquery/dist/jquery.min.js')].find(fs.existsSync);
if (withJquery && !jqueryPath) { console.error('--with-jquery needs a local jquery (node_modules/jquery or ../redminportal/node_modules/jquery)'); process.exit(2); }

const FIXTURE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/redmaterials.css">
<style>body{margin:0;padding:20px;height:3000px}.btn{position:relative;overflow:hidden;display:inline-block;padding:10px 20px}
#scroller{height:120px;width:300px;overflow:auto;border:1px solid #999}#scroller .inner{height:600px;padding-top:300px}
#moved{transform:translate(10px,10px)}#bordered{border:8px solid #333;padding:10px}
#nav_sidebar1{position:fixed;left:-300px;width:240px}#nav_sidebar1.active{left:0}</style></head><body>
<button id="plain" class="btn ripple-effect">Plain</button>
<button id="bordered" class="btn ripple-effect">Bordered</button>
<div id="scroller"><div class="inner"><button id="scrolled" class="btn ripple-effect">Scrolled</button></div></div>
<div id="moved"><button id="translated" class="btn ripple-effect">Translated</button></div>
<div id="outer" class="btn ripple-effect" style="padding:30px"><button id="inner" class="btn ripple-effect">Nested</button></div>
<div id="nav_sidebar1" class="nav-sidebar"><a href="#">x</a></div><div id="nav_sidebar2" class="nav-sidebar"></div>
<a id="toggle" href="#x" data-toggle="nav-sidebar-toggle" data-target="#nav_sidebar1">Toggle</a>
<a id="toggle-none" href="#" data-toggle="nav-sidebar-toggle">No target</a>
<a id="toggle-missing" href="#" data-toggle="nav-sidebar-toggle" data-target="#does-not-exist">Missing</a>
<a id="toggle-bad" href="#" data-toggle="nav-sidebar-toggle" data-target="##">Bad selector</a>
<a id="toggle-bs" href="#" data-toggle="nav-sidebar-toggle" data-bs-target="#nav_sidebar2">bs alias</a>
${withJquery ? '<script src="/jquery.js"></script>' : ''}<script src="/redmaterials.js"></script></body></html>`;

const files = { '/': [FIXTURE, 'text/html'], '/redmaterials.js': [fs.readFileSync(jsPath), 'text/javascript'], '/redmaterials.css': [fs.readFileSync(cssPath), 'text/css'] };
if (withJquery) files['/jquery.js'] = [fs.readFileSync(jqueryPath), 'text/javascript'];
const server = http.createServer((q, r) => { const f = files[q.url.split('?')[0]]; if (!f) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': f[1] }); r.end(f[0]); } });
await new Promise(r => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;

const chrome = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${info ? ' ' + info : ''}`); };
const info = (name, value) => { results.push({ name, ok: true, info: value, informational: true }); console.log(`INFO ${name} ${value}`); };

async function fresh(opts = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.setViewport({ width: 900, height: 700, hasTouch: !!opts.touch, isMobile: !!opts.touch });
  await page.goto(base, { waitUntil: 'load' });
  return { page, errors };
}
const center = async (page, sel) => page.$eval(sel, el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
const inkCenter = (page, sel) => page.evaluate(s => { const el = document.querySelector(s + ' > .ink'); if (!el) return { x: Infinity, y: Infinity }; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

async function guard(name, fn) { try { await fn(); } catch (e) { check(`${name} (threw)`, false, String(e.message).split('\n')[0].slice(0, 140)); } }
try {
  // 1. loads without jQuery and without errors
  await guard('ripple checks', async () => {
    const { page, errors } = await fresh();
    if (withJquery) info('1 no-jQuery load', 'skipped (baseline with jQuery)'); else check('1 loads without jQuery and without errors', !errors.length, errors.join('|').slice(0, 160));

    // 2. ripple on mouse click and on keyboard activation
    await page.evaluate(() => { window.__animAdds = 0; new MutationObserver(ms => ms.forEach(m => { if (m.target.classList && m.target.classList.contains('ink') && m.target.classList.contains('animate')) window.__animAdds++; })).observe(document.getElementById('plain'), { subtree: true, attributes: true, attributeFilter: ['class'] }); });
    let c = await center(page, '#plain');
    await page.mouse.click(c.x, c.y);
    const first = await page.$eval('#plain', el => { const k = el.querySelector('.ink'); return { inks: el.querySelectorAll('.ink').length, animate: !!k && k.classList.contains('animate'), w: k ? k.offsetWidth : 0, h: k ? k.offsetHeight : 0, max: Math.max(el.offsetWidth, el.offsetHeight) }; });
    check('2a click appends one .ink sized to max(width,height) with .animate', first.inks === 1 && first.animate && first.w === first.max && first.h === first.max, JSON.stringify(first));
    await page.mouse.click(c.x + 3, c.y);
    const second = await page.$eval('#plain', el => { const k = el.querySelector('.ink'); return { inks: el.querySelectorAll('.ink').length, animate: !!k && k.classList.contains('animate') }; });
    check('2b second click keeps one .ink and re-adds .animate', second.inks === 1 && second.animate);
    await page.focus('#plain'); await page.keyboard.press('Enter');
    const kb = await page.$eval('#plain', el => el.querySelectorAll('.ink').length);
    const kbc = await inkCenter(page, '#plain'); const pc = await center(page, '#plain');
    check('2c keyboard Enter ripples once, centred', kb === 1 && dist(kbc, pc) < 2, `ink-centre offset ${dist(kbc, pc).toFixed(1)}px`);

    // 3. ripple position relative to the click point
    for (const [name, sel] of [['bordered', '#bordered'], ['in a scrolled overflow container', '#scrolled'], ['inside a translated ancestor', '#translated']]) {
      if (sel === '#scrolled') await page.$eval('#scroller', el => { el.scrollTop = 250; });
      await page.$eval(sel, el => el.scrollIntoView({ block: 'center' }));
      if (sel === '#scrolled') await page.$eval('#scroller', el => { el.scrollTop = 250; });
      const cc = await center(page, sel);
      await page.mouse.click(cc.x - 7, cc.y + 3);
      const ic = await inkCenter(page, sel);
      const off = dist(ic, { x: cc.x - 7, y: cc.y + 3 });
      check(`3 ripple centre on the click point: ${name}`, off < 2, `offset ${off.toFixed(1)}px`);
    }
    // nested: only the nearest .ripple-effect ripples (informational for the baseline comparison)
    await page.$eval('#inner', el => el.scrollIntoView({ block: 'center' }));
    const ic2 = await center(page, '#inner'); await page.mouse.click(ic2.x, ic2.y);
    const nested = await page.evaluate(() => ({ inner: document.querySelectorAll('#inner > .ink').length, outer: document.querySelectorAll('#outer > .ink').length }));
    info('9a nested ripple-effect elements', JSON.stringify(nested));
    // a Bootstrap-style handler on the same element still receives the click (ripple must not stop propagation)
    const reached = await page.evaluate(() => new Promise(res => { document.getElementById('plain').addEventListener('click', () => res(true), { once: true }); document.getElementById('plain').click(); setTimeout(() => res(false), 300); }));
    check('9b ripple does not swallow the click for other handlers', reached);
    await page.close();
  });

  // 4, 6, 7, 8. sidebar toggle (mouse)
  await guard('sidebar toggle checks', async () => {
    const { page, errors } = await fresh();
    await page.$eval('#toggle', el => el.scrollIntoView({ block: 'center' }));
    let c = await center(page, '#toggle');
    await page.mouse.click(c.x, c.y);
    let st = await page.evaluate(() => ({ active: document.getElementById('nav_sidebar1').classList.contains('active'), lock: document.body.classList.contains('rdm-ui-disable-scroll'), hash: location.hash }));
    check('4a toggle adds .active and scroll lock', st.active && st.lock);
    check('8 toggle on <a href="#x"> does not change location.hash', st.hash === '');
    await page.mouse.click(c.x, c.y);
    st = await page.evaluate(() => ({ active: document.getElementById('nav_sidebar1').classList.contains('active'), lock: document.body.classList.contains('rdm-ui-disable-scroll') }));
    check('4b second click removes both', !st.active && !st.lock);

    const before = errors.length;
    for (const id of ['toggle-none', 'toggle-missing', 'toggle-bad']) await page.$eval('#' + id, el => el.click());
    const lock = await page.evaluate(() => document.body.classList.contains('rdm-ui-disable-scroll'));
    const noisy = errors.slice(before);
    if (withJquery) info('6a missing / invalid data-target', `lock=${lock} errors=${noisy.length}`);
    else check('6a missing, non-matching and invalid data-target are no-ops without errors', !lock && !noisy.length, noisy.join('|').slice(0, 160));
    await page.$eval('#toggle-bs', el => el.click());
    const alias = await page.evaluate(() => document.getElementById('nav_sidebar2').classList.contains('active'));
    if (withJquery) info('6b data-bs-target alias', String(alias)); else check('6b data-bs-target is accepted as an alias', alias);

    // 7. element added after load (delegation)
    await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<button id="late" class="btn ripple-effect">Late</button><a id="late-toggle" href="#" data-toggle="nav-sidebar-toggle" data-target="#nav_sidebar1">T</a>'); });
    await page.$eval('#late', el => el.scrollIntoView({ block: 'center' }));
    const lc = await center(page, '#late'); await page.mouse.click(lc.x, lc.y);
    const lateInk = await page.$eval('#late', el => el.querySelectorAll('.ink').length);
    await page.$eval('#late-toggle', el => el.click());
    const lateActive = await page.evaluate(() => document.getElementById('nav_sidebar1').classList.contains('active'));
    check('7 elements added after load work (delegation)', lateInk === 1 && lateActive);
    await page.close();
  });

  // 5. touch tap toggles exactly once
  await guard('touch check', async () => {
    const { page } = await fresh({ touch: true });
    await page.$eval('#toggle', el => el.scrollIntoView({ block: 'center' }));
    const c = await center(page, '#toggle');
    await page.touchscreen.tap(c.x, c.y);
    await new Promise(r => setTimeout(r, 400));
    const active = await page.evaluate(() => document.getElementById('nav_sidebar1').classList.contains('active'));
    if (withJquery) info('5 touch tap on the toggle (baseline)', `active after one tap = ${active}`);
    else check('5 one touch tap leaves the sidebar open (no double toggle)', active);
    await page.close();
  });
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed${withJquery ? ' (baseline run, exit 0)' : ''}`);
process.exit(withJquery || !failed.length ? 0 : 1);
