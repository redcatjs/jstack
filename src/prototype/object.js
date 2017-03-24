if(!Object.prototype.observable){
	Object.defineProperty(Object.prototype, 'observable', {
		value: function(options){
			return jstack.observable(this,options);
		},
		enumerable: false
	});
}
