jstackClass = function(){
	this.config = {
		templatesPath: '',
		controllersPath: '',
		defaultController: function( controllerPath ) {
			jstack.controller( controllerPath, function() {
				this.jstack.render();
			} );
		},
		defaultTarget: '[j-app]',
	};
	this.controllers = {};
};
jstackClass.prototype.extend = function(c,parent){
	c.prototype = Object.create(parent.prototype);
};
jstack = new jstackClass();