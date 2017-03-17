(function(){

let prefix = '__JSTACK__OBSERVABLE__';
jstack.observe = function(obj, callback, rootObject){
	if(obj[prefix]){
		return obj;
	}
	$.each(obj,function(k,v){
		if(typeof(v)=='object'&&v!==null){
			obj[k] = jstack.observe(v,callback,obj);
		}
	});
	let proxy = new Proxy(obj,{
		get: function (target, key, receiver) {
			if(key===prefix){
				return true;
			}
			return Reflect.get(target,key,receiver);
		},
		set: function(target, key, value, receiver){
			if(typeof(value)=='object'&&value!==null){
				value = jstack.observe(value,callback,obj);
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

})();
