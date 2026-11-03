# Contributing to Redmaterials

Your contributions to the project are most welcome. Please review these guidelines before submitting any pull requests to the project.

# Which Branch?

ALL bug fixes should be made to the 0.x branch which they belong. Bug fixes should never be sent to the master branch unless they fix features that exist only in the upcoming release.

# Pull Requests

The pull request process differs for new features and bugs. Before sending a pull request for a new feature, you should first create an issue with [Proposal] in the title. The proposal should describe the new feature, as well as implementation ideas. The proposal will then be reviewed and either approved or denied. Once a proposal is approved, a pull request may be created implementing the new feature. Pull requests which do not follow this guideline will be closed immediately.

Pull requests for bugs may be sent without creating any proposal issue. If you believe that you know of a solution for a bug that has been filed on GitHub, please leave a comment detailing your proposed fix.

# Feature Requests

If you have an idea for a new feature you would like to see added to Redmaterials, you may create an issue on GitHub with [Request] in the title. The feature request will then be reviewed by @kongnir.

# House Rules

* Describe the problem clearly in the Pull Request description
* If you are submitting a bug-fix, or an enhancement that is not a breaking change, submit your pull request to the branch corresponding to the latest stable release of the project, such as the 0.1 branch.
* If you are submitting a breaking change or an entirely new component, submit your pull request to the master branch.
* Do not edit compiled files directly: `dist/` and `docs/` (except `docs/assets/img`) are generated. Edit the Sass files inside `scss/` (and `js/redmaterials.js`), then run `npm run build` and commit the regenerated output together with your change. CI fails if the committed `dist/` or `docs/` differ from a fresh build.
* Colours: neutral colours (text, surfaces, dividers, shadows) are `--rdm-*` custom properties declared in `scss/_tokens.scss` so they follow `data-bs-theme="dark"`; do not hard-code them. Brand and palette fills are the same in both modes. If you add or change a colour declaration, run `npm run audit:colors` and commit the regenerated `scss/COLOR-ROLES.md`; `npm run audit:colors:check` (also run by CI) lists any declaration that has no token or reviewed exception.

# Tab or Space?

Please use 4 spaces as indentation. Do not use tab at all.

# Documentation

The documentation site (https://redooor.github.io/redmaterials/) is a static page built from `docs-src/` into `docs/`. It shows what Redmaterials restyles or adds, each with a live example and a copyable snippet, and it is built only from Bootstrap and Redmaterials styling: do not add CSS (or a `<style>` element) to the docs. For Bootstrap's own defaults, link to the official Bootstrap documentation.

* Edit `docs-src/` only (`pages/index.html`, `partials/redmaterials/*.html`, `sections.json`, `assets/js`). Never edit `docs/index.html` by hand.
* An example is `<!--@example-->...<!--@end-->`: it renders a live preview and a highlighted snippet from the same markup. `<!--@code-->...<!--@end-->` renders a snippet only, and `<!--@each-color ...-->` repeats a template once per palette colour. Syntax highlighting is applied at build time.
* A new section needs a partial, an include in `pages/index.html`, and an entry in `docs-src/sections.json` with an `examples` manifest (the selectors that must exist, and optional click interactions).
* Every class Redmaterials defines needs a live example. `npm run audit:classes` lists the ones that have none; runtime-only classes are explained in `docs-src/audit-exclusions.json`.
* Build with `npm run build:docs` (or `npm run build` for `dist/` too). Verify with `npm run test:docs` and, with Chrome installed (`CHROME=/path/to/chrome`), `node scripts/browser/docs-check.mjs file` and `node scripts/browser/docs-check.mjs http`.
* Check contrast in both colour modes: `node scripts/browser/contrast-audit.mjs http --mode light` and `--mode dark` must report 0 for all three rules. Run browser checks one at a time, not in parallel.
* All deployment-related documentation should be done within our Wiki page.

# Optional Development Tools

We're using these tools in our development of Redmaterials. It'll help if you use the same tool too.
Please feel free to suggest a better alternative.

* [Brackets](http://brackets.io/) for text editing.
* [Brackets Beautify](https://github.com/drewhamlett/brackets-beautify) for auto-indentation. Remember to change the tabSize to 4.
