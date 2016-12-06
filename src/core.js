jstackClass = function(){
	this.config = {
		templatesPath: 'view-js/',
		controllersPath: 'controller-js/',
		defaultController: {},
		defaultTarget: '[j-app]',
		debug: $js.dev,
	};
	this.controllers = {};
};
jstackClass.prototype.extend = function(c,parent){
	c.prototype = Object.create(parent.prototype);
};
jstack = new jstackClass();