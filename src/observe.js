(function(){

let globalPrefix = '__JSTACK__OBSERVABLE__';

var observable = function(obj,options,rootObject){
	
	let namespace = options.namespace;
	let prefix = globalPrefix;
	if(namespace){
		prefix += namespace;
	}
	
	if(obj[prefix]){
		return obj;
	}
	
	let recursive = options.recursive;
	
	if(!rootObject){
		rootObject = obj;
	}
	
	
	callbackStack = [];
	if(recursive){
		$.each(obj,function(k,v){
			if(typeof(v)=='object'&&v!==null){
				obj[k] = observable( $.extend({},options,{object:v}) ,obj);
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
			if( !callbackDef.key || callbackDef.key === data.key ){
				callbackDef.callback(change);
			}
		}
	};
	
	let proxy = new Proxy(obj,{
		get: function (target, key) {
			if(key===prefix){
				//return callbackStack;
				return true;
			}
			return target[key];
		},
		set: function(target, key, value){
			if(recursive){
				if(typeof(value)=='object'&&value!==null){
					value = observable($.extend({},options,{object:value}), rootObject);
				}
			}
			let oldValue = target[key];
			target[key] = value;
			callback('set', {key:key, value:value, oldValue:oldValue}, target, rootObject);
			return true;
		},
		deleteProperty: function (target, key) {
			if (Array.isArray(target))
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
	
	Object.defineProperty(obj,'observe',{
		value: function(key,callback){
			if(typeof(key=='function')){
				callback = key;
				key = false;
			}
			if(!key||typeof(key)=='string'){
				key = [key];
			}
			for(let i=0, l=key.length; i<l; i++){
				callbackStack.push({
					key: key[i],
					callback: callback,
				});
			}
		},
		enumerable:false,
		configurable:true,
		writable:true,
	});
	
	Object.defineProperty(obj,'unobserve',{
		value: function(key,callback){
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
		},
		enumerable:false,
		configurable:true,
		writable:true,
	});
	
	
	/*
	Object.defineProperty(obj.prototype,'setModel',{
		value: function(k,v,callback){
			if(callback===false){
				obj[k] = v;
			}
			else if(typeof(callback)=='function'){
				proxy[k] = v;
				jstack.ready(function(){
					callback();
				});
			}
		},
		enumerable:false,
		configurable:true,
		writable:true,
	});
	*/
	
	return proxy;
};


jstack.observable = observable;

})();
