# Change log

1. [Version 0.0.1](#version-001)
2. [Version 0.0.2](#version-002)
3. [Version 0.0.3](#version-003)
3. [Version 0.1.0](#version-010)

## Version 0.1.0

Bootstrap v4 has removed many default padding and margin to give way for v4 utilities. 
This is a good change! To match that I've removed many padding and margin in Redmaterials as well. 
Designers are then free to use the utilities to suit their needs. 
Do let me know if I've missed out any padding or margin.

Loving Bootstrap v4.

1. Support for Bootstrap v4. For Bootstrap v3, please use version 0.0.3.
2. Removed many padding and margin. Use utilities instead.

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
    * Specify gray color only for .control-label.
    * Fixed nav bar brand image size issue.
    * Fixed nav bar issues on mobile screen.
    * Removed all table and panel border radius.
    * Fixed Panel with list-group display issue #10.
    * Fixed Panel border issue between the body and group list.

3. New:
    * Navigation side bar with color variations.
    * Added color variations for Navigation bar.
    
4. Updated bower and npm dependencies.

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

## Version 0.0.1

1. Initial release.
2. Support most components in Bootstrap 3.3.4.
3. Included some Material Design inspired colors and elements like:
    * 5 different shadow depths
    * Colored buttons based on Material Design Color Palette
    * Colored stripped tables based on Material Design Color Palette
    * Normal, Flat, Raised and Round buttons
