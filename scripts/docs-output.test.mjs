import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const docs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const pages = ['index.html', 'redmaterials.html'].map(f => [f, fs.readFileSync(path.join(docs, f), 'utf8')]);
// Strip snippets so documentation *about* old classes is not flagged.
const live = h => h.replace(/<pre[^>]*><code[\s\S]*?<\/code><\/pre>/g, '');
const LEGACY = [/\bglyphicon/, /\bpanel-(?:heading|body|footer|title|progress)\b/, /\bcol-xs-\d/, /\bpull-(?:left|right)\b/, /\bhidden-xs\b/,
  /\bimg-responsive\b/, /\bfa fa-/, /\bng-/, /Version 0\.[01]\./, /\bdata-(?:toggle|target|dismiss)="(?:modal|tab|collapse|dropdown|tooltip|popover|alert)"/];
for (const [name, html] of pages) {
  test(`${name}: no removed Bootstrap/Angular/Font Awesome markup`, () => {
    for (const re of LEGACY) assert.ok(!re.test(live(html)), `${name} matches ${re}`);
  });
  test(`${name}: every in-page anchor has a target and ids are unique`, () => {
    for (const [, id] of html.matchAll(/href="#([\w-]+)"/g)) assert.ok(html.includes(`id="${id}"`), `missing #${id} in ${name}`);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(ids.filter((v, i) => ids.indexOf(v) !== i), [], `duplicate ids in ${name}`);
  });
  test(`${name}: every reference points at an existing id (href, data-bs-target, for, aria-controls, aria-labelledby)`, () => {
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    const refs = [];
    for (const m of html.matchAll(/(?:href|data-bs-target)="(#[^"]+(?:,\s*#[^"]+)*)"/g)) refs.push(...m[1].split(',').map(x => x.trim().slice(1)));
    for (const m of html.matchAll(/\s(?:for|aria-controls|aria-labelledby)="([^"]+)"/g)) refs.push(...m[1].split(/\s+/));
    for (const id of refs) assert.ok(ids.has(id), `dangling reference to #${id} in ${name}`);
  });
  test(`${name}: a collapse toggler's aria-controls matches its data-bs-target`, () => {
    for (const m of html.matchAll(/<button[^>]*data-bs-toggle="collapse"[^>]*>/g)) {
      const target = (m[0].match(/data-bs-target="#([^"]+)"/) || [])[1];
      const controls = (m[0].match(/aria-controls="([^"]*)"/) || [])[1];
      assert.equal(controls, target, `aria-controls "${controls}" != data-bs-target "#${target}" in ${name}`);
    }
  });
  test(`${name}: copyable snippets are self-consistent (decoded, each snippet on its own)`, () => {
    const decode = t => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
    for (const m of html.matchAll(/<pre class="docs-snippet[^"]*"><code>([\s\S]*?)<\/code><\/pre>/g)) {
      const code = decode(m[1]);
      const ids = new Set([...code.matchAll(/\sid="([^"]+)"/g)].map(x => x[1]));
      for (const x of code.matchAll(/<[^>]*data-bs-toggle="collapse"[^>]*>/g)) {
        const target = (x[0].match(/data-bs-target="#([^"]+)"/) || [])[1];
        const controls = (x[0].match(/aria-controls="([^"]*)"/) || [])[1];
        if (target) assert.equal(controls, target, `snippet: aria-controls "${controls}" != "#${target}": ${code.slice(0, 80)}`);
      }
      for (const x of code.matchAll(/aria-labelledby="([^"]+)"/g)) {
        assert.ok(ids.has(x[1]), `snippet: aria-labelledby="${x[1]}" has no matching id in the same snippet: ${code.slice(0, 80)}`);
      }
    }
  });
  test(`${name}: no http:// resource links`, () => assert.ok(!/(?:src|href)="http:\/\//.test(html)));
  test(`${name}: no <style> blocks and no docs stylesheet directory`, () => {
    assert.ok(!/<style[\s>]/i.test(html), 'inline <style>');
    assert.ok(!fs.existsSync(path.join(docs, 'assets', 'css')), 'docs/assets/css must not exist');
  });
}
