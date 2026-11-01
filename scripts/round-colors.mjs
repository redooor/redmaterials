#!/usr/bin/env node
// Rewrites opaque rgb()/rgba() colours with fractional channels to 6-digit hex.
//
//   node scripts/round-colors.mjs <file.css>
//
// Sass emits fractional channels (for example rgb(132.5, 132.5, 132.5)) when a
// colour operation does not land on an integer.  Rounding half up per channel
// keeps the computed colour while producing a shorter hex literal.  Colours
// with a non-opaque alpha, and colours whose channels are all integers, are
// left untouched.  Running the script twice produces the same file.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const COLOR_RE = /\brgba?\(\s*([^()]*)\)/gi;
const NUMBER_RE = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

function channelToHex(channel) {
  const rounded = Math.floor(Number(channel) + 0.5);
  return Math.min(255, Math.max(0, rounded)).toString(16).padStart(2, '0');
}

export function roundColors(css) {
  return css.replace(COLOR_RE, (match, body) => {
    const parts = body.split(',').map(part => part.trim());
    if (parts.length !== 3 && parts.length !== 4) return match;
    if (parts.length === 4 && Number(parts[3]) !== 1) return match;
    if (!parts.slice(0, 3).some(part => part.includes('.'))) return match;
    if (!parts.slice(0, 3).every(part => NUMBER_RE.test(part))) return match;
    return '#' + parts.slice(0, 3).map(channelToHex).join('');
  });
}

export function roundFile(file) {
  const css = fs.readFileSync(file, 'utf8');
  const rounded = roundColors(css);
  if (rounded !== css) fs.writeFileSync(file, rounded);
  return rounded !== css;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node scripts/round-colors.mjs <file.css>');
    process.exitCode = 1;
  } else {
    roundFile(file);
  }
}
