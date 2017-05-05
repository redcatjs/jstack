jstackClass = function(){
	this.config = {
		templatesPath: 'app/',
		controllersPath: 'app/',
		debug: $js.dev,
	};
};
jstackClass.prototype.extend = function(c,parent){
	c.prototype = Object.create(parent.prototype);
};
jstack = new jstackClass();
