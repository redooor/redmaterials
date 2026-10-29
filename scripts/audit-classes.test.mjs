import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectClassesFromCss,
  extractClassesFromSelector,
  extractLiveExampleClasses,
} from './audit-classes.mjs';

const list = set => [...set].sort();

test('extractClassesFromSelector drops :not() arguments, including nested :not()', () => {
  assert.deepEqual(list(extractClassesFromSelector('.a:not(.b)')), ['a']);
  assert.deepEqual(list(extractClassesFromSelector('.a:not(.b, .c) .d:not(.e)')), ['a', 'd']);
  assert.deepEqual(list(extractClassesFromSelector('.a:not(.b:not(.c))')), ['a']);
});

test('extractClassesFromSelector handles attribute selectors, pseudo names and comma lists', () => {
  assert.deepEqual(list(extractClassesFromSelector('.a[data-x=".b"]:hover, .c::before, #id.d')), ['a', 'c', 'd']);
  assert.deepEqual(list(extractClassesFromSelector('.foo-bar, ._under, .-leading, .a1')), ['-leading', '_under', 'a1', 'foo-bar']);
});

test('collectClassesFromCss walks rules nested in @media and @supports', () => {
  const classes = collectClassesFromCss(`
    .top, .combo[data-x] { color: blue; }
    @media (min-width: 768px) { .inside:hover { color: red; } }
    @supports (display: grid) { .nested:not(.skip) { display: grid; } }
  `);
  assert.deepEqual(list(classes), ['combo', 'inside', 'nested', 'top']);
});

test('extractLiveExampleClasses scans only .bs-component blocks and ignores snippets and prose', () => {
  const html = `
    <p class="prose">not an example</p>
    <div class="bs-component border rounded">
      <button class="btn btn-primary">Go</button>
      <div class="inner" title="a>b"><span class="deep"></span></div>
    </div>
    <pre class="docs-snippet border"><code>&lt;div class="from-snippet"&gt;&lt;/div&gt;</code></pre>
    <div class="bs-component"><span class="second"></span></div>
    <p class="trailing-prose"></p>
  `;
  const classes = extractLiveExampleClasses(html);
  assert.deepEqual(list(classes), ['btn', 'btn-primary', 'deep', 'inner', 'second']);
  assert.ok(!classes.has('prose'));
  assert.ok(!classes.has('from-snippet'));
  assert.ok(!classes.has('bs-component'));
  assert.ok(!classes.has('border'));
});

test('extractLiveExampleClasses handles consecutive components before one snippet', () => {
  const html = `
    <div class="bs-component"><span class="first"></span></div>
    <div class="bs-component mb-4"><span class="second"></span></div>
    <pre class="docs-snippet"><code>ignored</code></pre>
    <div class="bs-component"><span class="third"></span></div>
  `;
  assert.deepEqual(list(extractLiveExampleClasses(html)), ['first', 'second', 'third']);
});
