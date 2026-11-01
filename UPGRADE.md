# Upgrade Guide

## Upgrading to v0.2.0 (Bootstrap 5.3)

Redmaterials 0.2.x targets **Bootstrap 5.3.x** (the examples use Bootstrap 5.3.8). This is a major upgrade from Redmaterials 0.1.x, which targeted Bootstrap 4. It removes the Bootstrap 3/4 compatibility shims, the bundled Glyphicons font, and the Jumbotron. See [BREAKING.md](BREAKING.md) for the full list.

### Required versions and load order

| Component | Version |
| --- | --- |
| Redmaterials | 0.2.x |
| Bootstrap CSS + JS | 5.3.x (use the bundle build; it includes Popper) |
| jQuery | Not required (Redmaterials' own JavaScript no longer uses it) |

Load the assets in this order:

1. Bootstrap 5.3 CSS
2. `redmaterials.css`
3. Bootstrap 5.3 bundle JS
4. `redmaterials.js`

Neither Bootstrap 5 nor Redmaterials needs jQuery. Redmaterials' ripple effect and nav-sidebar toggle are plain JavaScript. If you used Redmaterials with jQuery before, you can remove jQuery from your page unless your own code needs it.

```html
<!-- 1. Bootstrap 5.3 CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css">

<!-- 2. Redmaterials CSS (after Bootstrap) -->
<link rel="stylesheet" href="dist/css/redmaterials.min.css">

<!-- 3. Bootstrap 5.3 bundle JS (includes Popper) -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>

<!-- 4. Redmaterials JS (after Bootstrap) -->
<script src="dist/js/redmaterials.min.js"></script>
```

### Step-by-step checklist

1. **Swap the CDN links.** Move from Bootstrap 4 (or 3) to Bootstrap 5.3.8 CSS and the Bootstrap 5.3.8 bundle JS. Keep Bootstrap CSS before `redmaterials.css` and Bootstrap JS before `redmaterials.js`.
2. **Rename Bootstrap data attributes.** Change `data-toggle` to `data-bs-toggle`, `data-target` to `data-bs-target`, and `data-dismiss` to `data-bs-dismiss` (also `data-placement` to `data-bs-placement`, `data-content` to `data-bs-content`, and `data-spy` to `data-bs-spy`). **Do not rename Redmaterials' own sidebar attributes:** the nav sidebar still uses `data-toggle="nav-sidebar-toggle"` and `data-target="#your_wrapper_id"`. Those are handled by `redmaterials.js`, not Bootstrap, and work unchanged (`data-bs-target` is also accepted).
3. **Run the class mapping below.** Replace the Bootstrap 3/4 classes with their Bootstrap 5 equivalents, particularly `.form-group`, `.custom-*`, `.ml-*`/`.mr-*`, `.text-left`/`.text-right`, `.thead-dark`/`.thead-light`, and `.card-deck`/`.card-columns`.
4. **Replace Glyphicons.** The Glyphicons font is no longer bundled. Replace `.glyphicon-*` elements with [Font Awesome Free](https://fontawesome.com/), Bootstrap Icons, Material Icons, or inline SVG.
5. **Test.** Check forms, tables, dropdowns, modals, navs/navbars, tooltips, popovers, and the nav sidebar. Tooltips and popovers still need explicit initialisation (see [JavaScript](#javascript)).

### Class and attribute changes

| Removed/changed | Replacement | Notes |
| --- | --- | --- |
| `.glyphicon`, `.glyphicon-*` | Bootstrap Icons, Material Icons, or an inline SVG | The Glyphicons font shim and `dist/fonts/glyphicons-*` files were removed. |
| `.badge-primary`, `.badge-secondary`, `.badge-success`, `.badge-info`, `.badge-warning`, `.badge-danger`, `.badge-light`, `.badge-dark` | `.badge.text-bg-primary` (or `.badge.bg-primary`) | Bootstrap 5 badges use contextual utilities instead of `.badge-<color>` classes. |
| `.badge-pill` | `.badge.rounded-pill` | Bootstrap 5's pill utility is `.rounded-pill`. |
| `.input-group-addon` | `.input-group-text` | Place the `.input-group-text` directly inside `.input-group`. |
| `.input-group-btn` | `.input-group > .btn` | Bootstrap 5 no longer wraps buttons in `.input-group-btn`. |
| `.input-group-prepend`, `.input-group-append` | `.input-group-text` / `.input-group > .btn` | Prepend/append wrappers were removed in Bootstrap 5. |
| `.input-sm`, `.input-lg` | `.form-control-sm`, `.form-control-lg` | Use the Bootstrap 5 control-size classes. |
| `.label`, `.label-*` | `.badge`, `.badge.text-bg-*` | Bootstrap 4 renamed labels to badges; Bootstrap 5 uses `.text-bg-*` for colours. |
| `.control-label` | `.form-label` or `.col-form-label` | Bootstrap 5 form-label classes. |
| `.help-block` | `.form-text`, `.valid-feedback`, `.invalid-feedback` | Use Bootstrap 5 helper/feedback classes. |
| `.checkbox`, `.checkbox-inline`, `.radio`, `.radio-inline` wrappers | `.form-check`, `.form-check-input`, `.form-check-label` | Bootstrap 5 checkboxes/radios are `.form-check-input` elements inside `.form-check`. |
| Theme styling on raw `input[type=checkbox]` / `input[type=radio]` | `.form-check-input`, `.form-switch .form-check-input` | Raw checkbox/radio inputs are browser-native; use Bootstrap 5 `.form-check` markup for the Material look. |
| `.jumbotron` | `.p-5`, `.bg-light`, `.rounded-*` (or a custom component) | The Jumbotron component no longer exists in Bootstrap 5. |
| `.btn-block` | `.d-grid` with `.w-100`, or `.w-100` | Bootstrap 5 uses layout/width utilities instead of `.btn-block`. `.btn-raised.w-100` and `.btn-flat.w-100` keep the Material button look. |
| `.btn-xs`, `.btn-group-xs` | `.btn-sm`, `.btn-group-sm` | The extra-small button size was removed from Bootstrap and Redmaterials. |
| `.panel`, `.panel-heading`, `.panel-title`, `.panel-body`, `.panel-footer` | `.card`, `.card-header`, `.card-title`, `.card-body`, `.card-footer` | Bootstrap 4 renamed panels to cards; Bootstrap 5 has no panel component. There is no `.card-heading`. |
| `.panel-primary`, `.panel-success`, `.panel-info`, `.panel-warning`, `.panel-danger` | `.card` with `.border-*` (outline) or `.text-bg-*` (filled) | Bootstrap has no `.card-success` etc.; use the border or `text-bg-*` utilities. |
| `.media` | Flex utilities (`.d-flex`, `.align-items-*`, `.gap-*`) | The `.media` component was removed in Bootstrap 5. |
| `.close` | `.btn-close` | Bootstrap 5 close buttons use `.btn-close`; `.alert-dismissible .close` was removed. |
| `.dropdown-menu-left`, `.dropdown-menu-right` | `.dropdown-menu-start`, `.dropdown-menu-end` | Bootstrap 5 uses logical start/end alignment classes. |
| `.pager` | `.pagination` | The pager component was removed in Bootstrap 4. |
| `.has-warning`, `.has-error`, `.has-success` | `.is-valid`, `.is-invalid`, `.was-validated` | Bootstrap 5 validation uses state classes on controls. |
| `.nav-pills > li.active > a`, `.nav-pills > li > a` | `.nav-pills .nav-link`, `.nav-pills .nav-link.active` | Bootstrap 5 puts `.active` on the `.nav-link`, not the list item. |
| `.nav-tabs .nav-item.active` (docs markup) | `.nav-tabs .nav-link.active` with `aria-current="page"` | Bootstrap 5 marks the active tab link. |
| `.navbar-breadcrumb > .active > a` | `.navbar-breadcrumb > .nav-item > .nav-link.active` | The theme's breadcrumb navbar now follows Bootstrap 5 active-link markup. |
| `.bs-tooltip-left`, `.bs-tooltip-right`, `.bs-tooltip-* .arrow`, `x-placement` | Tooltip CSS variables (`--bs-tooltip-*`, `--bs-tooltip-bg`, `--bs-tooltip-border-radius`) | Bootstrap 5.3 uses `data-popper-placement` and `.tooltip-arrow`; theme-specific arrow selectors were removed. |
| `.bs-popover-left`, `.bs-popover-right`, `.bs-popover-* .arrow`, `x-placement` | Popover CSS variables (`--bs-popover-*`) | Bootstrap 5.3 uses `data-popper-placement` and `.popover-arrow`; theme-specific arrow selectors were removed. |
| Table cell `background-color` overrides | Bootstrap 5 `--bs-table-bg`, `--bs-table-striped-bg`, `--bs-table-hover-bg`, `--bs-table-active-bg` | `.table-*` colour classes and `.table-red`/`.table-blue-grey` etc. now set the Bootstrap variables, so striping, hover, and contextual rows compose correctly. |
| `.table-condensed` | `.table-sm` | `.table-condensed` remains as a compatibility alias, but `.table-sm` is the Bootstrap 5 class. |
| `.btn-group.open .dropdown-toggle` | `.btn-group .dropdown-toggle.show` | Bootstrap 5 puts `.show` on the dropdown toggle (and menu), not on the button group. |
| `.form-group` | `.mb-3` (or another spacing utility) | Bootstrap 5 has no `.form-group`; use margin utilities. |
| `.custom-switch`, `.custom-checkbox`, `.custom-radio` | `.form-check` (`.form-switch` for switches) | Use `.form-check-input` and `.form-check-label` inside the wrapper. |
| `.custom-select` | `.form-select` | Bootstrap 5 renamed the custom select to `.form-select`. |
| `.custom-range` | `.form-range` | Bootstrap 5 renamed the custom range input to `.form-range`. |
| `.custom-file` | `.form-control` | The custom file component was removed; style a file input with `.form-control`. |
| `.ml-*`, `.mr-*`, `.pl-*`, `.pr-*` | `.ms-*`, `.me-*`, `.ps-*`, `.pe-*` | Bootstrap 5 uses logical start/end spacing utilities. |
| `.float-left`, `.float-right` | `.float-start`, `.float-end` | Bootstrap 5 uses logical float utilities. |
| `.text-left`, `.text-right` | `.text-start`, `.text-end` | Bootstrap 5 uses logical text-alignment utilities. |
| `.font-weight-*` | `.fw-*` | Example: `.font-weight-bold` becomes `.fw-bold`. |
| `.sr-only` | `.visually-hidden` | Bootstrap 5 renamed the screen-reader utility. |
| `.no-gutters` | `.g-0` | Bootstrap 5 uses the grid gutter utility. |
| `.thead-dark`, `.thead-light` | `.table-dark`, `.table-light` | Apply the table colour class to `<thead>` (or the table). |
| `.text-muted` | `.text-body-secondary` | Bootstrap 5.3 renamed the muted-text utility. |
| `.card-deck`, `.card-columns` | Grid `.row` / `.col` | The card layout components were removed; use the grid. |
| `data-spy` | `data-bs-spy` | Rename the Bootstrap scrollspy attribute; Bootstrap 5 also uses `data-bs-target`. |
| `data-toggle`, `data-target`, `data-dismiss` | `data-bs-toggle`, `data-bs-target`, `data-bs-dismiss` | Bootstrap 5 namespaces its data attributes. Do **not** rename Redmaterials' nav-sidebar `data-toggle="nav-sidebar-toggle"` / `data-target`. |

### JavaScript

Bootstrap 5 dispatches native DOM events (for example `show.bs.modal` and `shown.bs.tab`) instead of relying on jQuery. Use `addEventListener` for new code; jQuery `.on()` handlers continue to work when jQuery is on the page.

jQuery plugin calls such as `$('#myModal').modal('show')` and `$('.dropdown-toggle').dropdown()` still work if **your page** loads jQuery before Bootstrap's bundle, but neither Bootstrap nor Redmaterials requires jQuery.

Tooltips and popovers still have to be initialised explicitly, as in Bootstrap 4:

```js
document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
  new bootstrap.Tooltip(el);
});

document.querySelectorAll('[data-bs-toggle="popover"]').forEach((el) => {
  new bootstrap.Popover(el);
});
```

### Dark mode

New in 0.2.0: set `data-bs-theme="dark"` to get a dark theme (see the README). Light rendering is unchanged, so nothing is required of you. If you used `.navbar-light` or `bg-light` surfaces on a page that you now switch to dark, add `data-bs-theme="light"` to those elements so their contents keep dark text.

### Theming

Bootstrap 5.3 exposes its palette as CSS custom properties. Redmaterials maps the Material colours onto those variables in `:root`, so you can override them without recompiling the Sass:

```css
:root {
  --bs-primary: #1e88e5;
  --bs-primary-rgb: 30, 136, 229;
  --bs-secondary: #6c757d;
  --bs-secondary-rgb: 108, 117, 125;
}
```

Override both the colour and its `-rgb` triplet: Bootstrap utilities, focus rings, and translucent states use the RGB value. The derived variables (`--bs-primary-text-emphasis`, `--bs-primary-bg-subtle`, `--bs-primary-border-subtle`, and the equivalents for secondary, success, info, warning, danger, light, and dark) can be overridden the same way. Place your overrides after `redmaterials.css` so they win the cascade.

Some components expose their own variables on top of the global palette — buttons use `--bs-btn-*`, for example — so override those component-level variables too if you need to recolour a specific component.

---

## Upgrading from 0.0.x to 0.1.0 (Bootstrap 4)

Redmaterials 0.1.x moved from Bootstrap 3 to Bootstrap 4. The common renames are covered by the table above; the most frequent are `.panel` to `.card`, `.btn-default` to `.btn-secondary`, `.label` to `.badge`, `.navbar-toggle` to `.navbar-toggler`, and `.glyphicon-*` to a separate icon font. Redmaterials 0.1.0 also removed much of the built-in padding and margin in favour of Bootstrap 4 spacing utilities.

0.1.0 was built with LESS, Grunt, and Bower. Starting with 0.2.0 the project uses Dart Sass and npm scripts instead; see [README.md](README.md#installation-for-contributors).
