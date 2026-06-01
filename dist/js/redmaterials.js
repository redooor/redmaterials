(function($) {
  "use strict";
  $(document).on("click touchstart", ".ripple-effect", function(e) {
    var ink, d, x, y, rippler = $(this);
    if (rippler.find(".ink").length === 0) {
      rippler.append("<span class='ink'></span>");
    }
    ink = rippler.find(".ink");
    ink.removeClass("animate");
    if (!ink.height() && !ink.width()) {
      d = Math.max(rippler.outerWidth(), rippler.outerHeight());
      ink.css({
        height: d,
        width: d
      });
    }
    x = e.pageX - rippler.offset().left - ink.width() / 2;
    y = e.pageY - rippler.offset().top - ink.height() / 2;
    ink.css({
      top: y + "px",
      left: x + "px"
    }).addClass("animate");
  });
  $(document).on("click touchstart", "[data-toggle=nav-sidebar-toggle]", function(e) {
    e.preventDefault();
    e.stopPropagation();
    var target, navbar;
    target = $(this).attr("data-target");
    if (target.length > 0) {
      navbar = $(target);
      if (navbar.length > 0) {
        navbar.toggleClass("active");
        $("body").toggleClass("rdm-ui-disable-scroll");
      }
    }
  });
})(jQuery);
