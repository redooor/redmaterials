/*jslint browser: true, plusplus: true, vars: true*/
/*global $, jQuery, angular*/
(function () {
    'use strict';
    var app = angular.module("docs", []);
    
    app.directive("viewBanner", function () {
        return {
            restrict: "E",
            templateUrl: "views/banner.html"
        };
    });
    
    app.directive("viewNavbar", function () {
        return {
            restrict: "E",
            templateUrl: "views/navbar.html"
        };
    });
    
    app.directive("viewButtons", function () {
        return {
            restrict: "E",
            templateUrl: "views/buttons.html"
        };
    });
    
    app.directive("viewTypography", function () {
        return {
            restrict: "E",
            templateUrl: "views/typography.html"
        };
    });
    
    app.directive("viewTables", function () {
        return {
            restrict: "E",
            templateUrl: "views/tables.html"
        };
    });
    
    app.directive("viewForms", function () {
        return {
            restrict: "E",
            templateUrl: "views/forms.html"
        };
    });
    
    app.directive("viewNavs", function () {
        return {
            restrict: "E",
            templateUrl: "views/navs.html"
        };
    });
    
    app.directive("viewIndicators", function () {
        return {
            restrict: "E",
            templateUrl: "views/indicators.html"
        };
    });
    
    app.directive("viewProgressbars", function () {
        return {
            restrict: "E",
            templateUrl: "views/progressbars.html"
        };
    });
    
    app.directive("viewContainers", function () {
        return {
            restrict: "E",
            templateUrl: "views/containers.html"
        };
    });
  
    app.directive("viewPanels", function () {
        return {
            restrict: "E",
            templateUrl: "views/panels.html"
        };
    });
    
    app.directive("viewDialogs", function () {
        return {
            restrict: "E",
            templateUrl: "views/dialogs.html"
        };
    });
    
    app.directive("viewFooter", function () {
        return {
            restrict: "E",
            templateUrl: "views/footer.html"
        };
    });
    
    // For Redmaterials
    app.directive("viewRedmaterialsButtons", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/buttons.html"
        };
    });
  
    app.directive("viewRedmaterialsTables", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/tables.html"
        };
    });
    
    app.directive("viewRedmaterialsShadow", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/shadows.html"
        };
    });
}());

(function ($) {
    'use strict';
    $(function () {
        $('[data-toggle="tooltip"]').tooltip();
        $('[data-toggle="popover"]').popover();
    });
}(window.jQuery));
