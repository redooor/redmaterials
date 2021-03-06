/*!
 * redmaterials v0.1.0
 * Homepage: 
 * Copyright 2014-2018 Redooor LLP
 * Licensed under MIT
 * Based on Bootstrap
*/
/*eslint-disable*/
/*jslint browser: true, plusplus: true, vars: true*/
/*global $, jQuery*/
(function ($) {
    "use strict";
    // Ripple-effect animation
    // Source: http://codepen.io/zavoloklom/pen/Gubja/
    $(document).on("click touchstart", ".ripple-effect", function (e) {
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
    // Navigation sidebar slide in/out
    $(document).on('click touchstart', '[data-toggle=nav-sidebar-toggle]', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var target, navbar;
        target = $(this).attr('data-target');
        if (target.length > 0) {
            navbar = $(target);
            if (navbar.length > 0) {
                navbar.toggleClass('active');
                $('body').toggleClass('rdm-ui-disable-scroll');
            }
        }
    });
}(jQuery));
