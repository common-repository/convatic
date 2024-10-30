module.exports = function ( grunt ) {
    grunt.initConfig( {
        pkg: grunt.file.readJSON( 'package.json' ),
        concat: {
            js: {
                src: [
                    'js/utils.js',
                    'js/app.js',
                    'js/models/*',
                    'js/views/*',
                    'js/main.js'
                ],
                dest: 'build/js/app-concat.js'
            }
        },
        uglify: {
            js: {
                files: {
                    'build/js/app-concat.min.js': ['build/js/app-concat.js'],
                    'build/js/jquery.cookie.min.js': ['js/plugins/jquery.cookie.js'],
                    'build/js/placeholders.min.js': ['js/plugins/placeholders.js'],
                    'build/js/jquery.expanding.min.js': ['js/plugins/jquery.expanding.js']
                }
            }
        },
        sass: {
            dist: {
                files: {
                    'build/css/convatic.css' : 'includes/template/css/convatic.scss'
                }
            }
        },
        cssmin: {
            css: {
                src: 'build/css/convatic.css',
                dest: 'build/css/convatic.min.css'
            }
        },
        jshint: {
            options: {
                smarttabs: true
            },
            beforeconcat: [
                'js/utils.js',
                'js/app.js',
                'js/models/*',
                'js/views/*',
                'js/main.js',

            ],
            afterconcat: ['build/js/app-concat.js']
        },
        watch: {
			files: [
                'js/*',
                'js/plugins/*.js',
                'js/models/*',
                'js/views/*',
                'includes/template/css/convatic.scss'
            ],
			tasks: ['concat', 'uglify', 'sass', 'cssmin']
		}
    });
    grunt.loadNpmTasks( 'grunt-contrib-concat' );
    grunt.loadNpmTasks( 'grunt-contrib-uglify' );
    grunt.loadNpmTasks( 'grunt-contrib-sass' );
    grunt.loadNpmTasks( 'grunt-contrib-cssmin' );
    grunt.loadNpmTasks( 'grunt-contrib-jshint' );
    grunt.loadNpmTasks( 'grunt-contrib-watch' );
    grunt.registerTask( 'default', ['concat:js', 'uglify:js', 'sass', 'cssmin:css'] );
};