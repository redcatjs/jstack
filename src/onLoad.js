(function(){

let loadMutationsPerform = function(){
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
};

let updateDeferQueued = false;
let updateDeferInProgress = false;
let updateTimeout;
let loadMutations = function(){
	if(updateDeferQueued){
		return;
	}
	if(updateDeferInProgress){
		updateDeferQueued = true;
	}
	else{
		updateDeferInProgress = true;
		if(updateTimeout){
			clearTimeout(updateTimeout);
		}
		updateTimeout = setTimeout(function(){
			console.log('loadMutationsPerform');
			loadMutationsPerform();
			let updateDeferQueuedState = updateDeferQueued;
			updateDeferInProgress = false;
			updateDeferQueued = false;
			if(updateDeferQueuedState){
				loadMutations();
			}
		},500);
	}

};

let mutationObserver = new MutationObserver(function(mutations){
	loadMutations();
});

mutationObserver.observe(document.body, {
	subtree: true,
	childList: true,
	characterData: false,
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
