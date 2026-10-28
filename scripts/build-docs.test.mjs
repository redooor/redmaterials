import test from 'node:test';
import assert from 'node:assert/strict';
import { build, expandIncludes, expandColors, expandVersion, expandInline, expandExamples, assertNoDirectives, renderSidebar, COLORS } from './build-docs.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

test('expandIncludes inlines partials recursively', () => {
  const files = { 'a.html': 'A[<!--@include b.html-->]', 'b.html': 'B' };
  assert.equal(expandIncludes('<!--@include a.html-->', f => files[f]), 'A[B]');
});
test('expandIncludes throws on a missing partial and on a cycle', () => {
  assert.throws(() => expandIncludes('<!--@include nope.html-->', () => undefined), /nope\.html/);
  assert.throws(() => expandIncludes('<!--@include a.html-->', () => '<!--@include a.html-->'), /cycle/i);
});
test('expandVersion substitutes and honours the backslash escape', () => {
  assert.equal(expandVersion('v{{version}} \\{{version}}', '0.2.0'), 'v0.2.0 {{version}}');
});
test('expandExamples: preview, escaped snippet, class passthrough', () => {
  const out = expandExamples('<!--@example class="text-center"-->\n  <a href="x?a=1&amp;b=2" title="&quot;q&quot;">{{ $x }}</a>\n<!--@end-->');
  assert.match(out, /<div class="bs-component border rounded p-3 mb-3 text-center">/);
  assert.match(out, /<pre class="docs-snippet [^"]*"><code>&lt;a href=&quot;x\?a=1&amp;amp;b=2&quot;/);
  assert.ok(!out.includes('@example') && !out.includes('@end'));
});
test('expandExamples is safe for nested divs, comments with <div>, quoted ">" and an empty example', () => {
  const src = '<!--@example--><div><div title="a>b"></div></div><!-- <div> --><!--@end--><!--@example--><!--@end-->';
  const out = expandExamples(src);
  assert.equal((out.match(/class="bs-component/g) || []).length, 2);
});
test('expandExamples dedents the snippet but not the preview', () => {
  const out = expandExamples('<!--@example-->\n    <p>\n      x\n    </p>\n<!--@end-->');
  assert.match(out, /<code>&lt;p&gt;\n  x\n&lt;\/p&gt;<\/code>/);
});
test('expandCode emits a snippet only', () => {
  const out = expandExamples('<!--@code--><link rel="stylesheet" href="a.css"><!--@end-->');
  assert.ok(!out.includes('bs-component'));
  assert.match(out, /<code>&lt;link rel=/);
});
test('expandColors repeats once per colour and works with an id per colour', () => {
  const out = expandColors('<!--@each-color <i id="x-{color}" class="bg-{color}"></i>-->');
  assert.equal((out.match(/<i id="x-/g) || []).length, COLORS.length);
  assert.ok(out.includes('id="x-deep-orange"'));
});
test('expandColors: each-color+default also repeats the default colour first', () => {
  const out = expandColors('<!--@each-color+default <i class="bg-{color}"></i>-->');
  assert.equal((out.match(/<i class="bg-/g) || []).length, COLORS.length + 1);
  assert.ok(out.indexOf('bg-default') < out.indexOf('bg-red'));
});
test('renderSidebar: current page links are in the spy list, other-page links are outside it, order kept', () => {
  const sections = { bootstrap: [{ id: 'buttons', title: 'Buttons' }, { id: 'forms', title: 'Forms' }],
                     redmaterials: [{ id: 'ribbons', title: 'Corner Ribbons' }, { id: 'buttons', title: 'Buttons' }] };
  const html = renderSidebar(sections, 'bootstrap');
  const spy = html.slice(html.indexOf('id="nav_spy"'), html.indexOf('</ul>', html.indexOf('id="nav_spy"')));
  assert.ok(spy.indexOf('#buttons') < spy.indexOf('#forms'));
  assert.ok(!spy.includes('redmaterials.html'));
  assert.match(html.slice(html.indexOf('</ul>')), /href="redmaterials\.html#ribbons"/);
});
test('full build: every snippet decodes to its expanded example source, colours inside examples included, ids unique', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-'));
  fs.mkdirSync(path.join(dir, 'src/pages'), { recursive: true }); fs.mkdirSync(path.join(dir, 'out'));
  fs.writeFileSync(path.join(dir, 'src/sections.json'), JSON.stringify({ bootstrap: [{ id: 'a', title: 'A' }], redmaterials: [{ id: 'b', title: 'B' }] }));
  fs.writeFileSync(path.join(dir, 'src/pages/index.html'), '<!--@sidebar--><!--@example--><!--@each-color <button id="b-{color}" class="btn bg-{color}">v{{version}}</button>--><!--@end-->');
  fs.writeFileSync(path.join(dir, 'src/pages/redmaterials.html'), '<!--@sidebar-->');
  build({ srcDir: path.join(dir, 'src'), outDir: path.join(dir, 'out'), pkg: { version: '9.9.9' } });
  const html = fs.readFileSync(path.join(dir, 'out/index.html'), 'utf8');
  const snippet = decode(html.match(/<code>([\s\S]*?)<\/code>/)[1]);
  const preview = html.match(/<div class="bs-component[^"]*">([\s\S]*?)<\/div>\n<pre class="docs-snippet/)[1];
  assert.equal(snippet.trim(), preview.trim());
  assert.ok(snippet.includes('id="b-deep-orange"') && snippet.includes('v9.9.9'));
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, 'duplicate ids in generated page');
});

test('assertNoDirectives rejects a missing @end, an unsupported attribute and a typo', () => {
  assert.throws(() => assertNoDirectives(expandExamples('<!--@example--><p>x</p>'), 'a.html'), /unconsumed directive/);
  assert.throws(() => assertNoDirectives(expandExamples('<!--@example id="x"--><p>x</p><!--@end-->'), 'a.html'), /unconsumed directive/);
  assert.throws(() => assertNoDirectives('<!--@exmaple--><!--@end-->', 'a.html'), /unconsumed directive/);
  assert.doesNotThrow(() => assertNoDirectives(expandExamples('<!--@example--><p>x</p><!--@end-->'), 'a.html'));
});
test('expandInline wraps a file in <script> and rejects a missing file', () => {
  assert.equal(expandInline('<!--@inline a.js-->', f => f === 'a.js' ? 'var a=1;' : undefined), '<script>var a=1;</script>');
  assert.throws(() => expandInline('<!--@inline nope.js-->', () => undefined), /nope\.js/);
});
function tmpSite(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-'));
  for (const [f, body] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, 'src', f)), { recursive: true }); fs.writeFileSync(path.join(dir, 'src', f), body); }
  fs.mkdirSync(path.join(dir, 'out'));
  return { src: path.join(dir, 'src'), out: path.join(dir, 'out') };
}
const SECTIONS = JSON.stringify({ bootstrap: [{ id: 'a', title: 'A' }], redmaterials: [{ id: 'b', title: 'B' }] });
test('build: a missing page file, and a malformed marker in a page, fail the build', () => {
  const miss = tmpSite({ 'sections.json': SECTIONS, 'pages/index.html': 'x' });
  assert.throws(() => build({ srcDir: miss.src, outDir: miss.out, pkg: { version: '1' } }), /missing page/);
  const bad = tmpSite({ 'sections.json': SECTIONS, 'pages/index.html': '<!--@example--><b>x</b>', 'pages/redmaterials.html': 'ok' });
  assert.throws(() => build({ srcDir: bad.src, outDir: bad.out, pkg: { version: '1' } }), /unconsumed directive/);
});
test('build: demos are generated under docs/demos with {{root}} = ../ and pages with an empty root', () => {
  const site = tmpSite({ 'sections.json': SECTIONS, 'pages/index.html': '<link href="{{root}}dist/a.css">', 'pages/redmaterials.html': 'r',
    'demos/side.html': '<link href="{{root}}dist/a.css"><!--@inline init.js-->', 'init.js': 'var x=1;' });
  build({ srcDir: site.src, outDir: site.out, pkg: { version: '1' } });
  assert.equal(fs.readFileSync(path.join(site.out, 'index.html'), 'utf8'), '<link href="dist/a.css">');
  assert.equal(fs.readFileSync(path.join(site.out, 'demos/side.html'), 'utf8'), '<link href="../dist/a.css"><script>var x=1;</script>');
});
