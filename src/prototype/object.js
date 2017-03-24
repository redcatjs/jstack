if(!String.prototype.observable){
	Object.defineProperty(String.prototype, 'observable', {
		value: function(options){
			return jstack.observable(this,options);
		},
		enumerable: false
	});
}
