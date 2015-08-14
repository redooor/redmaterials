/*jslint browser: true, plusplus: true, vars: true*/
/*global $, jQuery, angular*/
(function () {
    'use strict';
    var app = angular.module("docs", []);
    
    app.directive("viewBanner", function () {
        return {
            restrict: "E",
            templateUrl: "views/banner.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewNavbar", function () {
        return {
            restrict: "E",
            templateUrl: "views/navbar.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewButtons", function () {
        return {
            restrict: "E",
            templateUrl: "views/buttons.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewTypography", function () {
        return {
            restrict: "E",
            templateUrl: "views/typography.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewTables", function () {
        return {
            restrict: "E",
            templateUrl: "views/tables.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewForms", function () {
        return {
            restrict: "E",
            templateUrl: "views/forms.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewNavs", function () {
        return {
            restrict: "E",
            templateUrl: "views/navs.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewIndicators", function () {
        return {
            restrict: "E",
            templateUrl: "views/indicators.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewProgressbars", function () {
        return {
            restrict: "E",
            templateUrl: "views/progressbars.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewContainers", function () {
        return {
            restrict: "E",
            templateUrl: "views/containers.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
  
    app.directive("viewPanels", function () {
        return {
            restrict: "E",
            templateUrl: "views/panels.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewDialogs", function () {
        return {
            restrict: "E",
            templateUrl: "views/dialogs.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewFooter", function () {
        return {
            restrict: "E",
            templateUrl: "views/footer.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    // For Redmaterials
    app.directive("viewRedmaterialsButtons", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/buttons.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
  
    app.directive("viewRedmaterialsTables", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/tables.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewRedmaterialsShadow", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/shadows.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewRedmaterialsRibbons", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/ribbons.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    // Scroll to anchor
    function sharedLinkFunction( scope, element, attributes ) {
        var hash = window.location.hash.substr(1);
        var $hashTag = $('#' + hash);
        if ($hashTag.length > 0) {
            $('html, body').animate({scrollTop: $hashTag.offset().top}, 0);
        }
    }
    
}());

(function ($) {
    'use strict';
    $(function () {
        $('[data-toggle="tooltip"]').tooltip();
        $('[data-toggle="popover"]').popover();
    });
}(window.jQuery));
