if(!Object.prototype.observable){
	Object.defineProperty(Object.prototype, 'observable', {
		value: function(options){
			return jstack.observable(this,options);
		},
		enumerable: false
		writable: true,
	});
}
if(!Object.prototype.observe){
	Object.defineProperty(Object.prototype, 'observe', {
		value: function(key,callback,namespace,recursive){
			return jstack.observe(this,key,callback,namespace,recursive);
		},
		enumerable: false
		writable: true,
	});
}
if(!Object.prototype.unobserve){
	Object.defineProperty(Object.prototype, 'unobserve', {
		value: function(key,callback,namespace,recursive){
			return jstack.unobserve(this,key,callback,namespace,recursive);
		},
		enumerable: false,
		writable: true,
	});
}
