module.exports = function(grunt) {

// config
grunt.initConfig({
	pkg: grunt.file.readJSON('package.json'),

	concat: {
		dist: {
			src: [
				"src/core.js",
				"src/jquery-extend.js",
				"src/component.js",
				"src/hasOwnProperty2.js",
				"src/url.js",
				"src/route.js",
				"src/template.js",
				"src/controller.js",
				"src/directive.js",
				"src/directive-native.js",
				"src/uniqid.js",
				"src/get-template.js",
				"src/process-template.js",
				"src/data-binder.js",
				"src/ajax.js",
				"src/params-reflection.js",
				"src/jml.js",
				"src/string-prototyping.js",
				"src/populate.js",
				"src/data-if.js",
				"src/mvc.js",
				"src/app.js",
			],
			dest: 'jstack.js'
		}
	},
	
	uglify: {
		build: {
			src: 'jstack.js',
			dest: 'jstack.min.js'
		}
	},
	
	watch: {
		scripts: {
			files: ['src/*.js','Gruntfile.js'],
			tasks: ['concat','uglify'],
			options: {
				debounceDelay: 250,
			},
		},
	},

});

// plug-in register
grunt.loadNpmTasks('grunt-contrib-concat');
grunt.loadNpmTasks('grunt-contrib-uglify');
grunt.loadNpmTasks('grunt-contrib-watch');

// cli exec
grunt.registerTask('default', ['concat']);
grunt.registerTask('default', ['concat', 'uglify']);

};