module.exports = function(grunt) {

// config
grunt.initConfig({
	pkg: grunt.file.readJSON('package.json'),

	concat: {
		dist: {
			src: [
				"src/core.js",
				"src/observe.js",
				"src/controller.js",
				"src/url.js",
				"src/uniqid.js",
				
				"src/std/isPositiveInteger.js",
				"src/std/isIntKey.js",
				"src/std/arrayRemove.js",
				"src/std/log.js",
				"src/std/randomColor.js",
				"src/std/isMobile.js",
				
				"src/prototype/string.js",
				"src/prototype/object.js",

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
				"src/jquery/xhrPool.js",
				"src/jquery/onFirst-onLast.js",
				"src/jquery/selectRange.js",
				"src/jquery/serializeForm.js",
				
				"src/template/getTemplate.js",
				
				"src/route.js",
				"src/routeMVC.js",
				
				"src/data-binding/data-binder.js",
				"src/data-binding/model-observable.js",
				"src/data-binding/for.js",
				"src/data-binding/if.js",
				"src/data-binding/switch.js",
				"src/data-binding/show.js",
				"src/data-binding/href.js",
				"src/data-binding/two-points.js",
				"src/data-binding/j-data.js",
				"src/data-binding/j-on.js",
				"src/data-binding/input-file.js",
				"src/data-binding/input.js",
				"src/data-binding/text.js",
				
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
			//tasks: ['concat','uglify'],
			tasks: ['concat'],
			options: {
				debounceDelay: 250,
			},
		},
	},

});

// plug-in register
grunt.loadNpmTasks('grunt-contrib-concat');
//grunt.loadNpmTasks('grunt-contrib-uglify');
grunt.loadNpmTasks('grunt-contrib-watch');

// cli exec
grunt.registerTask('default', ['concat']);
//grunt.registerTask('default', ['concat', 'uglify']);

};
