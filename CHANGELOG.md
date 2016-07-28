# Change log

1. [Version 0.0.1](#version-001)
2. [Version 0.0.2](#version-002)
3. [Version 0.0.3](#version-003)

## Version 0.0.1

1. Initial release.
2. Support most components in Bootstrap 3.3.4.
3. Included some Material Design inspired colors and elements like:
    * 5 different shadow depths
    * Colored buttons based on Material Design Color Palette
    * Colored stripped tables based on Material Design Color Palette
    * Normal, Flat, Raised and Round buttons

## Version 0.0.2

1. Minor adjustments to:    
    * Striped table accent color to darker grey so default button can be seen (issue #3)

2. Bug fix:
    * Text rendering issue, gibberish text (issue #1)
    * Navbar brand margin left so it flushes with the container (issue #2)
    * navbar-toggle alignment issue (issue #4)
    * btn-circle alignment issue (issue #5)
    * Text-right doesn't work on td (issue #6)
    * Panel with table display issue (issue #11)

3. New features:
    * Breadcrumb within Navbar (issue #9)
    * Add Panel Card UI (issue #12)
    * Add progress bar to panel (issue #14)
    * Add progress bar to modal window (issue #15)

## Version 0.0.3

1. Removed import Roboto font in CSS to improve loading speed.
    * Remember to add `<link href='https://fonts.googleapis.com/css?family=Roboto' rel='stylesheet' type='text/css'>` to the header to load Roboto font.
    * Or you can use Web Font Loader to load dynamically. Read about [Web Font Loader](https://github.com/typekit/webfontloader).

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

2. Improvements:
    * Improved padding for forms input
    * Improved btn-default disabled background color.
