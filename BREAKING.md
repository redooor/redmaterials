# Breaking changes — Bootstrap 5.3 theme update

Redmaterials now targets Bootstrap 5.3.x. The following Bootstrap 3/4 selectors
and theme shims were removed or changed. Update any project markup that still
uses the left-hand column.

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
| `.panel`, `.panel-*` | `.card`, `.card-*` | Bootstrap 4 renamed panels to cards; Bootstrap 5 has no panel component. |
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
