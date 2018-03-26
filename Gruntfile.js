/*!
 * Redmaterials' Gruntfile
 * https://redooor.github.io/redmaterials
 * Copyright 2013-2018 Redooor LLP
 * Licensed under MIT
 */
/*global module:false*/
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
            docs: 'docs/dist'
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
                preserveComments: false,
                banner: '/*!\n' +
                    ' * <%= pkg.name %> v<%= pkg.version %>\n' +
                    ' * Homepage: <%= pkg.homepage %>\n' +
                    ' * Copyright 2014-<%= grunt.template.today("yyyy") %> <%= pkg.author %>\n' +
                    ' * Licensed under <%= pkg.license %>\n' +
                    ' * Based on Bootstrap\n' +
                    '*/\n'
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
    grunt.registerTask('docs-css', ['less:docs', 'autoprefixer:docs', 'cssmin:docs']);
    grunt.registerTask('docs-js', ['uglify:docs']);
    grunt.registerTask('docs', ['docs-css', 'docs-js', 'clean:docs', 'copy:docs']);

    // For submission to repository: exclude dependencies
    grunt.registerTask('default', ['dist', 'docs']);
};
