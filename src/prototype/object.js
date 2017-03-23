if(!String.prototype.observable){
	Object.defineProperty(String.prototype, 'observable', {
		value: function() {
			return jstack.observable(this);
		},
		enumerable: false
	});
}

if(!String.prototype.observe){
	Object.defineProperty(String.prototype, 'observable', {
		value: function() {
			return jstack.observe.apply(jstack,arguments);
		},
		enumerable: false
	});
}
