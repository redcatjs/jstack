(function(){

class modelObserver{
	constructor(o,dataBinder){
		this.o = o;
		this.dataBinder = dataBinder;
		this.keysObservers = {};
		this.observers = [];
	}
	
	modelTrigger(change){
		for(let i=0, l=this.observers.length;i<l;i++){
			this.observers[i](change);
		}
		let observers = this.keysObservers[change.key];
		if(observers){
			for(let i=0, l=observers.length;i<l;i++){
				observers[i](change);
			}
		}
	}
	addObserver(callback,key){
		let observers
		if(typeof(key)=='undefined'||key===false){
			observers = this.observers;
		}
		else{
			if(!this.keysObservers[key]){
				this.keysObservers[key] = [];
			}	
			observers = this.keysObservers[key];
		}
		observers.push(callback);
	}
	removeObserver(callback,key){
		let observers
		if(typeof(key)=='undefined'||key===false){
			observers = this.observers;
		}
		else{
			observers = this.keysObservers[key];
		}
		if(observers){
			for(let i=0, l=observers.length;i<l;i++){
				if(callback===observers[i]){
					observers.splice(i,1);
				}
			}
		}
	}
	
	modelObserve(){
		let args = Array.prototype.slice.call(arguments);
		let callback;
		if(args.length&&typeof(args[args.length-1])=='function'){
			callback = args.pop();
		}
		if(args.length){
			for(let i = 0, l = args.length;i<l;i++){
				let arg = args[i];
				if(arg instanceof Array){
					for(let i2 = 0, l2 = arg.length;i2<l2;i2++){
						this.addObserver(callback,arg[i2]);
					}
				}
				else{
					this.addObserver(callback,arg);
				}
			}
		}
		else{
			this.addObserver(callback);
		}
	}
	modelUnobserve(){
		let args = Array.prototype.slice.call(arguments);
		let callback;
		if(args.length&&typeof(args[args.length-1])=='function'){
			callback = args.pop();
		}
		if(args.length){
			for(let i = 0, l = args.length;i<l;i++){
				let arg = args[i];
				if(arg instanceof Array){
					for(let i2 = 0, l2 = arg.length;i2<l2;i2++){
						this.removeObserver(callback,arg[i2]);
					}
				}
				else{
					this.removeObserver(callback,arg);
				}
			}
		}
		else{
			this.removeObserver(callback);
		}
	}
	
	modelSet(key,value,callback){
		this.o[key] = value;
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	modelDelete(key,callback){
		delete this.o[key];
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	
	modelPush(){
		let args = Array.prototype.slice.call(arguments);
		let callback;
		if(args.length&&typeof(args[args.length-1])=='function'){
			callback = args.pop();
		}
		Array.prototype.push.apply(this.o,args);
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	modelUnshift(){
		let args = Array.prototype.slice.call(arguments);
		let callback;
		if(args.length&&typeof(args[args.length-1])=='function'){
			callback = args.pop();
		}
		Array.prototype.unshift.apply(this.o,args);
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	modelSplice(){
		let args = Array.prototype.slice.call(arguments);
		let callback;
		if(args.length&&typeof(args[args.length-1])=='function'){
			callback = args.pop();
		}
		Array.prototype.splice.apply(this.o,args);
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	modelShift(callback){
		this.o.shift();
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
	modelPop(callback){
		this.o.pop();
		if(callback){
			this.dataBinder.ready(callback);
		}
	}
}

let modelObservable = function(obj,dataBinder){

	//modelObserve
	//modelSet
	//modelPush
	//modelUnshift
	//modelShift
	//modelPop
	//modelSplice
	//modelDelete
	
	if(obj.modelObserve){
		return obj;
	}
	
	let modelObserverObject = new modelObserver(obj,dataBinder);
	
	Object.defineProperty(obj, 'modelObserve', {
		value: function(){
			return modelObserverObject.modelObserve.apply(modelObserverObject,arguments);
		},
		enumerable: false
	});
	Object.defineProperty(obj, 'modelTrigger', {
		value: function(){
			return modelObserverObject.modelTrigger.apply(modelObserverObject,arguments);
		},
		enumerable: false
	});
	Object.defineProperty(obj, 'modelSet', {
		value: function(){
			return modelObserverObject.modelSet.apply(modelObserverObject,arguments);
		},
		enumerable: false
	});
	Object.defineProperty(obj, 'modelDelete', {
		value: function(){
			return modelObserverObject.modelSet.apply(modelObserverObject,arguments);
		},
		enumerable: false
	});

	if(Array.isArray(obj)){
		Object.defineProperty(obj, 'modelPush', {
			value: function(){
				return modelObserverObject.modelPush.apply(modelObserverObject,arguments);
			},
			enumerable: false
		});
		Object.defineProperty(obj, 'modelUnshift', {
			value: function(){
				return modelObserverObject.modelUnshift.apply(modelObserverObject,arguments);
			},
			enumerable: false
		});
		Object.defineProperty(obj, 'modelPop', {
			value: function(){
				return modelObserverObject.modelPop.apply(modelObserverObject,arguments);
			},
			enumerable: false
		});
		Object.defineProperty(obj, 'modelShift', {
			value: function(){
				return modelObserverObject.modelShift.apply(modelObserverObject,arguments);
			},
			enumerable: false
		});
		Object.defineProperty(obj, 'modelSplice', {
			value: function(){
				return modelObserverObject.modelSplice.apply(modelObserverObject,arguments);
			},
			enumerable: false
		});
	}
	
	obj.each(function(v,k){
		if(typeof(v)=='object'&&v!==null){
			obj[k] = modelObservable( v, dataBinder );
		}
	});
	
	let proxy = new Proxy(obj,{
		set: function(target, key, value){
			if(typeof(value)=='object'&&value!==null){
				value = modelObservable(value, dataBinder);
			}
			target[key] = value;
			return true;
		}
	});
	
	return proxy;
};

jstack.modelObservable = modelObservable;

})();
