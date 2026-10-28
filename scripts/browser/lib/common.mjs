// Shared plumbing for the browser scripts: Chrome path, a base URL for file | http | URL, systematic forced-state sampling.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const chromePath = process.env.CHROME || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function resolveBase(mode, docsDir) {
  if (mode === 'http') {
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
    const rootDir = path.resolve(docsDir);
    const server = http.createServer((q, r) => {
      let rel;
      try { rel = decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'); } catch (e) { r.writeHead(400); r.end(); return; }
      const f = path.resolve(rootDir, '.' + path.sep + rel);
      if (f !== rootDir && !f.startsWith(rootDir + path.sep)) { r.writeHead(403); r.end(); return; }   // stay inside the docs directory
      fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));   // loopback only
    return { base: `http://localhost:${server.address().port}/`, close: () => server.close() };
  }
  if (mode === 'file') return { base: pathToFileURL(docsDir).href + '/', close: () => {} };
  return { base: mode.endsWith('/') ? mode : mode + '/', close: () => {} };
}

// Interactive component families, exercised per DISTINCT VARIANT (tag + class signature), not by position.
export const SAMPLES = ['.btn:not(:disabled):not(.disabled)', '.nav-link', '.dropdown-item', '.page-link', '.list-group-item-action', '.form-control', '.form-select',
  '.form-check-input', '.form-range', 'tbody tr', 'a:not(.btn):not(.nav-link):not(.dropdown-item):not(.page-link)', '.badge', '.navbar-toggler', '.accordion-button'];
export const STATES = ['hover', 'focus', 'active', 'focus-visible'];
export const MAX_PER_SAMPLE = 25;

// Marks one element per distinct variant of each sample selector with data-audit-pick.
export async function markSamples(page) {
  return page.evaluate((samples, max) => {
    let n = 0;
    document.querySelectorAll('[data-audit-pick]').forEach(e => e.removeAttribute('data-audit-pick'));
    for (const sel of samples) {
      const seen = new Set();
      for (const el of document.querySelectorAll('main ' + sel + ', #docs-sidebar ' + sel)) {
        const sig = el.tagName + '|' + String(el.className).replace(/\b(mb|mt|me|ms|mx|my|px|py|p|pt|pb)-\d\b/g, '').replace(/\s+/g, ' ').trim() + '|' + (el.getAttribute('type') || '');
        if (seen.has(sig) || seen.size >= max) continue;
        seen.add(sig); el.setAttribute('data-audit-pick', String(n++));
      }
    }
    return n;
  }, SAMPLES, MAX_PER_SAMPLE);
}
export async function clearSamples(page) { await page.evaluate(() => document.querySelectorAll('[data-audit-pick]').forEach(e => e.removeAttribute('data-audit-pick'))); }

// Calls fn(label, objectId) for every marked sample under every forced state.
export async function forEachForcedState(cdp, page, fn) {
  await markSamples(page);
  const { root: doc } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: doc.nodeId, selector: '[data-audit-pick]' });
  for (const nodeId of nodeIds) {
    for (const st of STATES) {
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [st] });
      const { object } = await cdp.send('DOM.resolveNode', { nodeId });
      await fn(st, object.objectId);
    }
    await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
  }
  await clearSamples(page);
}

// Shows every tooltip and popover on the page (Bootstrap API), runs fn, then hides them again.
export async function withOverlaysOpen(page, fn) {
  const n = await page.evaluate(() => {
    let k = 0;
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => { bootstrap.Tooltip.getOrCreateInstance(el).show(); k++; });
    document.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => { bootstrap.Popover.getOrCreateInstance(el).show(); k++; });
    return k;
  });
  await sleep(300);
  try { return await fn(n); } finally {
    // dispose (not hide) so the generated .tooltip / .popover elements leave the DOM at once: later DOM paths must not depend on timing
    await page.evaluate(() => {
      document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => { const i = bootstrap.Tooltip.getInstance(el); if (i) i.dispose(); });
      document.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => { const i = bootstrap.Popover.getInstance(el); if (i) i.dispose(); });
      document.querySelectorAll('.tooltip, .popover').forEach(e => e.remove());
    });
  }
}

// Validates the docs' state controls and forces a theme and colour mode; throws if the page did not end up in that state.
export async function setDocsState(page, theme, mode) {
  const ok = await page.evaluate((t, m) => {
    if (typeof docsState === 'undefined') return 'docsState is not defined on this page';
    docsState.set({ theme: t, mode: m });
    const r = document.documentElement, link = document.getElementById('redmaterials-css');
    if (r.getAttribute('data-docs-theme') !== t) return 'data-docs-theme is ' + r.getAttribute('data-docs-theme');
    if (r.getAttribute('data-bs-theme') !== m) return 'data-bs-theme is ' + r.getAttribute('data-bs-theme');
    if (!!link.disabled !== (t === 'bootstrap')) return 'redmaterials.css disabled=' + link.disabled;
    return '';
  }, theme, mode);
  if (ok) throw new Error('could not set the docs to ' + theme + ' x ' + mode + ': ' + ok);
}
