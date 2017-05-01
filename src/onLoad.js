(function(){
	
let mutationObserver = new MutationObserver(function(mutations){
	jstack._onStack.each(function(callbacks,selector){
		$(selector).not(':data("j:loaded")').each(function(){
			let n = this;
			let $n = $(this);
			$n.data('j:loaded',true);
			callbacks.forEach(function(callback){
				callback.call(n);
			});
		});
	});
});

mutationObserver.observe(document.body, {
	subtree: true,
	childList: true,
	characterData: true,
	attributes: false,
	attributeOldValue: false,
	characterDataOldValue: false,
});

jstack._onStack = {};

jstack.onLoad = function(selector,callback){
	if(typeof(jstack._onStack[selector])=='undefined'){
		jstack._onStack[selector] = [];
	}
	jstack._onStack[selector].push(callback);
};


jstack.loader = function(selector,handler){
	jstack.onLoad(selector,handler);
	$(selector).each(handler);
};


})();
