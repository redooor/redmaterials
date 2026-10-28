#!/usr/bin/env node
// Lists every colour-bearing declaration of dist/css/redmaterials.css with its selector, property, value and the
// Sass source file:line (through the source map), de-duplicated by source location, with a SUGGESTED role.
// The roles drive the dark-mode tokens (scss/COLOR-ROLES.md); the suggestion is a starting point, a human decides.
//
//   node scripts/audit-colors.mjs [--markdown] [--json]
//
// Roles: surface, surface-translucent, text, text-muted, divider, shadow, overlay, interaction-surface,
//        identity (brand and palette colours, same in both modes), image (data-URL icons)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { SourceMapConsumer } from 'source-map-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cssFile = path.join(root, 'dist/css/redmaterials.css');
const css = fs.readFileSync(cssFile, 'utf8');
const consumer = new SourceMapConsumer(JSON.parse(fs.readFileSync(cssFile + '.map', 'utf8')));

const norm = hex => { hex = hex.toLowerCase(); return hex.length === 4 ? '#' + [...hex.slice(1)].map(c => c + c).join('') : hex.slice(0, 7); };
// Identity colours: the Material hues and brand colours. Greys and blue-greys are NEUTRALS (text, dividers, surfaces)
// and need their own dark treatment, so they are not identity colours.
const palette = new Set();
for (const f of ['scss/colors.scss', 'scss/variables.scss']) {
  for (const m of fs.readFileSync(path.join(root, f), 'utf8').matchAll(/^\s*\$([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\b/gm)) {
    const name = m[1];
    const brandColour = /^brand-(primary|secondary|warning|danger|success|info)$/.test(name);
    const hue = f.endsWith('colors.scss') && !/^(grey|gray|blue-grey|white|black)/.test(name);
    if (brandColour || hue) palette.add(norm(m[2]));   // neutrals (greys, white, black, text and table colours) are never identity colours
  }
}
const NEUTRALS = new Set(['#fff', '#ffffff', '#000', '#000000']);
const NAMED_COLOURS = 'white|black|transparent|currentcolor|red|green|blue|gray|grey|silver|yellow|orange|navy|lime|aqua|teal|olive|maroon|purple|fuchsia|pink|brown|gold|ivory|beige|whitesmoke|gainsboro|lightgray|lightgrey|darkgray|darkgrey|dimgray|dimgrey|canvas|canvastext|buttonface|buttontext|highlight|highlighttext|linktext|graytext';
const LITERAL = new RegExp(`#[0-9a-fA-F]{3,8}\\b|rgba?\\(|hsla?\\(|color-mix\\(|(?:oklch|oklab|lab|lch)\\(|url\\(\\s*["']?data:|\\b(?:${NAMED_COLOURS})\\b`, 'i');
// custom properties (the --bs-* values Redmaterials defines) are colour-bearing too
const COLOR_PROPS = /^(--[\w-]+|color|background|background-color|border(-[a-z]+)*|outline(-color)?|box-shadow|text-shadow|fill|stroke|caret-color|text-decoration(-color)?|-webkit-text-fill-color|filter|background-image|accent-color|scrollbar-color)$/;

// Roles that need a dark-mode treatment: surface, surface-translucent, text, text-muted, divider, shadow, overlay,
// interaction-surface, image. Roles that stay the same in both modes: fixed (brand/palette identity colours, white text on
// coloured backgrounds, transparent). `review` = the heuristic could not decide.
const isGrey = v => { const cs = [...v.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/g)]; if (!cs.length) return false; return cs.every(m => { const c = m[1] ? (m[1].length === 3 ? [...m[1]].map(x => parseInt(x + x, 16)) : [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16))) : [m[2], m[3], m[4]].map(Number); return Math.max(...c) - Math.min(...c) <= 3; }); };

// Names of custom properties tell the role (--bs-table-striped-bg, --bs-btn-hover-color, ...)
function suggestCustomProperty(prop, value) {
  const n = prop.toLowerCase();
  if (/shadow/.test(n)) return 'shadow';
  if (/border/.test(n)) return 'divider';
  if (/(^|-)bg(-|$)|background/.test(n)) return /hover|active|focus|striped|accent|disabled/.test(n) ? 'interaction-surface' : (/rgba\(/.test(value) ? 'surface-translucent' : 'surface');
  if (/color|text|link/.test(n)) return /muted|secondary|disabled/.test(n) ? 'text-muted' : 'text';
  return 'review';
}

function suggest(src, selector, prop, value) {
  if (/url\(\s*["']?data:/.test(value)) return 'image';
  if (/^\s*transparent\s*$/i.test(value)) return 'fixed';
  // palette loops and variant mixins generate brand colours (the `default` variant is the one neutral; see COLOR-ROLES.md)
  if (/scss\/(loops\/|mixins\/(alerts|badges)\.scss|badges\.scss)/.test(src)) {
    if (/shadow/.test(prop)) return 'shadow';
    if (isGrey(value)) return /^background/.test(prop) ? (/:hover|:active|:focus|\.active/.test(selector) ? 'interaction-surface' : 'surface') : /^color$/.test(prop) ? 'text' : 'divider';   // shared neutral greys of the loops (flat-button states, ink)
    return 'fixed';
  }
  const hexes = [...value.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m => norm(m[0]));
  const alphas = [...value.matchAll(/rgba\([^)]*,\s*([\d.]+)\s*\)/g)].map(m => parseFloat(m[1]));
  const brandOnly = hexes.length && hexes.every(h => palette.has(h) && !NEUTRALS.has(h) && !/^#(333333|424242|f8f8f8|f8f9fa|343a40|eeeeee|dddddd|cccccc)$/.test(h)) && !/rgba\(\s*0,\s*0,\s*0|rgba\(\s*255,\s*255,\s*255/.test(value);
  const usesPrimaryVar = /var\(--bs-(primary|success|danger|warning|info)-rgb\)/.test(value);
  if (prop.startsWith('--')) {
    // light-only overrides are guarded from dark mode: there Bootstrap's own dark values apply
    if (/:not\(\[data-bs-theme=dark\]\)|\[data-bs-theme=light\]/.test(selector)) return 'light-only';
    if (/\.table-dark\b/.test(selector)) return 'fixed';                       // a dark table variant, dark in both modes
    if (/^\s*#fff(fff)?\s*$/i.test(value) && /hover|active|focus/.test(prop)) return 'fixed';   // white text on a brand fill
    if (brandOnly || usesPrimaryVar || /^--bs-(primary|secondary|success|danger|warning|info|light|dark)(-rgb)?$|^--bs-(link|focus)-/.test(prop)) return 'fixed';
    return suggestCustomProperty(prop, value);
  }
  if (/shadow/.test(prop)) {
    if (/^\s*inset/.test(value)) return brandOnly || usesPrimaryVar ? 'fixed' : 'divider';   // form/nav underlines
    if (usesPrimaryVar || brandOnly) return 'fixed';                                            // focus rings in the brand colour
    return 'shadow';
  }
  if (/overlay|backdrop/.test(selector)) return 'overlay';
  if (brandOnly || usesPrimaryVar) return 'fixed';
  if (/^color$|text-fill|fill|caret/.test(prop)) {
    if (/^#fff(fff)?$|^white$/i.test(value.trim())) return 'fixed';                              // white text on coloured backgrounds
    return alphas.some(a => a < 0.7) ? 'text-muted' : 'text';
  }
  if (/^border|^outline/.test(prop)) return 'divider';
  if (/^background/.test(prop)) {
    if (/:hover|:active|:focus|\.active|\.disabled|:disabled/.test(selector)) return 'interaction-surface';
    return alphas.length ? 'surface-translucent' : 'surface';
  }
  return 'review';
}

// Human review: source-line|property -> role, applied after the heuristic (see scss/COLOR-ROLES.md)
const overridesFile = path.join(root, 'scripts/color-roles.overrides.json');
const overrides = fs.existsSync(overridesFile) ? JSON.parse(fs.readFileSync(overridesFile, 'utf8')) : {};
const rows = new Map();
postcss.parse(css, { from: cssFile }).walkDecls(decl => {
  if (!COLOR_PROPS.test(decl.prop) || !LITERAL.test(decl.value) || /^var\(/.test(decl.value.trim()) && !LITERAL.test(decl.value.replace(/var\([^)]*\)/g, ''))) return;
  const pos = consumer.originalPositionFor({ line: decl.source.start.line, column: decl.source.start.column - 1 });
  const src = pos.source ? path.relative(root, path.resolve(path.dirname(cssFile), pos.source)) + ':' + pos.line : '(unmapped)';
  const rule = decl.parent;
  const selector = rule.type === 'rule' ? rule.selector.replace(/\s+/g, ' ') : rule.name;
  // one row per source line and property: loops (palette colours) expand one source line into many values
  const key = `${src}|${decl.prop}`;
  if (!rows.has(key)) rows.set(key, { src, prop: decl.prop, value: decl.value.replace(/\s+/g, ' '), values: new Set(), selectors: [], role: '' });
  const r = rows.get(key);
  r.values.add(decl.value.replace(/\s+/g, ' '));
  if (r.selectors.length < 3) r.selectors.push(selector.length > 70 ? selector.slice(0, 67) + '...' : selector);
  else if (r.selectors.length === 3) r.selectors.push('…');
  r.allGrey = (r.allGrey === undefined ? true : r.allGrey) && isGrey(decl.value);
  r.role = r.role || overrides[key] || suggest(src, selector, decl.prop, decl.value);
  r.reviewed = key in overrides;
});

const list = [...rows.values()].map(r => ({ ...r, values: [...r.values] })).sort((a, b) => a.src.localeCompare(b.src, undefined, { numeric: true }));
if (process.argv.includes('--json')) { console.log(JSON.stringify(list, null, 1)); process.exit(0); }
if (process.argv.includes('--doc')) {
  const byRole = {};
  for (const r of list) byRole[r.role] = (byRole[r.role] || 0) + 1;
  const table = list.map(r => `| \`${r.src}\` | \`${r.prop}\` | \`${r.value.replace(/\|/g, '\\|').replace(/url\(.*\)/, 'url(data:…)').slice(0, 70)}\`${r.values.length > 1 ? ` (+${r.values.length - 1})` : ''} | ${r.selectors.slice(0, 2).map(x => '`' + x.replace(/\|/g, '\\|').slice(0, 48) + '`').join(', ')} | ${r.role} |`).join('\n');
  console.log(`# Colour roles

Generated by \`node scripts/audit-colors.mjs --doc > scss/COLOR-ROLES.md\` from \`dist/css/redmaterials.css\` and its source map. One row per Sass source line and property (the palette loops expand one line into many values, shown as \`(+N)\`). The role is a heuristic suggestion (\`scripts/audit-colors.mjs\`), reviewed by hand; manual corrections go in \`scripts/color-roles.overrides.json\` (\`"<src>|<property>": "<role>"\`). Regenerate after changing the SCSS.

Phase B2 turns the roles that need a dark treatment into CSS custom properties (\`scss/_tokens.scss\`). Light values must equal today's computed values.

## Roles

| Role | Meaning | Dark mode |
|---|---|---|
| \`fixed\` | Brand and palette identity colours (\`$brand-*\`, \`bg-{color}\`, the palette loops), white text on a coloured background, \`transparent\`, brand-coloured focus rings and underlines | same in both modes |
| \`light-only\` | Light-palette overrides of Bootstrap's \`--bs-*-text-emphasis\`, \`-bg-subtle\`, \`-border-subtle\` (guarded by \`:root:not([data-bs-theme=dark])\`) | none: in dark Bootstrap's own dark values apply |
| \`text\`, \`text-muted\` | Neutral foreground colours | token |
| \`surface\`, \`surface-translucent\` | Neutral backgrounds (kept translucent where they are today) | token |
| \`divider\` | Neutral borders and inset underlines | token |
| \`interaction-surface\` | Neutral hover/active/focus/disabled backgrounds | token |
| \`shadow\` | Drop shadows (\`$shadow-depth-*\`, raised buttons, dropdown, modal, popover, navbar, ribbon) | token (lighter highlight, deeper shadow) |
| \`overlay\` | Scrims (nav-sidebar overlay) | token |
| \`image\` | Data-URL icons (select arrows) | dark variant of the image |

## Summary (${list.length} source declarations)

${Object.entries(byRole).sort((a, b) => b[1] - a[1]).map(([k, v]) => '* \`' + k + '\`: ' + v).join('\n')}

## Proposed token groups (to be confirmed in B2.2 against this table)

Where today's values differ they get separate tokens; nothing is forced into a shared token, and translucent surfaces stay translucent.

| Group | Today (light) | Source lines |
|---|---|---|
| Body text | \`#424242\` (also \`.btn-default\`) | \`scaffolding.scss:11\`, \`buttons.scss:45\` |
| Muted / disabled text | \`rgba(0,0,0,.26)\` disabled link button; \`#666\` input addon; \`#ccc\` sidebar sub-header | \`buttons.scss:50\`, \`input-groups.scss:10\`, \`nav-sidebar.scss:97\` |
| Translucent surface | \`rgba(250,250,250,.87)\` (modal, well) | \`modals.scss:21\`, \`wells.scss:9\`, \`variables.scss\` |
| Opaque surface | \`#fff\` nav-sidebar and its title; \`#fff\` default ribbon; \`#fff\` ripple ink | \`nav-sidebar.scss:20,33\`, \`ribbons.scss:15\`, \`ripples.scss:20\` |
| Field underline / dividers | \`#ddd\` (form, input group, nav tabs, well blockquote); \`#eee\` sidebar divider; \`#ccc\` breadcrumb chevron; \`#F5F5F5\` popover border; \`rgba(0,0,0,.15)\` | \`forms.scss\`, \`navs.scss\`, \`input-groups.scss\`, \`wells.scss\`, \`nav-sidebar.scss:101\`, \`navbar.scss:60\`, \`popover.scss:16\` |
| Control borders / disabled | \`#616161\` checkbox; \`#E0E0E0\` disabled checkbox/switch/range, plain select list | \`forms.scss:96-200\` |
| Interaction surfaces | \`#eee\` sidebar hover; \`#666\` sidebar active; \`rgb(229.5,…)\` pagination :active; flat-button hover/active/focus greys (\`#cccccc\`, \`rgb(229.5,…)\`) of the loops | \`nav-sidebar.scss:92,108\`, \`pagination.scss:35\`, \`loops/buttons.scss:31-40\`, \`loops/background.scss:30-39\` |
| Shadows | \`$shadow-depth-1..5\` (\`variables.scss\`) and the literal copies in \`buttons.scss\`, \`dropdowns.scss:16\`, \`modals.scss:26\`, \`navbar.scss:9\`, \`popover.scss:17\`, \`ribbons.scss:23\` | \`shadows.scss\` and the files listed |
| Overlay | \`rgba(0,0,0,.4)\` | \`nav-sidebar.scss:54-55\` |
| Images | select arrows (dark PNG data URLs) | \`forms.scss:52,66\` |

## Not covered by this table (handled in B2.2 by reading the source)

* **Neutral \`default\` variants inside the palette loops** (\`.btn-default\`, \`.bg-default\`, \`.border-default\`, \`.text-default\`, \`.nav-sidebar-default\`; \`#f8f8f8\` and its derived greys). They are generated by the same lines as the brand colours, so they are listed as \`fixed\` above, but they are neutrals and need a dark decision (keep light as a "light" button, or map to a surface).
* **Bootstrap-provided colours** that Redmaterials only remaps through \`--bs-*\` variables (\`_bootstrap5-theme.scss\`): they switch with \`data-bs-theme\` already.
* **Table cell paint** (Bootstrap paints striping/hover with an inset \`box-shadow\`; see \`tables.scss:8\`).

## Declarations

| Source | Property | Value | Example selectors | Role |
|---|---|---|---|---|
${table}
`);
  process.exit(0);
}
if (process.argv.includes('--markdown')) {
  console.log('| Source | Property | Value | Example selectors | Suggested role |\n|---|---|---|---|---|');
  for (const r of list) console.log(`| \`${r.src}\` | \`${r.prop}\` | \`${r.value.replace(/\|/g, '\\|').replace(/url\(.*\)/, 'url(data:…)').slice(0, 80)}\`${r.values.length > 1 ? ` (+${r.values.length - 1} more values)` : ''} | ${r.selectors.map(s => '`' + s.replace(/\|/g, '\\|') + '`').join(', ')} | ${r.role} |`);
} else {
  const byRole = {};
  for (const r of list) byRole[r.role] = (byRole[r.role] || 0) + 1;
  console.log(`${list.length} colour-bearing source declarations (one per source line and property), by suggested role:`, JSON.stringify(byRole));
  console.log('unmapped:', list.filter(r => r.src === '(unmapped)').length);
}
