
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
