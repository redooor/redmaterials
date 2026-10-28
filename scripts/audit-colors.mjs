#!/usr/bin/env node
// Lists every colour-bearing declaration of dist/css/redmaterials.css with its selector, property, value and the
// Sass source file:line (through the source map), de-duplicated by source location, with a SUGGESTED role.
// The roles drive the dark-mode tokens (scss/COLOR-ROLES.md); the suggestion is a starting point, a human decides.
//
//   node scripts/audit-colors.mjs [--check] [--doc] [--markdown] [--json] [--self-test]
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
const overridesFile = path.join(root, 'scripts/color-roles.overrides.json');

// Every override must belong to a declaration and be pinned to its content:
// an override key that no longer exists is orphaned, and a `match` substring
// that no longer appears in the declaration's value means the colour changed.
function findOverrideProblems(list, overrides) {
  const byKey = new Map(list.map(r => [`${r.src}|${r.prop}`, r]));
  const problems = [];
  for (const [key, ov] of Object.entries(overrides)) {
    const row = byKey.get(key);
    if (!row) {
      problems.push(`orphaned override ${key}: no declaration has this source location and property`);
      continue;
    }
    const match = typeof ov === 'object' && ov ? ov.match : undefined;
    if (typeof match !== 'string' || match.length === 0) {
      problems.push(`override ${key} is missing the required "match" field`);
    } else if (!row.value.includes(match)) {
      problems.push(`override ${key} no longer matches "${match}" in "${row.value}"`);
    }
  }
  return problems;
}

function runSelfTest() {
  const list = [{ src: 'scss/example.scss:1', prop: 'color', value: '#f8f8f8' }];
  const binding = match => ({ role: 'fixed', reason: 'test', match });
  const cases = [
    ['a valid binding', { 'scss/example.scss:1|color': binding('#f8f8f8') }, null],
    ['an orphaned override', { 'scss/gone.scss:1|color': binding('#fff') }, /orphaned override/],
    ['a stale match', { 'scss/example.scss:1|color': binding('#123456') }, /no longer matches/],
    ['a missing match', { 'scss/example.scss:1|color': { role: 'fixed', reason: 'test' } }, /missing the required "match"/],
  ];
  const failures = [];
  for (const [name, overrides, expected] of cases) {
    const problems = findOverrideProblems(list, overrides);
    if (expected ? problems.length !== 1 || !expected.test(problems[0]) : problems.length !== 0) {
      failures.push(`${name}: ${problems.length ? problems.join('; ') : 'no problem reported'}`);
    }
  }
  for (const f of failures) console.error(`FAIL ${f}`);
  console.log(`audit-colors self-test: ${cases.length - failures.length}/${cases.length} cases passed`);
  return failures.length ? 1 : 0;
}

if (process.argv.includes('--self-test')) process.exit(runSelfTest());

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
  // the definitions of the dark-mode tokens themselves (scss/_tokens*.scss, the contextual table colours)
  if (/^--rdm-/.test(prop)) return 'token';
  if (/url\(\s*["']?data:/.test(value)) return 'image';
  if (/^\s*transparent\s*$/i.test(value)) return 'fixed';
  if (/^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/.test(value)) {   // an RGB triplet custom property
    const hex = '#' + value.split(',').map(x => parseInt(x, 10).toString(16).padStart(2, '0')).join('');
    return palette.has(hex) || /primary|secondary|success|danger|warning|info|light|dark|link|focus/.test(prop) ? "fixed" : suggestCustomProperty(prop, value);
  }
  // text paired with a palette fill (for example #333 on the yellow/lime badges) stays with that fill
  if (prop === 'color' && /\.(badge\.)?bg-[a-z]/.test(selector)) return 'fixed';
  // outline buttons derive their states from the brand colour
  if (prop.startsWith('--') && /\.btn-outline-/.test(selector)) return 'fixed';
  // palette loops and variant mixins generate brand colours (the `default` variant is the one neutral; see COLOR-ROLES.md)
  if (/scss\/(loops\/|mixins\/(alerts|badges)\.scss|badges\.scss)/.test(src)) {
    if (/shadow/.test(prop)) return 'shadow';
    if (/mixins\/badges\.scss/.test(src)) return 'fixed';   // badge fills are paired with their (white) text
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

// Human review: source-line|property -> role and reason, plus a `match`
// substring pinning the override to the declaration value it was reviewed for
// (see scss/COLOR-ROLES.md).
const overrides = fs.existsSync(overridesFile) ? JSON.parse(fs.readFileSync(overridesFile, 'utf8')) : {};
const rows = new Map();
postcss.parse(css, { from: cssFile }).walkDecls(decl => {
  const rgbTriplet = decl.prop.startsWith('--') && /^\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*$/.test(decl.value);   // --bs-primary-rgb: 33, 150, 243
  if (!COLOR_PROPS.test(decl.prop) || !(LITERAL.test(decl.value) || rgbTriplet) || /^var\(/.test(decl.value.trim()) && !LITERAL.test(decl.value.replace(/var\([^)]*\)/g, ''))) return;
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
  const ov = overrides[key];
  r.role = r.role || (typeof ov === 'string' ? ov : ov && ov.role) || suggest(src, selector, decl.prop, decl.value);
  r.reviewed = key in overrides;
  r.reason = typeof ov === 'object' && ov ? ov.reason : '';
});

const list = [...rows.values()].map(r => ({ ...r, values: [...r.values] })).sort((a, b) => a.src.localeCompare(b.src, undefined, { numeric: true }));

// --check: every neutral colour literal outside the token definitions must have been reviewed (an override with a reason that
// says why it stays the same in both modes). Anything else is a colour that dark mode would leave behind. The overrides
// themselves must still exist and still match the declaration they were reviewed against.
if (process.argv.includes('--check')) {
  const NEEDS = new Set(['text', 'text-muted', 'surface', 'surface-translucent', 'divider', 'interaction-surface', 'shadow', 'overlay', 'image', 'review']);
  const bad = list.filter(r => (NEEDS.has(r.role) && !r.reviewed) || (r.reviewed && r.role === 'fixed' && !r.reason) || r.src === '(unmapped)');
  const overrideProblems = findOverrideProblems(list, overrides);
  for (const r of bad) console.error(`${r.src}  ${r.prop}: ${r.value.slice(0, 60)}  [${r.role}${r.reviewed ? ', override without a reason' : ''}]`);
  for (const p of overrideProblems) console.error(p);
  console.log(`${list.length} colour declarations, ${bad.length} not covered by a token or a reviewed exception, ${overrideProblems.length} override problem(s)`);
  process.exit(bad.length || overrideProblems.length ? 1 : 0);
}
if (process.argv.includes('--json')) { console.log(JSON.stringify(list, null, 1)); process.exit(0); }
if (process.argv.includes('--doc')) {
  const byRole = {};
  for (const r of list) byRole[r.role] = (byRole[r.role] || 0) + 1;
  const reviewed = '| Source | Property | Why it stays the same in both modes |\n|---|---|---|\n' + list.filter(r => r.reviewed && r.reason).map(r => `| \`${r.src}\` | \`${r.prop}\` | ${r.reason} |`).join('\n');
  const table = list.map(r => `| \`${r.src}\` | \`${r.prop}\` | \`${r.value.replace(/\|/g, '\\|').replace(/url\(.*\)/, 'url(data:…)').slice(0, 70)}\`${r.values.length > 1 ? ` (+${r.values.length - 1})` : ''} | ${r.selectors.slice(0, 2).map(x => '`' + x.replace(/\|/g, '\\|').slice(0, 48) + '`').join(', ')} | ${r.role} |`).join('\n');
  console.log(`# Colour roles

Generated by \`node scripts/audit-colors.mjs --doc > scss/COLOR-ROLES.md\` from \`dist/css/redmaterials.css\` and its source map. One row per Sass source line and property (the palette loops expand one line into many values, shown as \`(+N)\`). The role is a heuristic suggestion (\`scripts/audit-colors.mjs\`), reviewed by hand; manual corrections go in \`scripts/color-roles.overrides.json\` as \`{"<src>|<property>": {"role": "<role>", "reason": "...", "match": "<substring of the declaration value>"}}\`. \`--check\` fails if an override points at no declaration or its \`match\` no longer occurs in the value. Regenerate after changing the SCSS.

Dark mode is built from this inventory: every neutral colour is a CSS custom property defined in \`scss/_tokens.scss\` (light and dark values), \`scss/_tokens-palette.scss\` (palette text colours) and \`scss/mixins/tables.scss\` (contextual table colours). \`node scripts/audit-colors.mjs --check\` (run in CI) fails when a neutral colour literal appears outside those files without a reviewed exception, so a new hard-coded colour cannot slip past dark mode.

## Roles

| Role | Meaning | Dark mode |
|---|---|---|
| \`token\` | The definitions of the dark-mode tokens themselves (\`--rdm-*\`, in light and dark) | n/a |
| \`fixed\` | Brand and palette identity colours (\`$brand-*\`, \`bg-{color}\`, the palette loops), white text on a coloured background, \`transparent\`, brand-coloured focus rings and underlines | same in both modes |
| \`light-only\` | Light-palette overrides of Bootstrap's \`--bs-*-text-emphasis\`, \`-bg-subtle\`, \`-border-subtle\` (guarded by \`:root:not([data-bs-theme=dark])\`) | none: in dark Bootstrap's own dark values apply |
| \`text\`, \`text-muted\` | Neutral foreground colours | token (must be reviewed if it appears outside the token files) |
| \`surface\`, \`surface-translucent\` | Neutral backgrounds (kept translucent where they are today) | token |
| \`divider\` | Neutral borders and inset underlines | token |
| \`interaction-surface\` | Neutral hover/active/focus/disabled backgrounds | token |
| \`shadow\` | Drop shadows (\`$shadow-depth-*\`, raised buttons, dropdown, modal, popover, navbar, ribbon) | token (lighter highlight, deeper shadow) |
| \`overlay\` | Scrims (nav-sidebar overlay) | token |
| \`image\` | Data-URL icons (select arrows) | dark variant of the image |

## Summary (${list.length} source declarations)

${Object.entries(byRole).sort((a, b) => b[1] - a[1]).map(([k, v]) => '* \`' + k + '\`: ' + v).join('\n')}

## Tokens

Where values differed they got separate tokens; nothing was forced into a shared token, and translucent surfaces stay translucent.

| Group | Tokens |
|---|---|
| Text | \`--rdm-text\`, \`-text-strong\`, \`-text-muted\`, \`-text-secondary\`, \`-text-subtle\`, \`-text-disabled\`, \`-table-text\`, \`-table-header-color\` |
| Surfaces | \`--rdm-surface\`, \`-surface-translucent\`, \`-disabled-bg\`, \`-overlay\`, \`-tooltip-bg\`, \`-tooltip-color\`, \`-card-cap-bg\` |
| Dividers and control chrome | \`--rdm-underline\`, \`-divider\`, \`-chevron\`, \`-popover-border\`, \`-blockquote-border\`, \`-control-border\`, \`-control-subtle\`, \`-focus-gap\`, \`-table-border\` |
| Interaction surfaces | \`--rdm-hover-bg\`, \`-flat-hover-bg\`, \`-flat-active-bg\`, \`-flat-focus-bg\`, \`-flat-ink\`, \`-ink\`, \`-table-striped-bg\`, \`-table-hover-bg\`, \`-table-active-bg\` |
| Neutral default variant | \`--rdm-default-bg\`, \`-hover-bg\`, \`-active-bg\`, \`-focus-bg\`, \`-ink\`, \`-text\` |
| Navigation sidebar default variant | \`--rdm-sidebar-default-bg\`, \`--rdm-sidebar-default-text\` |
| Shadows | \`--rdm-shadow-depth-1\` to \`-5\`, \`-shadow-navbar\`, \`-shadow-dropdown\`, \`-shadow-ribbon\` |
| Images | \`--rdm-select-arrow\`, \`-select-arrow-focus\` |
| Palette text | \`--rdm-ctx-{context}\` and \`--rdm-pal-{colour}\` with \`-hover\`, \`-active\`, \`-focus\` (flat and outline buttons) |
| Contextual tables | \`--rdm-table-{state}-bg\`, \`-border\`, \`-striped-bg\`, \`-active-bg\`, \`-hover-bg\`; \`--rdm-table-{colour}-striped-bg\`, \`-hover-bg\` |

## Decisions

* **Brand and palette fills are identity colours** and are the same in both modes (\`bg-*\`, \`btn-*\`, \`text-bg-*\`, \`alert-*\`, \`badge\`, the palette loops).
* **Palette *text* colours** (flat buttons, outline buttons) are lifted towards white in dark mode only where they would fall below 4.5:1 on the dark surface; colours that already pass are untouched.
* **\`.text-*\` utilities are fixed colours**, as in Bootstrap; use \`.text-body-secondary\` and friends for theme-aware text.
* **The neutral \`default\` variant** follows the mode for buttons and the navigation sidebar. The sidebar keeps its own \`--rdm-sidebar-default-*\` tokens (from \`$default\`), so configuring \`$brand-default\` does not change it; the \`.bg-default\`, \`.border-default\` and \`.text-default\` utilities stay fixed.
* **\`.navbar-light\` and \`.navbar-dark\`** are always light and dark; Bootstrap's \`data-bs-theme\` on a navbar works as well.
* **Scoped themes** (\`data-bs-theme="light"\` on an element inside a dark page) also reset the text colour (zero-specificity rule in \`scaffolding.scss\`).
* **Bootstrap-provided colours** that Redmaterials only remaps through \`--bs-*\` variables switch with \`data-bs-theme\` already.

## Reviewed colours that stay fixed

${reviewed}

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
