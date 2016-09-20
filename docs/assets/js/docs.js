/*jslint browser: true, plusplus: true, vars: true*/
/*global $, jQuery, angular, Prism*/
(function () {
    'use strict';
    var app = angular.module("docs", []);
    
    // Scroll to anchor on load
    function sharedLinkFunction(scope, element, attributes) {
        var hash = window.location.hash.substr(1);
        var $hashTag = $('#' + hash);
        if ($hashTag.length > 0) {
            $('html, body').animate({scrollTop: $hashTag.offset().top}, 0);
        }
    }
    
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
    
    app.directive("viewRedmaterialsNavbar", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/navbar.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewRedmaterialsPanels", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/panels.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewRedmaterialsModals", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/modals.html",
            link: {
                post: sharedLinkFunction
            }
        };
    });
    
    app.directive("viewRedmaterialsNavSidebar", function () {
        return {
            restrict: "E",
            templateUrl: "views/redmaterials/nav-sidebar.html",
            link: {
                post: sharedLinkFunction
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
    });
}(window.jQuery));
