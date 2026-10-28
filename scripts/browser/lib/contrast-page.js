// In-page contrast engine (injected by scripts/browser/contrast-audit.mjs; also exercised by its --selftest).
// Defines window.__contrast = { auditElement, auditTree, lightSurfaces, isChrome, ratio, path }.
//
// Model: the colours a user sees for an element's text are computed by painting the ancestor chain from <html> to the element
// onto the document canvas, group by group: every ancestor-or-self with opacity < 1 is composited as a unit (its content is
// built first, then blended into its parent at that opacity), backgrounds are alpha-composited in paint order, and Bootstrap's
// table-cell paint (an inset box-shadow with a huge spread) is a layer above the cell's background. The text pixel and the
// background pixel are rendered separately and their WCAG contrast ratio is judged.
//
// Anything the model cannot represent is reported as status 'unverified' with a reason (never silently dropped): colour
// syntaxes other than rgb() / color(srgb), gradients and images behind text, blend modes, filters, backdrop filters,
// background-clip: text, and text covered by another painted element.
(function () {
  function parse(c) {
    if (!c) return null;
    c = c.trim();
    if (c === 'transparent') return [0, 0, 0, 0];
    let m = c.match(/^rgba?\(([^)]+)\)$/);
    if (m) { const p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    m = c.match(/^color\(srgb\s+([^)]+)\)$/);
    if (m) { const p = m[1].split(/[\s/]+/).filter(Boolean).map(parseFloat); return [p[0] * 255, p[1] * 255, p[2] * 255, p.length > 3 ? p[3] : 1]; }
    return null;   // lab(), oklab(), oklch(), color(display-p3 ...): unsupported
  }
  const isTransparentKeyword = c => c === 'transparent' || c === 'rgba(0, 0, 0, 0)';
  function overRGBA(top, bottom) {   // alpha compositing of two non-premultiplied RGBA colours
    const ta = top[3], ba = bottom[3], oa = ta + ba * (1 - ta);
    if (oa <= 0) return [0, 0, 0, 0];
    return [(top[0] * ta + bottom[0] * ba * (1 - ta)) / oa, (top[1] * ta + bottom[1] * ba * (1 - ta)) / oa, (top[2] * ta + bottom[2] * ba * (1 - ta)) / oa, oa];
  }
  function lum(c) {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  }
  function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  // The user agent canvas under the page's own backgrounds: resolve the system colour `Canvas` for the page's ACTIVE colour scheme
  let canvasCache = null;
  function canvasColor() {
    if (canvasCache) return canvasCache;
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;width:0;height:0;background-color:Canvas';
    document.documentElement.appendChild(d);
    const c = parse(getComputedStyle(d).backgroundColor);
    d.remove();
    return (canvasCache = c ? [c[0], c[1], c[2], 1] : [255, 255, 255, 1]);
  }

  // Paint features that make the compositing model unreliable
  function unsupportedPaint(cs) {
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return /gradient/.test(cs.backgroundImage) ? 'gradient background' : 'image background';
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') return 'mix-blend-mode';
    if (cs.filter && cs.filter !== 'none') return 'filter';
    if (cs.backdropFilter && cs.backdropFilter !== 'none') return 'backdrop-filter';
    if (/text/.test(cs.webkitBackgroundClip || cs.backgroundClip || '')) return 'background-clip: text';
    return '';
  }

  function nodesDown(el) { const a = []; for (let n = el; n && n.nodeType === 1; n = n.parentElement) a.unshift(n); return a; }

  // Renders the chain html .. el as RGBA over transparent, optionally with a text layer on top of the last node.
  function renderChain(nodes, textColor) {
    let unverified = '';
    function render(i) {
      const n = nodes[i], cs = getComputedStyle(n);
      let content = [0, 0, 0, 0];
      const bgRaw = cs.backgroundColor, bg = parse(bgRaw);
      if (!bg && !isTransparentKeyword(bgRaw)) unverified = unverified || 'unsupported colour syntax (' + bgRaw.slice(0, 24) + ')';
      if (bg && bg[3] > 0) content = overRGBA(bg, content);
      const sh = cs.boxShadow;
      if (sh && sh !== 'none') {   // Bootstrap paints table cells with `inset 0 0 0 9999px <colour>`
        const m = sh.match(/(rgba?\([^)]+\)|color\(srgb[^)]+\))\s+0px\s+0px\s+0px\s+(\d+)px\s+inset|inset\s+0px\s+0px\s+0px\s+(\d+)px\s+(rgba?\([^)]+\)|color\(srgb[^)]+\))/);
        if (m) { const c = parse(m[1] || m[4]); if (c && c[3] > 0 && parseInt(m[2] || m[3], 10) >= 500) content = overRGBA(c, content); }
      }
      unverified = unverified || unsupportedPaint(cs);
      if (i < nodes.length - 1) content = overRGBA(render(i + 1), content);
      else if (textColor) content = overRGBA(textColor, content);
      const o = parseFloat(cs.opacity);
      return o < 1 ? [content[0], content[1], content[2], content[3] * o] : content;
    }
    return { color: render(0), unverified };
  }

  // The colours of the background pixel and the text pixel of `el`, over the canvas.
  // extraBg: a background painted above the element's own chain (a pseudo-element's background)
  function pixels(el, fg, extraBg) {
    const nodes = nodesDown(el), canvas = canvasColor();
    const bg = renderChain(nodes, null), tx = renderChain(nodes, fg);
    let bgPix = overRGBA(bg.color, canvas), txBase = overRGBA(tx.color, canvas);
    if (extraBg && extraBg[3] > 0) { bgPix = overRGBA(extraBg, bgPix); txBase = overRGBA(fg, bgPix); }
    return { bg: bgPix, text: txBase, unverified: bg.unverified || tx.unverified };
  }

  function visible(el) {
    if (!el.getClientRects().length) return false;
    const own = getComputedStyle(el);
    if (own.visibility !== 'visible' || own.display === 'none') return false;   // a descendant may restore visibility an ancestor hid
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) if (parseFloat(getComputedStyle(n).opacity) === 0) return false;
    return true;
  }
  // Text covered by another painted element (overlays, sticky bars): every element above `el` at a point of its glyph box is checked,
  // including transparent children of a translucent overlay. Returns a reason string, or ''.
  function coveredBy(el) {
    let r;
    try { const rg = document.createRange(); rg.selectNodeContents(el); r = [...rg.getClientRects()].find(x => x.width > 1 && x.height > 1); } catch (e) { /* ignore */ }
    r = r || el.getClientRects()[0];
    if (!r) return '';
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return '';
    const list = document.elementsFromPoint(x, y);
    const mine = list.findIndex(e => e === el || el.contains(e));
    const above = mine < 0 ? list : list.slice(0, mine);
    for (const c of above) {
      if (c.contains(el) || el.contains(c)) continue;
      const cs = getComputedStyle(c), bg = parse(cs.backgroundColor);
      if ((bg && bg[3] > 0) || (cs.backgroundImage && cs.backgroundImage !== 'none')) return 'covered by ' + c.tagName.toLowerCase() + (c.className ? '.' + String(c.className).split(' ')[0] : '');
    }
    return '';
  }

  function judge(el, fgCss, opts) {
    const o = opts || {};
    const cs = getComputedStyle(o.sizeEl || el);
    const fgRaw = parse(fgCss);
    if (!fgRaw) return { ratio: 0, large: false, need: 4.5, status: 'unverified', reason: 'unsupported colour syntax (' + String(fgCss).slice(0, 24) + ')', fg: '', bg: '' };
    const fg = [fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * (o.extraOpacity == null || isNaN(o.extraOpacity) ? 1 : o.extraOpacity)];
    const px = pixels(el, fg, o.extraBg);
    const reason = px.unverified || o.unverified || coveredBy(el);
    const r = ratio(px.text, px.bg);
    const size = parseFloat(o.typo ? o.typo.size : cs.fontSize), bold = parseInt(o.typo ? o.typo.weight : cs.fontWeight, 10) >= 700;   // generated text and placeholders carry their own typography
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    return { ratio: Math.round(r * 100) / 100, large, need, status: reason ? 'unverified' : (r >= need ? 'ok' : 'low'), reason,
      fg: px.text.slice(0, 3).map(Math.round).join(','), bg: px.bg.slice(0, 3).map(Math.round).join(',') };
  }

  function hasOwnText(el) { for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true; return false; }
  function exempt(el) { return !!el.closest('[disabled], .disabled, [aria-disabled="true"], .visually-hidden'); }
  function path(el) {
    const p = [];
    for (let n = el; n && n.nodeType === 1 && n !== document.documentElement; n = n.parentElement) {
      const same = n.parentElement ? [...n.parentElement.children].filter(c => c.tagName === n.tagName) : [n];
      p.unshift(n.tagName.toLowerCase() + (same.length > 1 ? ':' + (same.indexOf(n) + 1) : ''));
    }
    return p.join('>');
  }
  const TEXT_INPUT = /^(text|search|email|url|tel|password|number|date|datetime-local|month|week|time|submit|button|reset)$/i;

  function auditElement(el) {
    canvasCache = null;
    const out = [];
    if (!visible(el) || exempt(el)) return out;
    const cs0 = getComputedStyle(el);
    const rec = (kind, key, j, text) => { if (j) out.push({ kind, key, tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60), text: String(text).trim().slice(0, 30), ...j }); };
    const fill = cs0.webkitTextFillColor || cs0.color;
    if (hasOwnText(el)) rec('text', path(el), judge(el, fill), el.textContent);
    // visible form values (an input's value is not a DOM text node)
    if ((el.tagName === 'INPUT' && TEXT_INPUT.test(el.type) && el.value) || (el.tagName === 'TEXTAREA' && el.value) || (el.tagName === 'SELECT' && el.selectedOptions.length)) {
      rec('value', path(el) + '::value', judge(el, fill), el.tagName === 'SELECT' ? el.selectedOptions[0].textContent : el.value);
    }
    // native controls whose label is drawn by the browser (file input button, submit/reset/button without a value) cannot be judged
    if (el.tagName === 'INPUT' && (el.type === 'file' || (/^(submit|reset|button)$/i.test(el.type) && !el.value))) {
      rec('native', path(el) + '::native', { ratio: 0, large: false, need: 4.5, status: 'unverified', reason: 'native control label (' + el.type + ')', fg: '', bg: '' }, el.type);
    }
    // placeholders are visible only while the field is empty; they carry their own colour and opacity
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.getAttribute('placeholder') && !el.value) {
      const ph = getComputedStyle(el, '::placeholder');
      rec('placeholder', path(el) + '::placeholder', judge(el, ph.webkitTextFillColor && ph.webkitTextFillColor !== 'rgba(0, 0, 0, 0)' ? ph.webkitTextFillColor : ph.color, { extraOpacity: parseFloat(ph.opacity), sizeEl: el, typo: { size: ph.fontSize, weight: ph.fontWeight } }), el.getAttribute('placeholder'));
    }
    // generated text (::before / ::after with a string content, for example the mobile table labels)
    for (const pe of ['::before', '::after']) {
      const p = getComputedStyle(el, pe), c = p.content;
      if (c && c !== 'none' && c !== 'normal' && /^["'].+["']$/.test(c) && p.display !== 'none') {
        const pbg = parse(p.backgroundColor), paint = unsupportedPaint(p);
        rec('pseudo', path(el) + pe, judge(el, p.webkitTextFillColor || p.color, { extraOpacity: parseFloat(p.opacity), extraBg: pbg, typo: { size: p.fontSize, weight: p.fontWeight }, unverified: paint ? 'pseudo-element: ' + paint : '' }), c.slice(1, -1));
      }
    }
    return out;
  }

  // opts: { chromeBase, prose, exclude } selectors. Chrome = the docs shell plus authored prose that is not itself a component.
  function isChrome(el, opts) {
    if (!opts) return false;
    if (opts.chromeBase && (el.matches(opts.chromeBase) || el.closest(opts.chromeBase))) return true;
    if (opts.prose && el.matches(opts.prose) && el.closest('main') && !(opts.exclude && el.closest(opts.exclude))) return true;
    return false;
  }
  const COMPONENTS = [['modal', '.modal'], ['toast', '.toast'], ['popover', '.popover, .tooltip'], ['dropdown', '.dropdown-menu'], ['navbar', '.navbar'],
    ['nav-sidebar', '.nav-sidebar, .nav-sidebar-wrapper'], ['pagination', '.pagination'], ['nav/tabs', '.nav'], ['list-group', '.list-group'], ['table', 'table'],
    ['card', '.card'], ['alert', '.alert'], ['badge', '.badge'], ['btn', '.btn'], ['form', '.form-control, .form-select, .form-check, .form-range, .input-group, label'],
    ['progress', '.progress'], ['well', '.well'], ['ribbon', '.corner-ribbon'], ['snippet', 'pre.docs-snippet'], ['breadcrumb', '.breadcrumb'], ['docs chrome', '#docs-sidebar, nav.sticky-top, footer']];
  function component(el) {
    for (const [name, sel] of COMPONENTS) { if (el.closest(sel)) return name; }
    return /^(h[1-6]|p|li|dt|dd|a|small|code|blockquote)$/.test(el.tagName.toLowerCase()) ? 'prose' : 'other';
  }

  function auditTree(root, opts) {
    canvasCache = null;
    const out = [];
    for (const el of [root, ...root.querySelectorAll('*')]) {
      if (el.closest('script, style')) continue;
      for (const r of auditElement(el)) { r.chrome = isChrome(el, opts); r.section = (el.closest('main [id]') || {}).id || ''; r.comp = component(el); out.push(r); }
    }
    return out;
  }
  // Elements that paint their own near-white background (rule 2 of the dark audit). An allowlist entry exempts only the element
  // that matches it (the paint owner), never its descendants: those must pass, or be listed themselves.
  function lightSurfaces(root, allowSelectors) {
    canvasCache = null;
    const out = [];
    for (const el of [root, ...root.querySelectorAll('*')]) {
      if (el.closest('script, style') || !visible(el)) continue;
      const r = el.getBoundingClientRect(); if (r.width * r.height <= 1000) continue;
      const cs = getComputedStyle(el), own = parse(cs.backgroundColor);
      const paints = (own && own[3] >= 0.5) || (cs.boxShadow !== 'none' && /9999px/.test(cs.boxShadow));
      if (!paints) continue;
      const px = pixels(el, [0, 0, 0, 0]);
      if (lum(px.bg) <= 0.8) continue;
      if (allowSelectors.some(sel => { try { return el.matches(sel); } catch (e) { return false; } })) continue;
      out.push({ key: path(el), comp: component(el), tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 70), bg: px.bg.slice(0, 3).map(Math.round).join(','), section: (el.closest('main [id]') || {}).id || '' });
    }
    return out;
  }
  window.__contrast = { auditElement, auditTree, lightSurfaces, isChrome, ratio, path };
}());
