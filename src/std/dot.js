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
			obj.each(function(o,k){
				r[k] = jstack.dotGet(o,x.slice(l).join('.'));
			});
			obj = r;
			break;
		}
		if(typeof(obj)=='object'&&obj!==null){
			obj = typeof(obj[i])!='undefined'?obj[i]:undefined;
		}
		else{
			obj = undefined;
		}
	}
	return obj;
};
jstack.dotSet = function(data,key,value,isDefault,setterCallback){
	if(typeof(data)!='object'||data===null){
		return;
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
		if(setterCallback){
			setterCallback(o,k,v);
		}
	};
	
	arr.reduce(function(obj,k,index,array){
		if(last==index){
			if(isDefault){
				if(typeof(obj[k])==='undefined'){
					setValue(obj,k,value);
				}
				value = obj[k];
			}
			else{
				setValue(obj,k,value);
			}
		}
		else{
			if(typeof(obj[k])!='object'||obj[k]===null){
				let defaultO = isArray&&index==beforeLast?[]:{};
				obj[k] = defaultO;
			}
			return obj[k];
		}
	}, data);
	return value;
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
