![alt text][logo]

[logo]: https://redooor.github.io/redmaterials/assets/img/redmaterials_logo_sm.png "Redmaterials"

#Redmaterials by Redooor

Redmaterials is a Bootstrap theme inspired by Google Material Design and various projects.
It is a consolidation of many works by various people. Please refer to [Acknowledgement](#acknowledgement) for more information.

Redmaterials was initially developed/consolidated by Redooor to be used in another open-sourced project [Redminportal](https://github.com/redooor/redminportal). We've decided to create a separate open-sourced project and make it available to the public.

View demo at [https://redooor.github.io/redmaterials](https://redooor.github.io/redmaterials).

# Note to users

Version 0.1.0 is an incomplete release. We're constantly adding new features to Redmaterials. We appreciate your patience and welcome all contributions. Meanwhile, do expect that some things (specifically those elements that are not inherited from Bootstrap) are not confirmed and may be removed from future releases. We'll try as much as possible to retain the components inherited from Bootstrap.

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
* Use "dist/css/redmaterials.min.css" and "dist/js/redmaterials.min.css"
* Redmaterials CSS and JS must be
    * used together with Bootstrap's CSS and JS
    * declared after Bootstrap's CSS and JS

# Installation for Contributors

* Clone to a folder
* Run `npm install` to install grunt and bower
* Run `bower install` to install development dependencies
* Run `grunt docs` to build assets for documentation
* Run `grunt dist` to build assets for distribution
* Run `grunt` to build assets for both distribution and documentation, for development only

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
* [Bootstrap by Twitter](http://getbootstrap.com/)
* [Bootswatch Paper](http://bootswatch.com/paper/)
* [Bootstrap Material Design - Buttons, pen by Sergey Kupletsky](http://codepen.io/zavoloklom/details/Gubja)
* [Bootstrap Material Design - Responsive Table, pen by Sergey Kupletsky](http://codepen.io/zavoloklom/pen/IGkDz)
* [Material Design Icon](https://material.io/icons/)
