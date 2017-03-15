module.exports = function(grunt) {

// config
grunt.initConfig({
	pkg: grunt.file.readJSON('package.json'),

	concat: {
		dist: {
			src: [
				"src/core.js",
				"src/object-observable.js",
				"src/controller.js",
				"src/url.js",
				"src/uniqid.js",
				
				"src/std/isPositiveInteger.js",
				"src/std/isIntKey.js",
				"src/std/arrayRemove.js",
				"src/std/log.js",
				"src/std/randomColor.js",
				"src/std/fragmentToHTML.js",
				"src/std/isMobile.js",
				
				"src/string/camelCase.js",
				"src/string/lcfirst.js",
				"src/string/replaceAll.js",
				"src/string/snakeCase.js",
				"src/string/trim.js",
				"src/string/ucfirst.js",
				
				"src/reflection/core.js",
				"src/reflection/arguments.js",
				"src/reflection/is-cyclic.js",
				
				"src/dom/traverseDom.js",
				"src/dom/walkTheDom.js",
				
				"src/jquery/arrayCompare.js",
				"src/jquery/attrStartsWith.js",
				"src/jquery/attrsToObject.js",
				"src/jquery/changeVal.js",
				"src/jquery/childrenHeight.js",
				"src/jquery/dataAttrConfig.js",
				"src/jquery/findExclude.js",
				"src/jquery/hasHorizontalScrollBar.js",
				"src/jquery/hasVerticalScrollBar.js",
				"src/jquery/nth-level.js",
				"src/jquery/on-off.js",
				"src/jquery/pseudo-selectors.js",
				"src/jquery/removeClassPrefix.js",
				"src/jquery/requiredId.js",
				"src/jquery/reverse.js",
				"src/jquery/val.js",
				"src/jquery/populate.js",
				"src/jquery/outerHTML.js",
				"src/jquery/hasAttr.js",
				"src/jquery/jComponentReady.js",
				"src/jquery/jquery-serialize-object.js",
				"src/jquery/prettifyHTML.js",
				"src/jquery/replaceTagName.js",
				"src/jquery/jModel.js",
				"src/jquery/comment.js",
				"src/jquery/jData.js",
				"src/jquery/onJstackReady.js",
				"src/jquery/xhrPool.js",
				"src/jquery/onFirst-onLast.js",
				
				"src/template/getTemplate.js",
				
				"src/route.js",
				"src/routeMVC.js",
				"src/data-binder.js",
				"src/load.js",
				"src/component.js",
				"src/ajax.js",
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
			files: ['src/*.js','src/*/*.js','Gruntfile.js'],
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
