import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManifest } from './browser/lib/manifest.mjs';

const manifest = examples => ({ bootstrap: [{ id: 'buttons', title: 'Buttons', examples }], redmaterials: [] });
const errorsFor = examples => validateManifest(manifest(examples));
const mentionsSection = errors => errors.some(e => /buttons/.test(e));

test('validateManifest accepts a valid manifest', () => {
  const errors = errorsFor([
    { variant: 'default', selector: '.bs-component .btn-primary' },
    { variant: 'toggles', selector: '.accordion', interaction: { click: '.accordion-button.collapsed', expect: '.accordion-collapse.show' } },
    { variant: 'dismiss', selector: '.alert', interaction: { click: '.btn-close', expectGone: '.alert.show' } },
  ]);
  assert.deepEqual(errors, []);
});
test('validateManifest rejects an example without a selector', () => {
  const errors = errorsFor([{ variant: 'default' }]);
  assert.ok(mentionsSection(errors) && errors.some(e => /selector/.test(e)), errors.join('\n'));
});
test('validateManifest rejects duplicate variants within a section', () => {
  const errors = errorsFor([{ variant: 'default', selector: '.a' }, { variant: 'default', selector: '.b' }]);
  assert.ok(mentionsSection(errors) && errors.some(e => /duplicate variant/.test(e)), errors.join('\n'));
});
test('validateManifest rejects unknown keys', () => {
  const errors = errorsFor([{ variant: 'default', selector: '.a', target: '.b' }]);
  assert.ok(mentionsSection(errors) && errors.some(e => /unknown key/.test(e)), errors.join('\n'));
});
test('validateManifest rejects an interaction missing click or expect', () => {
  const noClick = errorsFor([{ variant: 'default', selector: '.a', interaction: { expect: '.b' } }]);
  const noExpect = errorsFor([{ variant: 'default', selector: '.a', interaction: { click: '.b' } }]);
  assert.ok(mentionsSection(noClick) && noClick.some(e => /click/.test(e)), noClick.join('\n'));
  assert.ok(mentionsSection(noExpect) && noExpect.some(e => /expect/.test(e)), noExpect.join('\n'));
});
