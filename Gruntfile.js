/*!
 * Redmaterials' Gruntfile
 * http://redmaterials.redooor.com
 * Copyright 2013-2015 Redooor LLP
 * Licensed under MIT
 */

module.exports = function (grunt) {
    'use strict';

    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-banner');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');

    var configBridge = grunt.file.readJSON('./bower_components/bootstrap/grunt/configBridge.json', {
        encoding: 'utf8'
    });

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        builddir: '.',
        buildtheme: '',
        banner: '/*!\n' +
            ' * <%= pkg.name %> v<%= pkg.version %>\n' +
            ' * Homepage: <%= pkg.homepage %>\n' +
            ' * Copyright 2014-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
            ' * Licensed under <%= pkg.license %>\n' +
            ' * Based on Bootstrap\n' +
            '*/\n',
        clean: {
            dist: 'dist',
            docs: 'docs/dist',
            demo: ['docs/assets/fonts', 'docs/assets/js/bootstrap.*', 'docs/assets/js/jquery.*', 'docs/assets/js/angular.*', 'docs/assets/css/bootstrap.*', 'docs/assets/css/font-awesome.*']
        },
        concat: {
            options: {
                banner: '<%= banner %>',
                stripBanners: false
            },
            redmaterials: {
                src: ['js/redmaterials.js'],
                dest: 'dist/js/redmaterials.js'
            }
        },
        uglify: {
            options: {
                preserveComments: 'some'
            },
            core: {
                src: '<%= concat.redmaterials.dest %>',
                dest: 'dist/js/<%= pkg.name %>.min.js'
            },
            docs: {
                src: 'docs/assets/js/docs.js',
                dest: 'docs/assets/js/docs.min.js'
            }
        },
        less: {
            compileCore: {
                options: {
                    strictMath: true,
                    sourceMap: true,
                    outputSourceFiles: true,
                    sourceMapURL: '<%= pkg.name %>.css.map',
                    sourceMapFilename: 'dist/css/<%= pkg.name %>.css.map'
                },
                src: 'less/redmaterials.less',
                dest: 'dist/css/<%= pkg.name %>.css'
            },
            docs: {
                options: {
                    strictMath: true,
                    sourceMap: true,
                    outputSourceFiles: true,
                    sourceMapURL: 'docs.css.map',
                    sourceMapFilename: 'docs/assets/css/docs.css.map'
                },
                src: 'docs/assets/css/docs.less',
                dest: 'docs/assets/css/docs.css'
            }
        },
        autoprefixer: {
            options: {
                browsers: configBridge.config.autoprefixerBrowsers
            },
            core: {
                options: {
                    map: true
                },
                src: 'dist/css/<%= pkg.name %>.css'
            },
            docs: {
                options: {
                    map: true
                },
                src: 'docs/assets/css/docs.css'
            }
        },
        cssmin: {
            options: {
                compatibility: 'ie8',
                keepSpecialComments: '*',
                noAdvanced: true
            },
            minifyCore: {
                src: 'dist/css/<%= pkg.name %>.css',
                dest: 'dist/css/<%= pkg.name %>.min.css'
            },
            docs: {
                src: 'docs/assets/css/docs.css',
                dest: 'docs/assets/css/docs.min.css'
            }
        },
        usebanner: {
            options: {
                position: 'top',
                banner: '<%= banner %>'
            },
            files: {
                src: 'dist/css/*.css'
            }
        },
        copy: {
            docs: {
                src: 'dist/*/*',
                dest: 'docs/'
            },
            bootstrapjs: {
                src: 'bower_components/bootstrap/dist/js/bootstrap.min.js',
                dest: 'docs/assets/js/bootstrap.min.js'
            },
            bootstrapcss: {
                src: 'bower_components/bootstrap/dist/css/bootstrap.min.css',
                dest: 'docs/assets/css/bootstrap.min.css'
            },
            bootstrapfonts: {
                expand: true,
                cwd: 'bower_components/bootstrap/fonts/',
                src: '**',
                dest: 'docs/assets/fonts/',
                flatten: true,
                filter: 'isFile'
            },
            fontawesomecss: {
                src: 'bower_components/font-awesome/css/font-awesome.min.css',
                dest: 'docs/assets/css/font-awesome.min.css'
            },
            fontawesomefonts: {
                expand: true,
                cwd: 'bower_components/font-awesome/fonts/',
                src: '**',
                dest: 'docs/assets/fonts/',
                flatten: true,
                filter: 'isFile'
            },
            angularjs: {
                src: 'bower_components/angular/angular.min.js',
                dest: 'docs/assets/js/angular.min.js'
            },
            jqueryjs: {
                src: 'bower_components/jquery/dist/jquery.min.js',
                dest: 'docs/assets/js/jquery.min.js'
            }
        },
        watch: {
            files: ['less/**/*.less'],
            tasks: 'default',
            options: {
                livereload: true,
                nospawn: true
            }
        },
        connect: {
            server: {
                options: {
                    port: 3000,
                    base: '.'
                }
            }
        }
    });

    grunt.registerTask('none', function () {});

    // JS distribution task.
    grunt.registerTask('dist-js', ['concat', 'uglify:core']);

    // CSS distribution task.
    grunt.registerTask('less-compile', ['less:compileCore']);
    grunt.registerTask('dist-css', ['less-compile', 'autoprefixer:core', 'usebanner', 'cssmin:minifyCore']);

    // Fonts should be included with bootstrap in HTML
    grunt.registerTask('dist', ['clean:dist', 'dist-css', 'dist-js']);

    // Docs task.
    grunt.registerTask('docs-assets', ['copy:bootstrapjs', 'copy:bootstrapcss', 'copy:bootstrapfonts', 'copy:fontawesomecss', 'copy:fontawesomefonts', 'copy:angularjs', 'copy:jqueryjs']);
    grunt.registerTask('docs-css', ['less:docs', 'autoprefixer:docs', 'cssmin:docs']);
    grunt.registerTask('docs-js', ['uglify:docs']);
    grunt.registerTask('docs-bare', ['docs-css', 'docs-js', 'clean:docs', 'copy:docs']);
    grunt.registerTask('docs', ['docs-bare', 'docs-assets']);

    // For submission to repository: exclude dependencies
    grunt.registerTask('bare', ['clean:demo', 'clean:dist', 'dist-css', 'dist-js', 'docs-bare']);

    // Demo: include all dependencies, for uploading to demo site
    grunt.registerTask('default', ['clean:dist', 'dist-css', 'dist-js', 'docs']);
};
