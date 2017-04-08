if(!Object.prototype.observable){
	Object.defineProperty(Object.prototype, 'observable', {
		value: function(options){
			return jstack.observable(this,options);
		},
		enumerable: false,
		writable: true,
	});
}
if(!Object.prototype.observe){
	Object.defineProperty(Object.prototype, 'observe', {
		value: function(key,callback,namespace,recursive){
			return jstack.observe(this,key,callback,namespace,recursive);
		},
		enumerable: false,
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
if(!Object.prototype.each){
	Object.defineProperty(Object.prototype, 'each', {
		value: function(callback){
			let o = this;
			Object.keys(this).map(function(k){
				callback(o[k],k,o);
			});
			return this;
		},
		enumerable: false,
		writable: true,
	});
}
