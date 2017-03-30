(function(){
	
let mutationObserver = new MutationObserver(function(mutations){
	$.each(mutations,function(i,mutation){
		$.each(mutation.addedNodes,function(ii,node){
			
			jstack.walkTheDOM(node,function(n){
				if(!document.body.contains(n) || n.nodeType!=Node.ELEMENT_NODE) return false;
				let $n = $(n);
				if($n.data('j:load:state')){
					return;
				}
				$n.data('j:load:state',true);
				jstack.trigger(n,'load');
			});
			
		});

		$.each(mutation.removedNodes,function(ii,node){
			jstack.walkTheDOM(node,function(n){
				if(n.nodeType!==Node.ELEMENT_NODE || !$(n).data('j:load:state')){
					return false;
				}
				jstack.trigger(n,'unload');
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

jstack._eventStack = {};

jstack.trigger = function(n,eventName){
	let $n = $(n);
	let callbacks = $n.data('j:event:'+eventName);
	if(callbacks){
		callbacks.forEach(function(callback){
			callback.call(n);
		});
	}
	if(jstack._eventStack[eventName]){
		$.each(jstack._eventStack,function(selector,callbacks){
			if($n.is(selector)){
				callbacks.forEach(function(callback){
					callback.call(n);
				});
			}
		});
	}
};
jstack.on = function(eventName,selector,callback){
	if(!jstack._eventStack[eventName]){
		jstack._eventStack[eventName] = {};
	}
	if(typeof(selector)=='string'){
		if(typeof(jstack._eventStack[selector])=='undefined'){
			jstack._eventStack[selector] = [];
		}
		jstack._eventStack[selector].push(callback);
	}
	else{
		let el = $(selector);
		let callbacks = el.data('j:event:'+eventName);
		if(!callbacks){
			callbacks = [];
			el.data('j:event:'+eventName,callbacks);
		}
		callbacks.push(callback);
	}
};


jstack.loader = function(selector,handler,unloader){
	jstack.on('load',selector,function(){
		handler.call(this);
	});
	if(typeof(unloader)=='function'){
		jstack.on('unload',selector,function(){
			unloader.call(this);
		});
	}
	$(selector).each(function(){
		handler.call(this);
	});
};


$.fn.onLoad = function(callback){
	return this.each(function(){
		jstack.on('load',this,callback);
	});
};
$.fn.onUnload = function(callback){
	return this.each(function(){
		jstack.on('unload',this,callback);
	});
};


})();
