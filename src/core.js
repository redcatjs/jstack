jstackClass = function(){
	this.config = {
		templatesPath: 'app/',
		controllersPath: 'app/',
		debug: window.APP_DEV_MODE || false,
	};
};
jstackClass.prototype.extend = function(c,parent){
	c.prototype = Object.create(parent.prototype);
};
jstack = new jstackClass();
