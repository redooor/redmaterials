// In-page contrast engine (injected by scripts/browser/contrast-audit.mjs; also exercised by its --selftest).
// Defines window.__contrast = { auditElement, auditTree, ratio }.
//
// For one text-bearing element it computes the foreground colour, the EFFECTIVE background by alpha-compositing every
// ancestor layer (plus Bootstrap's table-cell paint, an inset box-shadow with a huge spread), applies inherited opacity,
// and returns { ratio, large, status: 'ok' | 'low' | 'unverified', reason }.
(function () {
  function parse(c) {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(parseFloat);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  function over(top, bottom) {           // composite `top` (with alpha) over an opaque `bottom`
    const a = top[3];
    return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
  }
  function lum(c) {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  }
  function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  // Layers painted behind the text of `el`, top-most first. Returns { layers, unverified }.
  function layersFor(el, stopAt) {
    const layers = []; let unverified = '';
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const sh = cs.boxShadow;
      if (sh && sh !== 'none') {
        // Bootstrap paints table cells with `inset 0 0 0 9999px <colour>`
        const m = sh.match(/(rgba?\([^)]+\))\s+0px\s+0px\s+0px\s+(\d+)px\s+inset|inset\s+0px\s+0px\s+0px\s+(\d+)px\s+(rgba?\([^)]+\))/);
        if (m) { const c = parse(m[1] || m[4]); if (c && c[3] > 0 && parseInt(m[2] || m[3], 10) >= 500) layers.push(c); }
      }
      const bi = cs.backgroundImage;
      if (bi && bi !== 'none' && /gradient/.test(bi)) { unverified = unverified || 'gradient background'; }
      else if (bi && bi !== 'none') { unverified = unverified || 'image background'; }
      const bg = parse(cs.backgroundColor);
      if (bg && bg[3] > 0) { layers.push(bg); if (bg[3] >= 1) return { layers, unverified }; }
      if (n === stopAt) break;
    }
    return { layers, unverified };
  }

  function effectiveBackground(el) {
    const { layers, unverified } = layersFor(el);
    const root = getComputedStyle(document.documentElement).backgroundColor, canvas = parse(root);
    let base = canvas && canvas[3] > 0 ? over(canvas, [255, 255, 255, 1]) : (getComputedStyle(document.documentElement).colorScheme.indexOf('dark') === 0 ? [0, 0, 0, 1] : [255, 255, 255, 1]);
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return { color: base, unverified };
  }

  function blend(c, b, o) { return [c[0] * o + b[0] * (1 - o), c[1] * o + b[1] * (1 - o), c[2] * o + b[2] * (1 - o), 1]; }

  // The outermost ancestor-or-self with opacity < 1: its subtree is composited as a unit (text and background dim together).
  function opacityGroupTop(el) { let top = null; for (let n = el; n && n.nodeType === 1; n = n.parentElement) if (parseFloat(getComputedStyle(n).opacity) < 1) top = n; return top; }

  function judge(el, fgCss, sizeEl) {
    const cs = getComputedStyle(sizeEl || el);
    const fg = parse(fgCss);
    if (!fg) return null;
    const T = opacityGroupTop(el);
    let bgInfo, backdrop = null, O = 1;
    if (T) {
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) O *= parseFloat(getComputedStyle(n).opacity);
      backdrop = T.parentElement ? effectiveBackground(T.parentElement) : { color: [255, 255, 255, 1], unverified: '' };
      const inner = layersFor(el, T);
      let base = backdrop.color;
      for (let i = inner.layers.length - 1; i >= 0; i--) base = over(inner.layers[i], base);
      bgInfo = { color: base, unverified: inner.unverified || backdrop.unverified };
    } else {
      bgInfo = effectiveBackground(el);
    }
    let text = over(fg, bgInfo.color), bgc = bgInfo.color;
    if (T) { text = blend(text, backdrop.color, O); bgc = blend(bgc, backdrop.color, O); }
    const r = ratio(text, bgc);
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    return { ratio: Math.round(r * 100) / 100, large, need, status: bgInfo.unverified ? 'unverified' : (r >= need ? 'ok' : 'low'), reason: bgInfo.unverified,
      fg: text.slice(0, 3).map(Math.round).join(','), bg: bgc.slice(0, 3).map(Math.round).join(',') };
  }

  function visible(el) {
    if (!el.getClientRects().length) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0;
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

  function auditElement(el) {
    const out = [];
    if (hasOwnText(el) && visible(el) && !exempt(el)) {
      const j = judge(el, getComputedStyle(el).color);
      if (j) out.push({ kind: 'text', key: path(el), tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60), text: el.textContent.trim().slice(0, 30), ...j });
    }
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.getAttribute('placeholder') && visible(el) && !exempt(el)) {
      const j = judge(el, getComputedStyle(el, '::placeholder').color, el);
      if (j) out.push({ kind: 'placeholder', key: path(el) + '::placeholder', tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 60), text: el.getAttribute('placeholder').slice(0, 30), ...j });
    }
    return out;
  }
  // Component classification for the failure report (first match wins)
  const COMPONENTS = [['modal', '.modal'], ['toast', '.toast'], ['popover', '.popover, .tooltip'], ['dropdown', '.dropdown-menu'], ['navbar', '.navbar'],
    ['nav-sidebar', '.nav-sidebar, .nav-sidebar-wrapper'], ['pagination', '.pagination'], ['nav/tabs', '.nav'], ['list-group', '.list-group'], ['table', 'table'],
    ['card', '.card'], ['alert', '.alert'], ['badge', '.badge'], ['btn', '.btn'], ['form', '.form-control, .form-select, .form-check, .form-range, .input-group, label'],
    ['progress', '.progress'], ['well', '.well'], ['ribbon', '.corner-ribbon'], ['snippet', 'pre.docs-snippet'], ['breadcrumb', '.breadcrumb'], ['docs chrome', '#docs-sidebar, nav.sticky-top, footer']];
  function component(el) { for (const [name, sel] of COMPONENTS) { if (el.closest(sel)) return name; } return /^(h[1-6]|p|li|dt|dd|a|small|code|blockquote)$/.test(el.tagName.toLowerCase()) ? 'prose' : 'other'; }

  // chromeSel: elements that belong to the docs chrome / prose (an absolute contrast requirement)
  function auditTree(root, chromeSel) {
    const out = [];
    for (const el of [root, ...root.querySelectorAll('*')]) {
      if (el.closest('script, style')) continue;
      for (const r of auditElement(el)) { r.chrome = !!chromeSel && (el.matches(chromeSel) || !!el.closest(chromeSel)); r.section = (el.closest('main [id]') || {}).id || ''; r.comp = component(el); out.push(r); }
    }
    return out;
  }
  // Large neutral light surfaces: elements that paint their own near-white background (rule 2 of the dark audit)
  function lightSurfaces(root, allowSelectors) {
    const out = [];
    for (const el of [root, ...root.querySelectorAll('*')]) {
      if (el.closest('script, style') || !visible(el)) continue;
      const r = el.getBoundingClientRect(); if (r.width * r.height <= 1000) continue;
      const cs = getComputedStyle(el), own = parse(cs.backgroundColor);
      const paints = (own && own[3] >= 0.5) || (cs.boxShadow !== 'none' && /9999px/.test(cs.boxShadow));
      if (!paints) continue;
      const bg = effectiveBackground(el).color;
      if (lum(bg) <= 0.8) continue;
      if (allowSelectors.some(sel => { try { return !!el.closest(sel); } catch (e) { return false; } })) continue;
      out.push({ key: path(el), comp: component(el), tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 70), bg: bg.slice(0, 3).map(Math.round).join(','), section: (el.closest('main [id]') || {}).id || '' });
    }
    return out;
  }
  window.__contrast = { auditElement, auditTree, lightSurfaces, ratio, path };
}());
