# Upgrade Guide

## Upgrading to v0.2.0

### Bootstrap version

Redmaterials v0.2.0 targets **Bootstrap 4.6.2** (up from 4.0.0).

Update your CDN link:

```html
<!-- Remove -->
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css">

<!-- Replace with -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/css/bootstrap.min.css">
```

---

### Removed classes (Bootstrap 3 only)

These classes were never part of Bootstrap 4. Redmaterials now ships a compatibility
shim so they continue to work, but they are deprecated and **will be removed in a
future major version**. Migrate at your earliest convenience.

| Bootstrap 3 class | Bootstrap 4 replacement |
|---|---|
| `.btn-default` | `.btn-secondary` |
| `.btn-xs` | `.btn-sm` |
| `.btn-group-xs` | `.btn-group-sm` |
| `.input-group-addon` | `.input-group-prepend` / `.input-group-append` + `.input-group-text` |
| `.input-group-btn` | `.input-group-append` |
| `.input-sm` | `.form-control-sm` |
| `.label` `.label-*` | `.badge` `.badge-*` |
| `.navbar-toggle` | `.navbar-toggler` |

---

### Deprecated classes (Bootstrap 4.6 — still work, removed in Bootstrap 5)

These are valid Bootstrap 4 classes that Bootstrap itself deprecated in v4.6.
They still work and Redmaterials does not shim them — no action required for now.
Plan to migrate before upgrading to Bootstrap 5.

| Deprecated class | Bootstrap 5 replacement |
|---|---|
| `.form-group` | Spacing utilities e.g. `mb-3` |
| `.jumbotron` | Custom section with padding utilities |
| `.thead-dark` / `.thead-light` | `.table-dark` / `.table-light` on `<thead>` |
| `.badge-pill` | `.rounded-pill` |
| `.text-left` / `.text-right` | `.text-start` / `.text-end` |
| `.ml-*` / `.mr-*` | `.ms-*` / `.me-*` |
| `.pl-*` / `.pr-*` | `.ps-*` / `.pe-*` |

---

### Glyphicons

Bootstrap 4 dropped Glyphicons entirely. Redmaterials now bundles the Glyphicons
Halflings font from Bootstrap 3.3.7 (MIT licensed) so that existing projects
continue to work without HTML changes.

**No action required** if you are using `.glyphicon-*` classes — they will
continue to render as before.

To use the bundled font, ensure your project copies `dist/fonts/` alongside
`dist/css/`. The font path is resolved relative to the CSS file location.

**Future migration:** Glyphicons is no longer maintained. The recommended
long-term replacement is [Bootstrap Icons](https://icons.getbootstrap.com),
which is actively maintained by the Bootstrap team.

---

### Build tooling

The Grunt + Bower build system has been replaced with standard npm scripts.

```bash
# Old
npm install
bower install
grunt dist
grunt docs
grunt

# New
npm install
npm run dist
npm run docs
npm run build
```
