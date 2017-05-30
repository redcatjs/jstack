jstack.dot = function(){
	if(arguments.length<=2){
		return jstack.dotGet.apply(this,arguments);
	}
	else{
		return jstack.dotSet.apply(this,arguments);
	}
};
jstack.dotGet = function(data,key){
	if(typeof(data)!='object'||data===null){
		return;
	}
	let x = key.split('.');
	let l = 0;
	let r;
	let obj = data;
	while(x.length){
		let i = x.shift();
		l++;
		if(i===''){
			let r = {};
			let skey = x.join('.');
			obj.each(function(o,k){
				r[k] = jstack.dotGet(o,skey);
			});
			return r;
		}
		if(typeof(obj)=='object'&&obj!==null){
			if(typeof(obj[i])=='undefined'){
				obj = undefined;
				break;
			}
			obj = obj[i];
		}
		else{
			obj = undefined;
			break;
		}
	}
	return obj;
};
jstack.dotSet = function(data,key,value,callback){
	if(typeof(data)!='object'||data===null){
		return data;
	}
	let isArray;
	if(key.substr(-1)=='.'){
		isArray = true;
		if(key.substr(-2)=='..'){
			key = key.substr(0,key.length-2);
		}
	}
	
	let arr = key.split('.');
	let last = arr.length-1;
	let beforeLast = last-1;
	
	let setValue = function(o,k,v){
		if(o instanceof Array){
			if(k === ''){
				if(typeof v === 'undefined'){
					let i = o.indexOf(k);
					if(i!==-1){
						o.splice(i,1);
					}
				}
				else{
					o.push(v);
				}
			}
			else{
				if(typeof v === 'undefined'){
					o.splice(k,1);
				}
				else{
					o.splice(k,0,v);
				}
			}
		}
		else{
			if(typeof v === 'undefined'){
				delete o[k];
			}
			else{
				o[k] = v;
			}
		}
		if(callback){
			callback(o,k,v);
		}
	};
	
	let x = key.split('.');
	let l = 0;
	let r;
	let obj = data;
	let previousK;
	let previousO;
	while(x.length){
		let k = x.shift();
	
		if(k===''){
			let skey = x.join('.');
			if(typeof(value)!=='object'||value===null){
				value = [value];
			}
			let r = [];
			value.each(function(val){
				let o = {};
				jstack.dotSet(o, skey, val);
				r.push(o);
			});
			previousO[previousK] = r;
			if(callback){
				callback(previousO, previousK, r);
			}
			break;
		}
		if(last==l){	
			setValue(obj,k,value);
			break;
		}
		
		if(typeof(obj[k])!='object'||obj[k]===null){
			obj[k] = isArray&&l==beforeLast?[]:{};
		}
		
		previousO = obj;
		previousK = k;
		
		obj = obj[k];
		
		l++;
	}
	
	return data;
};
jstack.dotDel = function(data,key,value){
	if(typeof(data)!='object'||data===null){
		return;
	}
	key.split('.').reduce(function(obj,k,index,array){
		if(typeof(obj)!='object'){
			return;
		}
		if(array.length==index+1){
			if(typeof(obj[k])!='undefined'){
				delete obj[k];
			}
		}
		else{
			return obj[k];
		}
	}, data);
};
