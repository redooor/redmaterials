/*jslint browser: true, plusplus: true, vars: true*/
/*global $, jQuery*/

// Ripple-effect animation
// Source: http://codepen.io/zavoloklom/pen/Gubja/
(function ($) {
    "use strict";
    $(document).on("click", ".ripple-effect", function (e) {
        var ink, d, x, y,
            rippler = $(this);

        // create .ink element if it doesn't exist
        if (rippler.find(".ink").length === 0) {
            rippler.append("<span class='ink'></span>");
        }

        ink = rippler.find(".ink");

        // prevent quick double clicks
        ink.removeClass("animate");

        // set .ink diametr
        if (!ink.height() && !ink.width()) {
            d = Math.max(rippler.outerWidth(), rippler.outerHeight());
            ink.css({
                height: d,
                width: d
            });
        }

        // get click coordinates
        x = e.pageX - rippler.offset().left - ink.width() / 2;
        y = e.pageY - rippler.offset().top - ink.height() / 2;

        // set .ink position and add class .animate
        ink.css({
            top: y + 'px',
            left: x + 'px'
        }).addClass("animate");
    });
}(jQuery));