![alt text][logo]

[logo]: https://redooor.github.io/redmaterials/assets/img/redmaterials_logo_sm.png "Redmaterials"

# Redmaterials by Redooor

Redmaterials is a Bootstrap 5 theme inspired by Google Material Design and various projects.
It is a consolidation of many works by various people. Please refer to [Acknowledgement](#acknowledgement) for more information.

Redmaterials was initially developed/consolidated by Redooor to be used in another open-sourced project [Redminportal](https://github.com/redooor/redminportal). We've decided to create a separate open-sourced project and make it available to the public.

View demo at [https://redooor.github.io/redmaterials](https://redooor.github.io/redmaterials).

> Upgrading from a previous version? See [UPGRADE.md](UPGRADE.md). For removed classes and selectors, see [BREAKING.md](BREAKING.md).

# Note to users

Components that Redmaterials inherits from Bootstrap are kept as close to Bootstrap as possible. The elements Redmaterials adds on top of Bootstrap (nav sidebar, corner ribbons, ripple effect, shadows, wells) are its own and may change in a future release. Contributions are welcome.

## Compatibility

| Redmaterials | Bootstrap |
| --- | --- |
| 0.0.x | Bootstrap 3 |
| 0.1.x | Bootstrap 4 |
| 0.2.x | Bootstrap 5.3.x |

## Requirements and load order

Redmaterials 0.2.x requires **Bootstrap 5.3.x** CSS and JS. Use the Bootstrap **bundle** build, which includes Popper.

Redmaterials' own JavaScript (the ripple effect and the nav-sidebar toggle) has no dependencies and does not need jQuery. Bootstrap 5 does not need jQuery either.

Load the assets in this order:

1. Bootstrap 5.3 CSS
2. `redmaterials.css`
3. Bootstrap 5.3 bundle JS
4. `redmaterials.js`

## Important Note

From version 0.0.3, we will not import Roboto font within Redmaterials CSS file. To use it, you need to separately add a link in your header.

Add this to your header:

```javascript
<link href='https://fonts.googleapis.com/css?family=Roboto' rel='stylesheet' type='text/css'>
```

Alternatively, you may use [Web Font Loader](https://github.com/typekit/webfontloader) to dynamically load Roboto font.

Web Font Loader example:
```javascript
<script src="https://cdnjs.cloudflare.com/ajax/libs/webfont/1.6.26/webfontloader.js"></script>
<script>
  WebFont.load({
    google: {
      families: ['Roboto']
    }
  });
</script>
```

# Installation for Users

* Copy "dist/css" and "dist/js" to your project folder
* Use "dist/css/redmaterials.min.css" and "dist/js/redmaterials.min.js"
* Redmaterials CSS and JS must be
    * used together with Bootstrap's CSS and JS
    * declared after Bootstrap's CSS and JS

## Customising

The theme colours and sizes are Sass variables declared with `!default`. Load the variables module with your values first, then Redmaterials:

```scss
@use "variables" with ($brand-primary: #e91e63, $brand-secondary: #455a64);
@use "redmaterials";
```

Compile with `sass --load-path=path/to/redmaterials/scss theme.scss theme.css`.

## Dark mode

Redmaterials follows Bootstrap 5.3's colour modes. Set the mode on the root element, or on any element to scope it:

```html
<html data-bs-theme="dark">
```

Text, surfaces, dividers, form underlines, shadows, tables, the navigation sidebar and the other neutral colours switch with it. Brand and palette fills (`btn-primary`, `bg-red`, ...) keep their colours in both modes. The neutral colours are CSS custom properties defined in `scss/_tokens.scss` (`--rdm-text`, `--rdm-surface-translucent`, `--rdm-underline`, ...), so you can override them for either mode:

```css
[data-bs-theme="dark"] { --rdm-underline: #6c757d; }
```

`.text-*` utilities are fixed colours, as in Bootstrap; use Bootstrap's `.text-body-secondary` and friends for text that follows the mode.

## CDN example

```html
<!-- Bootstrap 5.3 CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css">

<!-- Redmaterials CSS (after Bootstrap) -->
<link rel="stylesheet" href="dist/css/redmaterials.min.css">

<!-- Bootstrap 5.3 bundle JS (includes Popper) -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>

<!-- Redmaterials JS (after Bootstrap) -->
<script src="dist/js/redmaterials.min.js"></script>
```

# Icons

Glyphicons are no longer bundled with Redmaterials. Use [Font Awesome Free](https://fontawesome.com/) (or another maintained icon set such as Bootstrap Icons or Material Icons) instead of the removed `.glyphicon-*` classes.

# Installation for Contributors

* Clone to a folder
* Run `npm install` to install dependencies
* Run `npm run docs` to build assets for documentation
* Run `npm run dist` to build assets for distribution
* Run `npm run build` to build assets for both distribution and documentation

The Sass sources are compiled with Dart Sass through the npm scripts; Grunt and Bower are no longer used.

# Versioning

For transparency into our release cycle and in striving to maintain backward compatibility, Redmaterials will adhere to the [Semantic Versioning guidelines](http://semver.org/) whenever possible.

# Contributing

Thank you for considering contributing to Redmaterials.
Before any submission, please spend some time reading through the [CONTRIBUTING.md](CONTRIBUTING.md) document.

# Creator

Andrews Ang

* [http://twitter.com/kongnir](http://twitter.com/kongnir)
* [http://github.com/kongnir](http://github.com/kongnir)

Redooor

* [https://twitter.com/redooor](https://twitter.com/redooor)
* [https://github.com/redooor](https://github.com/redooor)

# License

Redmaterials is open-sourced software licensed under the [MIT license](http://opensource.org/licenses/MIT).

# Acknowledgement

This project is inspired by and adapted from the work of these people, without whom this project will not be possible. Kudos to:

* [Google Material Design](http://www.google.com/design/spec/material-design/introduction.html)
* [Bootstrap](https://getbootstrap.com/)
* [Bootswatch Paper](http://bootswatch.com/paper/)
* [Bootstrap Material Design - Buttons, pen by Sergey Kupletsky](http://codepen.io/zavoloklom/details/Gubja)
* [Bootstrap Material Design - Responsive Table, pen by Sergey Kupletsky](http://codepen.io/zavoloklom/pen/IGkDz)
* [Material Design Icon](https://material.io/icons/)
* [Font Awesome Free](https://fontawesome.com/) — the recommended replacement for the Glyphicons that were previously bundled with Redmaterials.
