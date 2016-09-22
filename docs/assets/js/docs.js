/*jslint browser: true, plusplus: true, vars: true*/
/*global $, jQuery, angular, Prism, WebFont*/
(function () {
    'use strict';
    var app = angular.module("docs", []);
    
    app.controller("colorRepeater", ['$scope', function ($scope) {
        $scope.colors = [
            'default',
            'red',
            'pink',
            'purple',
            'deep-purple',
            'indigo',
            'blue',
            'light-blue',
            'cyan',
            'teal',
            'green',
            'light-green',
            'lime',
            'yellow',
            'amber',
            'orange',
            'deep-orange',
            'brown',
            'grey',
            'blue-grey'
        ];
    }]);
    
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
    
    app.directive("viewRedmaterialsRibbons", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/ribbons.html"
        };
    });
    
    app.directive("viewRedmaterialsNavbar", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/navbar.html",
            scope: {
                colors: "="
            }
        };
    });
    
    app.directive("viewRedmaterialsPanels", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/panels.html"
        };
    });
    
    app.directive("viewRedmaterialsModals", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/modals.html"
        };
    });
    
    app.directive("viewRedmaterialsNavSidebar", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/nav-sidebar.html",
            scope: {
                colors: "="
            }
        };
    });
    
    // Prism for syntax highlighting
    app.directive('ngPrism', [function () {
        return {
            restrict: 'A',
            link: function ($scope, element, attrs) {
                element.ready(function () {
                    Prism.highlightElement(element[0]);
                });
            }
        };
    }]);
}());

(function ($) {
    'use strict';
    $(function () {
        $('[data-toggle="tooltip"]').tooltip();
        $('[data-toggle="popover"]').popover();
        function setActiveMenu() {
            var anchor = window.location.hash;
            $('#nav_sidebar1 .nav li a').each(function () {
                if ($(this).attr('href') === anchor) {
                    $(this).parent().addClass('active');
                }
            });
        }
        setActiveMenu();
        $(document).on('click touchstart', '#nav_sidebar1 .nav li a', function () {
            var goto, hashTag;
            goto = $(this).attr('href').substr(1);
            hashTag = $('#' + goto);
            if (hashTag.length > 0) {
                $('html, body').animate({scrollTop: hashTag.offset().top}, 300);
            }
        });
        // Load webfont Roboto
        var webfontsite = "https://cdnjs.cloudflare.com/ajax/libs/webfont/1.6.26/webfontloader.js";
        $.ajax({
            url: webfontsite,
            dataType: "script",
            success: function () {
                WebFont.load({
                    google: {
                        families: ['Roboto']
                    }
                });
            }
        });
        // Scroll to anchor on load
        var scrollToLoop;
        function sharedLinkFunction() {
            var hash = window.location.hash.substr(1);
            var $hashTag = $('#' + hash);
            if ($hashTag.length > 0) {
                $('html, body').animate({scrollTop: $hashTag.offset().top}, 0);
                window.clearInterval(scrollToLoop); // stop the loop
            }
        }
        scrollToLoop = window.setInterval(sharedLinkFunction, 500);
    });
}(jQuery));
