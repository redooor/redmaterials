// Shared plumbing for the browser scripts: Chrome path, a base URL for file | http | URL, forced pseudo-state sampling.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const chromePath = process.env.CHROME || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function resolveBase(mode, docsDir) {
  if (mode === 'http') {
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
    const server = http.createServer((q, r) => {
      const f = path.join(docsDir, decodeURIComponent(q.url.split('?')[0]).replace(/\/$/, '/index.html'));
      fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } });
    });
    await new Promise(r => server.listen(0, r));
    return { base: `http://localhost:${server.address().port}/`, close: () => server.close() };
  }
  if (mode === 'file') return { base: pathToFileURL(docsDir).href + '/', close: () => {} };
  return { base: mode.endsWith('/') ? mode : mode + '/', close: () => {} };
}

// A sample of interactive elements, exercised under forced :hover and :focus (through the DevTools protocol).
export const SAMPLES = ['.btn:not(:disabled):not(.disabled)', '.nav-link', '.dropdown-item', '.page-link', '.list-group-item-action', '.form-control', '.form-select', 'tbody tr', 'a:not(.btn):not(.nav-link)'];
export const STATES = ['hover', 'focus'];

// Calls fn(label, objectId) for the first, middle and last element of every sample selector under each forced state.
export async function forEachForcedState(cdp, fn) {
  const { root: doc } = await cdp.send('DOM.getDocument', { depth: -1 });
  for (const sel of SAMPLES) {
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: doc.nodeId, selector: `main ${sel}, #docs-sidebar ${sel}` });
    const picks = [...new Set([0, Math.floor(nodeIds.length / 2), nodeIds.length - 1].filter(i => i >= 0 && i < nodeIds.length))].map(i => nodeIds[i]);
    for (const nodeId of picks) {
      for (const st of STATES) {
        await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [st] });
        const { object } = await cdp.send('DOM.resolveNode', { nodeId });
        await fn(`${st}:${sel}`, object.objectId);
        await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
      }
    }
  }
}
