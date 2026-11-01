import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { roundColors, roundFile } from './round-colors.mjs';

test('roundColors rounds decimal channels half up to lowercase 6-digit hex', () => {
  assert.equal(
    roundColors('a { color: rgb(132.5, 132.5, 132.5); background: rgba(10.2, 20.8, 30.5, 1); border-color: rgb(.5, 1.4, 254.5) }'),
    'a { color: #858585; background: #0a151f; border-color: #0101ff }'
  );
});

test('roundColors leaves non-opaque alpha untouched', () => {
  const css = 'a { color: rgba(10.2, 20.8, 30.5, 0.5); background: rgba(0.5, 0.5, 0.5, 0.99) }';
  assert.equal(roundColors(css), css);
});

test('roundColors leaves integer-only colours untouched', () => {
  const css = 'a { color: rgb(10, 20, 30); background: rgba(10, 20, 30, 1) }';
  assert.equal(roundColors(css), css);
});

test('roundFile rewrites in place and is idempotent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rdm-round-colors-'));
  const file = path.join(dir, 'input.css');
  try {
    fs.writeFileSync(file, 'a { color: rgb(132.5, 132.5, 132.5) }');
    assert.equal(roundFile(file), true);
    const once = fs.readFileSync(file, 'utf8');
    assert.equal(once, 'a { color: #858585 }');
    assert.equal(roundFile(file), false);
    assert.equal(fs.readFileSync(file, 'utf8'), once);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
