(function(){

let onLoadStack = {};

jstack.onLoad = function(selector, callback){
	if(!onLoadStack[selector]){
		onLoadStack[selector] = [];
	}
	onLoadStack[selector].push(callback);
};

jstack.triggerLoaded = function(el){
	onLoadStack.each(function(callbacks,selector){
		$(selector,el).each(function(){
			let self = this;
			callbacks.forEach(function(callback){
				callback.call(self);
			});
		});
	});
};

})();
