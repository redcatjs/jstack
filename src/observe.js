(function(){

let globalPrefix = '__JSTACK__OBSERVABLE__';

var observe = function(options,rootObject){
	
	let obj = options.object;
	let callbackUser = options.callback;
	let recursive = options.recursive;
	let key = options.key;
	let namespace = options.namespace;
	if(!rootObject){
		rootObject = obj;
	}
	
	let prefix = globalPrefix;
	if(namespace){
		prefix += namespace;
	}
	
	let callbackDef = {
		key:key,
		callback:callbackUser
	};
	
	let callbackStack = obj[prefix];
	if(callbackStack){
		callbackStack.push(callbackDef);
		return obj;
	}
	callbackStack = [];
	callbackStack.push(callbackDef);
	if(recursive){
		$.each(obj,function(k,v){
			if(typeof(v)=='object'&&v!==null){
				obj[k] = observe( $.extend({},options,{object:v}) ,obj);
			}
		});
	}
	
	let callback = function(type,data,target,rootObject){
		let change = {
			type:type,
			target:target,
			rootObject:rootObject,
		};
		if(type=='set'){
			change.key = data.key;
			change.value = data.value;
		}
		else if(type=='unset'){
			change.key = data;
		}
		for(let i=0, l = callbackStack.length; i<l; i++){
			let callbackDef = callbackStack[i];
			if( !key || key===callbackDef.key ){
				callbackDef.callback(change);
			}
		}
	};
	
	let proxy = new Proxy(obj,{
		get: function (target, key, receiver) {
			if(key===prefix){
				return callbackStack;
			}
			return Reflect.get(target,key,receiver);
		},
		set: function(target, key, value, receiver){
			if(recursive){
				if(typeof(value)=='object'&&value!==null){
					value = observe($.extend({},options,{object:value}), rootObject);
				}
			}
			let r = Reflect.set(target, key, value, receiver);
			callback('set', {key:key, value:value}, target, rootObject);
			return r;
		},
		deleteProperty: function (target, key) {
			//let r = Reflect.deleteProperty(target,key);
			if (Array.isArray (target))
				target.splice(key,1);
			else
				delete(target[key]);
			callback('unset', key, target, rootObject);
			return true;
		},
		ownKeys: function(target){
			return Reflect.ownKeys(target);
		},
		
	});
	
	return proxy;
};

jstack.observe = function(){
	let options;
	if(arguments.length==1){
		options = arguments[0]
	}
	else{
		options = {};
		options.object = arguments[0];
		let arg1 = arguments[1];
		if(typeof(arg1)=='object'&&arg1 instanceof Array){
			options.callback = arguments[2];
			options.recursive = arguments[3];
			options.namespace = arguments[4];
			for(var i=0, l = arg1.length; i<l; i++){
				observe( $.extend({}, arg1[i], { key :arg1[i] }) );
			}
			return;
		}
		else if(typeof(arg1)=='function'){
			options.callback = arg1;
			options.recursive = arguments[2];
			options.namespace = arguments[3];
		}
		
	}
	return observe(options);
};


let unObserve = function(options){
	let prefix = globalPrefix;
	if(options.namespace){
		prefix += options.namespace;
	}
	let callbackStack = options.object[prefix];
	if(!callbackStack){
		return;
	}
	let callback = options.callback;
	let key = options.key;
	if(key || callback){		
		for(let i=0, l = callbackStack.length; i<l; i++){
			let callbackDef = callbackStack[i];
			if( ( !key || key === callbackDef.key ) && ( !callback || callback===callbackDef.callback ) ){
				callbackStack.splice(i,1);
			}
		}
	}
	else{
		callbackStack.length = 0;
	}
};

jstack.unObserve = function(){
	let options;
	if(arguments.length==1){
		options = arguments[0]
	}
	else{
		options = {};
		options.object = arguments[0];
		let arg1 = arguments[1];
		if(typeof(arg1)=='string'){
			arg1 = [arg1];
		}
		if(typeof(arg1)=='object'&&arg1 instanceof Array){
			options.key = arg1;
			options.callback = arguments[2];
			options.namespace = arguments[3];
		}
		else if(typeof(arg1)=='function'){
			options.callback = arg1;
			options.namespace = arguments[2];
		}
		
	}
	return unObserve(options);
};

})();
