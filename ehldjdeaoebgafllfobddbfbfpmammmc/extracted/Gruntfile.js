module.exports = function (grunt) {
    // Loading plugin(s)
    grunt.loadNpmTasks('grunt-bower-requirejs');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-karma');
    
    grunt.initConfig({
        /****************************************************************
        ************************  Code Quality  *************************
        ****************************************************************/
        jshint: {
            options: {
                jshintrc: './.jshintrc',
                ignores: ['js/amd/lib/**/*.js', 'js/amd/desktop.js', 'js/test/pagePrep.js']
            },
            app: [
                'js/amd/**/*.js',
                'ui/js/**/*.js'
            ],
            tests: [
                'js/test/**/*.js'
            ]
        },
        /****************************************************************
        *************************  Unit Tests  **************************
        ****************************************************************/
        karma: {
            options: {
                configFile: 'karma.conf.js',
                client: {
                    captureConsole: false,
                    jasmine:{
                        random:false
                      }
                }
            },
            //Essentially a replacement for karma start
            unit: {
                singleRun: true
            },
            //For use with grunt watch
            dev: {
                singleRun: false,
                autoWatch: false,
                background: true
            },
            ci: {
                singleRun: true,
            },
            debug: {
               singleRun: false,
               reporters: ['dots']
            },
            filesys: {
                singleRun: true,
                reporters: ['dots'],
                exclude: [//excludes minus filesystem.tests.js
                  "js/test/**/logger.tests.js",
                  "js/amd/desktop.js",
                  "js/test/testAppBlock.js"
              ],
            }
        },
        /****************************************************************
        **************************  Workflow  ***************************
        ****************************************************************/
        watch: {
            lint: {
                files: [
                    'js/**/*.js',
                    'ui/**/*.js'
                ],
                tasks: ['lint']
            },
            //example usage: grunt karma:dev:start watch
            //               grunt karma:dev:start watch:karma
            karma: {
                files: [
                    'js/**/*.js',
                    'ui/**/*.js'
                ],
                tasks: ['karma:dev:run']
            }
        },
        /****************************************************************
        ****   Update RequireJS Configs based on bower dependencies  ****
        ****************************************************************/
        bowerRequirejs: {
            background: {
                rjsConfig: 'js/background.js'
            },
            form: {
                rjsConfig: 'js/content/form.js'
            },
            browserAction: {
                rjsConfig: 'ui/js/browserActionMain.js'
            },
            status: {
                rjsConfig: 'ui/js/main.js'
            },
            poll: {
                rjsConfig: 'ui/js/mainPoll.js'
            }
        }
    });
    
    grunt.registerTask("updateVersion", "Updates manifest.json with new version", function (version){
        if (!version){
            grunt.log.writeln("oops, was definitely expecting a version");
            grunt.log.writeln("Ex: grunt updateVersion:7.0.0");
        } else {
            grunt.log.writeln("woot, will set to " + version);
            var manifest = grunt.file.readJSON("./manifest.json");
            manifest.version = version;
            grunt.file.write("./manifest.json", JSON.stringify(manifest, null, 4));
        }
    });

    grunt.registerTask("setDev", "Updates /js/isDebug.js to be clear we are not debug", function () {
        grunt.file.write("./js/isDebug.js", "export default {debug: true};")
    });

    grunt.registerTask("clearDev", "Updates /js/isDebug.js to be clear we are not debug", function () {
        grunt.file.write("./js/isDebug.js", "export default {debug: false};")
    });
    
    grunt.registerTask('default', []);
    grunt.registerTask('devConfig', ['bowerRequirejs']);
    grunt.registerTask('lint', "runs eslint", function () {
        //just a hack to get this into grunt quickly
        var child_process = require('child_process');
        var log = child_process.execSync("npx eslint js/mjs");
        grunt.log.writeln(log);
    });
    grunt.registerTask('dev', ['lint', 'karma:unit', 'karma:dev:start', 'watch']);
};