// Pure validation for the optional examples manifest in docs-src/sections.json.
//
// A section may carry { examples: [{ variant, selector, interaction? }] }; the browser check uses the
// selectors for coverage and the interactions for click-driven state checks. Keeping the validation here
// (instead of only in the browser script) makes it testable without Chrome.
const SECTION_KEYS = new Set(['id', 'title', 'examples']);
const EXAMPLE_KEYS = new Set(['variant', 'selector', 'interaction']);
const INTERACTION_KEYS = new Set(['click', 'expect', 'expectGone']);

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = v => typeof v === 'string' && v.trim().length > 0;

// Returns a list of human-readable errors; an empty list means the manifest is well formed.
export function validateManifest(sections) {
  if (!isObject(sections)) return ['sections.json must be an object of section lists'];
  const errors = [];
  for (const [page, list] of Object.entries(sections)) {
    if (!Array.isArray(list)) { errors.push(`${page}: sections must be an array`); continue; }
    for (const [index, section] of list.entries()) {
      const label = isObject(section) && isText(section.id) ? section.id : `${page}[${index}]`;
      if (!isObject(section)) { errors.push(`${label}: section must be an object`); continue; }
      for (const key of Object.keys(section)) {
        if (!SECTION_KEYS.has(key)) errors.push(`${label}: unknown section key "${key}"`);
      }
      if (!isText(section.id)) errors.push(`${label}: id must be a non-empty string`);
      if (!isText(section.title)) errors.push(`${label}: title must be a non-empty string`);
      if (section.examples === undefined) continue;
      if (!Array.isArray(section.examples)) { errors.push(`${label}: examples must be an array`); continue; }
      const variants = new Set();
      for (const [n, example] of section.examples.entries()) {
        const where = `${label}: example ${n + 1}`;
        if (!isObject(example)) { errors.push(`${where} must be an object`); continue; }
        const variant = isText(example.variant) ? example.variant.trim() : '';
        if (!variant) errors.push(`${where} needs a non-empty variant`);
        else if (variants.has(variant)) errors.push(`${label}: duplicate variant "${variant}"`);
        else variants.add(variant);
        if (!isText(example.selector)) errors.push(`${where} needs a non-empty selector`);
        for (const key of Object.keys(example)) {
          if (!EXAMPLE_KEYS.has(key)) errors.push(`${where} has unknown key "${key}"`);
        }
        if (example.interaction === undefined) continue;
        const interaction = example.interaction;
        if (!isObject(interaction)) { errors.push(`${where} interaction must be an object`); continue; }
        for (const key of Object.keys(interaction)) {
          if (!INTERACTION_KEYS.has(key)) errors.push(`${where} interaction has unknown key "${key}"`);
        }
        if (!isText(interaction.click)) errors.push(`${where} interaction needs a non-empty click selector`);
        const expect = isText(interaction.expect);
        const expectGone = isText(interaction.expectGone);
        if (!expect && !expectGone) errors.push(`${where} interaction needs a non-empty expect or expectGone selector`);
        if (expect && expectGone) errors.push(`${where} interaction must use either expect or expectGone, not both`);
      }
    }
  }
  return errors;
}
