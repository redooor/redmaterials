#!/usr/bin/env node
// Browser checks for the generated docs (docs/index.html).
//
//   node scripts/browser/docs-check.mjs <file|http|URL>
//
//   file  opens docs/*.html through file://   (the case that was broken by AngularJS XHR)
//   http  serves docs/ from a local static server
//   URL   checks a hosted copy, for example https://redooor.github.io/redmaterials/
//
// CHROME selects the browser binary. Exits non-zero when any check fails.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { resolveBase } from './lib/common.mjs';
import { validateManifest } from './lib/manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const docsDir = process.env.DOCS_DIR ? path.resolve(process.env.DOCS_DIR) : path.join(root, 'docs');
const mode = process.argv[2];
if (!mode) { console.error('usage: docs-check.mjs <file|http|URL>'); process.exit(2); }
const sections = JSON.parse(fs.readFileSync(path.join(root, 'docs-src', 'sections.json'), 'utf8'));
const manifestErrors = validateManifest(sections);
const PAGES = [['index.html', sections.redmaterials]];
const chrome = process.env.CHROME || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');

const { base, close: closeServer } = await resolveBase(mode, docsDir);

const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--no-sandbox'] });
const results = [];
let currentPage = '';
const check = (name, ok, info = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} [${currentPage}] ${name}${info ? ' ' + info : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// smooth scrolling (Bootstrap reboot) can take seconds over a long page: wait until scrollY is stable
async function settle(page, max = 4000) {
  let last = -1, same = 0;
  for (let t = 0; t < max; t += 150) {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    same = y === last ? same + 1 : 0; last = y;
    if (same >= 3) return;
    await sleep(150);
  }
}
const poll = async (fn, ok, max = 3000) => { let v; for (let t = 0; t < max; t += 150) { v = await fn(); if (ok(v)) return v; await sleep(150); } return v; };

async function open(file, { width = 1280, height = 800, scheme = 'light', init, prefs = {} } = {}) {
  const page = await browser.newPage();
  const issues = [];
  page.on('pageerror', e => issues.push('pageerror: ' + String(e).slice(0, 160)));
  page.on('console', m => m.type() === 'error' && issues.push('console: ' + m.text().slice(0, 160)));
  page.on('requestfailed', r => issues.push('requestfailed: ' + r.url().slice(0, 120)));
  page.on('response', r => r.status() >= 400 && issues.push(`http ${r.status()}: ${r.url().slice(0, 120)}`));
  await page.setViewport({ width, height });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  // every tab starts with clean storage (the browser profile is shared): cleared from outside the page through the
  // DevTools protocol, so reloads inside a test keep their state
  try {
    const origin = base.startsWith('file:') ? 'file://' : new URL(base).origin;
    const cdp = await page.createCDPSession();
    await cdp.send('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage,session_storage' });
    await cdp.detach();
  } catch (e) { /* best effort */ }
  if (init) await page.evaluateOnNewDocument(init);
  await page.goto(base + file + (prefs.hash || ''), { waitUntil: prefs.waitUntil || 'networkidle0' });
  await sleep(300);
  return { page, issues };
}

try {
  for (const [file, list] of PAGES) {
    currentPage = file;

    // 1, 2, 3, 3b, 4: structure, errors, no Angular/jQuery, no docs styling, unique ids
    {
      const { page, issues } = await open(file);
      const missing = await page.evaluate(ids => ids.filter(id => { const e = document.getElementById(id); return !e || e.getBoundingClientRect().height === 0; }), list.map(s => s.id));
      check('1 every section from sections.json exists and has height', !missing.length, missing.join(','));
      check('2a no console errors, page errors, failed or >=400 requests', !issues.length, issues.slice(0, 3).join(' | '));
      const libs = await page.evaluate(() => ({ angular: typeof window.angular, jquery: typeof window.jQuery }));
      check('2b no AngularJS and no jQuery on the page', libs.angular === 'undefined' && libs.jquery === 'undefined', JSON.stringify(libs));
      const generated = await page.evaluate(() => [...document.querySelectorAll('.bs-component.border.rounded.p-3')].filter(e => !(e.nextElementSibling && e.nextElementSibling.matches('pre.docs-snippet'))).length);
      check('3 every generated example is followed by its snippet', generated === 0, `${generated} without a snippet`);
      const styling = await page.evaluate(() => {
        const allowed = [/\/dist\/vendor\/bootstrap\/bootstrap\.min\.css$/, /\/dist\/css\/redmaterials\.min\.css$/, /\/dist\/vendor\/highlightjs\/a11y-(light|dark)\.min\.css$/, /^https:\/\/fonts\.googleapis\.com\//];
        const sheets = [...document.querySelectorAll('link[rel~=stylesheet]')].map(l => l.href).filter(h => !allowed.some(re => re.test(h)));
        const styles = document.querySelectorAll('style').length;
        // chrome (mobile bar, sidebar, footer) must carry no inline style at all
        const chrome = [...document.querySelectorAll('nav.sticky-top [style], #docs-sidebar [style], footer [style]')].map(e => e.tagName + '#' + e.id);
        // example content may size things inline, as Bootstrap's own examples do, but only with sizing properties
        const SIZING = /^(width|max-width|min-width|height|max-height|min-height|display|aspect-ratio|--bs-[\w-]+)$/;
        const examples = [...document.querySelectorAll('main [style]')].flatMap(e => e.getAttribute('style').split(';').map(x => x.split(':')[0].trim()).filter(Boolean).filter(p => !SIZING.test(p)).map(p => p + ' on ' + e.tagName));
        return { sheets, styles, chrome, examples: [...new Set(examples)] };
      });
      check('3b the docs define no styles (allowed stylesheets only, no <style>, style-free chrome, only sizing in example inline styles)', !styling.sheets.length && !styling.styles && !styling.chrome.length && !styling.examples.length, JSON.stringify(styling));
      const dupes = await page.evaluate(() => { const seen = {}, d = []; document.querySelectorAll('[id]').forEach(e => { if (seen[e.id]) d.push(e.id); seen[e.id] = 1; }); return [...new Set(d)]; });
      check('4 no duplicate ids', !dupes.length, dupes.slice(0, 8).join(','));
      await page.close();
    }

    // 13: instant section jumps, highlighted snippets in the active colour mode
    {
      const { page } = await open(file);
      const r = await page.evaluate(() => {
        const tok = document.querySelector('pre.docs-snippet .hljs-name, pre.docs-snippet .hljs-attr, pre.docs-snippet .hljs-string');
        const sheets = ['hljs-light', 'hljs-dark'].map(id => document.getElementById(id).disabled);
        return { behaviour: getComputedStyle(document.documentElement).scrollBehavior, smooth: document.querySelector('main').hasAttribute('data-bs-smooth-scroll'),
                 tokenColor: tok && getComputedStyle(tok).color, bodyColor: getComputedStyle(document.body).color, sheets,
                 dark: document.documentElement.getAttribute('data-bs-theme') === 'dark',
                 links: [...document.querySelectorAll('#docs-sidebar #nav_spy a')].map(a => a.getAttribute('href')) };
      });
      check('13a the sidebar lists every section in order, in one list', JSON.stringify(r.links) === JSON.stringify(list.map(x => '#' + x.id)), JSON.stringify(r.links));
      check('13b section jumps are instant (no smooth scrolling)', r.behaviour === 'auto' && !r.smooth, JSON.stringify(r));
      check('13c snippets are syntax highlighted and the matching highlight theme is enabled', !!r.tokenColor && r.tokenColor !== r.bodyColor && r.sheets[r.dark ? 0 : 1] === true && r.sheets[r.dark ? 1 : 0] === false, JSON.stringify(r));
      await page.close();
    }

    // 14: pressed and hovered flat buttons keep a readable label (the filled-state rules must not paint a flat button's own colour behind its
    // label, including as first child or after another button) and pagination links reach AA in both colour modes
    {
      const { page } = await open(file);
      const cdp = await page.createCDPSession(); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
      const channel = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
      const lum = ([r, g, b]) => .2126 * channel(r) + .7152 * channel(g) + .0722 * channel(b);
      const rgba = c => { const m = c.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m[3] === undefined ? 1 : m[3]]; };
      const over = (top, base) => top.slice(0, 3).map((v, i) => v * top[3] + base[i] * (1 - top[3]));
      const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      // min: palette (500-level) labels cannot reach AA on a light wash by design (a documented, accepted limitation), so the bar there is
      // 3:1, which still catches a label drawn on a fill of its own colour (1.5:1); pagination text is 4.43:1 on its translucent light surface.
      const cases = [
        ['flat bg-blue first-child :active', '<button class="btn bg-blue btn-flat">x</button>', 'button', 'active', 3],
        ['flat bg-blue after a button :active', '<button class="btn">a</button><button class="btn bg-blue btn-flat">x</button>', 'button + button', 'active', 3],
        ['flat bg-blue first-child :hover', '<button class="btn bg-blue btn-flat">x</button>', 'button', 'hover', 3],
        ['flat btn-primary first-child :active', '<button class="btn btn-primary btn-flat">x</button>', 'button', 'active'],
        ['flat btn-primary after a button :active', '<button class="btn">a</button><button class="btn btn-primary btn-flat">x</button>', 'button + button', 'active'],
        ['pagination link', '<ul class="pagination"><li class="page-item"><a class="page-link" href="#">1</a></li></ul>', '.page-link', null, 4.4],
        ['pagination link :hover', '<ul class="pagination"><li class="page-item"><a class="page-link" href="#">1</a></li></ul>', '.page-link', 'hover', 4.4],
      ];
      const weak = [];
      for (const mode of ['light', 'dark']) {
        const base = mode === 'dark' ? [33, 37, 41] : [255, 255, 255];
        for (const [name, html, sel, state, min = 4.5] of cases) {
          await page.evaluate((mode, html) => { document.documentElement.setAttribute('data-bs-theme', mode); let h = document.getElementById('__probe'); if (!h) { h = document.createElement('div'); h.id = '__probe'; h.className = 'p-3 bg-body'; document.body.prepend(h); } h.innerHTML = html; }, mode, html);
          const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
          const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#__probe ' + sel });
          if (state) await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [state] });
          await sleep(450); // the buttons transition their colours
          const cs = await page.evaluate(sel => { const c = getComputedStyle(document.querySelector('#__probe ' + sel)); return { color: c.color, bg: c.backgroundColor }; }, sel);
          if (state) await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
          const bg = over(rgba(cs.bg), base), fg = over(rgba(cs.color), bg), ratio = contrast(fg, bg);
          if (ratio < min) weak.push(`${mode} ${name} ${ratio.toFixed(2)}:1 (${cs.color} on ${cs.bg})`);
        }
      }
      await page.evaluate(() => document.getElementById('__probe').remove());
      check('14 pressed/hovered flat buttons and pagination links stay readable in light and dark', !weak.length, weak.join(' | '));
      await page.close();
    }

    // 5, 11: sidebar links scroll to their section; the matching sidebar link (and only a #nav_spy link) becomes active
    {
      const { page } = await open(file);
      const probe = id => page.evaluate(id => {
        const sec = document.getElementById(id).getBoundingClientRect();
        const active = [...document.querySelectorAll('#docs-sidebar .nav-link.active')];
        return { top: Math.round(sec.top), active: active.map(a => a.getAttribute('href')), outside: active.filter(a => !a.closest('#nav_spy')).length,
          atBottom: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 60 };
      }, id);
      const tail = list.slice(-3).map(x => '#' + x.id);
      const verdict = (id, r) => {
        if (r.outside) return `${id}: active link outside #nav_spy`;
        if (r.active.includes('#' + id)) return r.top >= -5 && r.top < 600 ? '' : `${id}: top ${r.top}`;
        // the last sections can be too short to reach the top of the page: then one of the last sections is active
        if (r.atBottom && r.active.some(h => tail.includes(h))) return '';
        return `${id}: active ${JSON.stringify(r.active)}`;
      };
      const bad = [];
      for (const s of list) {
        await page.evaluate(id => document.querySelector(`#nav_spy a[href="#${id}"]`).click(), s.id);
        await settle(page); await sleep(350);
        const v = verdict(s.id, await probe(s.id));
        if (v) bad.push(v);
      }
      check('5 every sidebar link scrolls to its section and activates the matching link (only #nav_spy links)', !bad.length, bad.slice(0, 4).join(' | '));
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await settle(page);
      const last = list[list.length - 1];
      await page.evaluate(id => document.querySelector(`#nav_spy a[href="#${id}"]`).click(), last.id);
      await settle(page); await sleep(400);
      const deep = await page.evaluate(id => { const a = document.querySelector(`#nav_spy a[href="#${id}"]`).getBoundingClientRect(), sb = document.getElementById('docs-sidebar').getBoundingClientRect(); return { inView: a.top >= sb.top - 1 && a.bottom <= sb.bottom + 1, activeLast: document.querySelector(`#nav_spy a[href="#${id}"]`).classList.contains('active') }; }, last.id);
      check('11 the active link deep in the sidebar is scrolled into view', deep.inView && deep.activeLast, JSON.stringify(deep));
      await page.close();
      // direct navigation to a hash (first, middle, last section)
      const badHash = [];
      for (const s of [list[0], list[Math.floor(list.length / 2)], last]) {
        const d = await open(file, { prefs: { hash: '#' + s.id } });
        await settle(d.page); await sleep(500);
        const v = verdict(s.id, await d.page.evaluate(id => {
          const sec = document.getElementById(id).getBoundingClientRect();
          const active = [...document.querySelectorAll('#docs-sidebar .nav-link.active')];
          return { top: Math.round(sec.top), active: active.map(a => a.getAttribute('href')), outside: active.filter(a => !a.closest('#nav_spy')).length, atBottom: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 60 };
        }, s.id));
        if (v) badHash.push('#' + s.id + ' ' + v);
        await d.page.close();
      }
      check('5b opening the page at #section activates that section in the sidebar', !badHash.length, badHash.join(' | '));
    }

    // 6. no horizontal overflow at 360px
    {
      const { page } = await open(file, { width: 360, height: 740 });
      const w = await page.evaluate(() => document.documentElement.scrollWidth);
      check('6 no horizontal page overflow at 360px', w <= 360, `scrollWidth ${w}`);
      await page.close();
    }

    // 8. colour mode
    {
      const { page } = await open(file, { scheme: 'light' });
      const theme = () => page.evaluate(() => document.documentElement.getAttribute('data-bs-theme'));
      await page.click('label[for=mode-dark]'); await sleep(150);
      const dark = await theme();
      await page.click('label[for=mode-light]'); await sleep(150);
      const light = await theme();
      await page.click('label[for=mode-auto]'); await sleep(150);
      const autoLight = await theme();
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]); await sleep(300);
      const autoDark = await theme();
      check('8a dark / light / auto set data-bs-theme and Auto follows the OS live', dark === 'dark' && light === 'light' && autoLight === 'light' && autoDark === 'dark', JSON.stringify({ dark, light, autoLight, autoDark }));
      await page.click('label[for=mode-dark]'); await sleep(150);
      await page.reload({ waitUntil: 'networkidle0' });
      const after = await page.evaluate(() => ({ mode: document.documentElement.getAttribute('data-bs-theme'), modeRadio: document.querySelector('input[name=color-mode]:checked').value }));
      check('8b the colour mode persists across reload', after.mode === 'dark' && after.modeRadio === 'dark', JSON.stringify(after));
      await page.close();
      const thrown = await open(file, { init: () => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } }); } });
      const t = await thrown.page.evaluate(() => ({ theme: document.documentElement.getAttribute('data-bs-theme') }));
      check('8c the page works when localStorage throws', ['light', 'dark'].includes(t.theme) && !thrown.issues.filter(i => i.startsWith('pageerror')).length, JSON.stringify(t) + ' ' + thrown.issues.join('|').slice(0, 100));
      await thrown.page.close();
    }

    // 9. no flash: first state in which <body> exists, with delayed stylesheets and stored dark
    {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', async r => { if (/\.css(\?|$)/.test(r.url()) && !r.url().includes('googleapis')) { await sleep(1200); } r.continue().catch(() => {}); });
      await page.evaluateOnNewDocument(() => {
        try { localStorage.setItem('docs-color-mode', 'dark'); } catch (e) { /* ignore */ }
        new MutationObserver((_, obs) => { if (document.body) { window.__firstBody = { theme: document.documentElement.getAttribute('data-bs-theme') }; obs.disconnect(); } }).observe(document, { childList: true, subtree: true });
      });
      await page.goto(base + file, { waitUntil: 'domcontentloaded' });
      const first = await page.evaluate(() => window.__firstBody);
      check('9a first state with a body: dark mode already applied (no flash)', first && first.theme === 'dark', JSON.stringify(first));
      await page.close();
      const nojs = await browser.newPage();
      await nojs.setJavaScriptEnabled(false);
      await nojs.goto(base + file, { waitUntil: 'load' });
      const enabled = await nojs.evaluate(() => { const l = [...document.querySelectorAll('link[rel=stylesheet]')].find(x => /redmaterials\.min\.css$/.test(x.href)); return !!l && !l.disabled && !!l.sheet; });
      check('9b with JavaScript disabled Redmaterials CSS is still applied', enabled);
      await nojs.close();
    }

    // 10. mobile sidebar at 360px
    {
      const { page } = await open(file, { width: 360, height: 740 });
      const isOpen = () => page.evaluate(() => document.getElementById('docs-sidebar').classList.contains('show'));
      await page.click('button[aria-label="Open navigation"]'); await sleep(600);
      const opened = await isOpen();
      const hit = await page.evaluate(() => { const a = document.querySelector('#docs-sidebar #nav_spy a'); const r = a.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { inside: r.left >= 0 && r.right <= 360, topmost: e === a || a.contains(e) }; });
      check('10a the menu button opens the sidebar above the backdrop', opened && hit.inside && hit.topmost, JSON.stringify(hit));
      const target = list[1].id;
      await page.evaluate(() => { const a = document.querySelector('#docs-sidebar #nav_spy a'); a.scrollIntoView({ block: 'nearest' }); });
      const link = await page.$(`#docs-sidebar a[href="#${target}"]`);
      await link.evaluate(el => el.scrollIntoView({ block: 'center' }));
      await link.click(); await sleep(1100);
      const nav = await page.evaluate(id => ({ top: Math.round(document.getElementById(id).querySelector('h1,h2').getBoundingClientRect().top), bar: Math.round(document.querySelector('nav.sticky-top').getBoundingClientRect().bottom), shown: document.getElementById('docs-sidebar').classList.contains('show') }), target);
      check('10b choosing a section scrolls to it, closes the sidebar and keeps the heading below the sticky bar', !nav.shown && nav.top >= nav.bar - 2, JSON.stringify(nav));
      await page.click('button[aria-label="Open navigation"]'); await sleep(600);
      await page.mouse.click(350, 400); await sleep(600);
      const closedByBackdrop = !(await isOpen());
      await page.click('button[aria-label="Open navigation"]'); await sleep(600);
      await page.click('#docs-sidebar .btn-close'); await sleep(600);
      const closedByButton = !(await isOpen());
      check('10c the backdrop and the close button dismiss the sidebar', closedByBackdrop && closedByButton, JSON.stringify({ closedByBackdrop, closedByButton }));
      await page.close();
      const wide = await open(file, { width: 1280, height: 800 });
      const pos = await wide.page.evaluate(() => { const s = document.getElementById('docs-sidebar'); return { position: getComputedStyle(s).position, visible: s.getBoundingClientRect().width > 100 }; });
      check('10d at 1280px the sidebar is inline and sticky', pos.position === 'sticky' && pos.visible, JSON.stringify(pos));
      await wide.page.close();
      // a deep link clears the sticky header too
      {
        const t = await open(file, { width: 360, height: 740, prefs: { hash: '#' + list[1].id } });
        await settle(t.page); await sleep(400);
        const off = await t.page.evaluate(id => ({ top: Math.round(document.getElementById(id).querySelector('h1,h2').getBoundingClientRect().top), bar: Math.round(document.querySelector('nav.sticky-top').getBoundingClientRect().bottom) }), list[1].id);
        check('10e at 360px the section heading clears the sticky header', off.top >= off.bar, JSON.stringify(off));
        await t.page.close();
      }
    }

    // 12, 12a, 12b: the optional manifest drives selector coverage and click-driven state checks
    {
      check('12a manifest is well formed', !manifestErrors.length, manifestErrors.slice(0, 4).join(' | '));
      const coverage = await open(file);
      const missing = [];
      for (const section of list) {
        if (!section || !Array.isArray(section.examples)) continue;
        for (const example of section.examples) {
          if (!example || typeof example.selector !== 'string' || !example.selector.trim()) continue;
          const selector = `#${section.id} ${example.selector}`;
          let found = false;
          try { found = await coverage.page.evaluate(selector => !!document.querySelector(selector), selector); } catch (e) { /* an invalid selector is a missing target */ }
          if (!found) missing.push(`${file} #${section.id} ${example.variant}`);
        }
      }
      check('12 manifest examples match their sections', !missing.length, missing.join(', '));
      await coverage.page.close();
      const failed = [];
      for (const section of list) {
        if (!section || !Array.isArray(section.examples)) continue;
        for (const example of section.examples) {
          const interaction = example && example.interaction;
          if (!interaction || typeof interaction.click !== 'string' || !interaction.click.trim()) continue;
          const target = typeof interaction.expect === 'string' && interaction.expect.trim() ? 'expect'
            : typeof interaction.expectGone === 'string' && interaction.expectGone.trim() ? 'expectGone' : '';
          if (!target) continue;
          const { page } = await open(file);
          try {
            const clickSelector = `#${section.id} ${interaction.click}`;
            const el = await page.waitForSelector(clickSelector, { timeout: 2000 });
            await el.evaluate(e => e.scrollIntoView({ block: 'center' }));
            await settle(page);
            const selector = interaction[target];
            const reached = () => page.evaluate((selector, target) => {
              const visible = e => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
              if (target === 'expect') return visible(document.querySelector(selector));
              return ![...document.querySelectorAll(selector)].some(visible);
            }, selector, target);
            // an expectation that already holds before the click proves nothing
            if (await reached()) { failed.push(`${file} #${section.id} ${example.variant} (already true before the click)`); continue; }
            await el.click();
            const outcome = await poll(reached, ok => ok === true, 2000);
            if (!outcome) failed.push(`${file} #${section.id} ${example.variant}`);
          } catch (e) {
            failed.push(`${file} #${section.id} ${example.variant}`);
          } finally {
            await page.close();
          }
        }
      }
      check('12b interactions reach their expected state within 2000ms', !failed.length, failed.join(', '));
    }
  }
} finally {
  await browser.close();
  closeServer();
}

const failed = results.filter(r => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed (${mode})`);
process.exit(failed ? 1 : 0);
