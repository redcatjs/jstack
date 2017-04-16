jstack.dotGet = function(data,key){
	if(typeof(data)!='object'||data===null){
		return;
	}
	return key.split('.').reduce(function(obj,i){
		if(typeof(obj)=='object'&&obj!==null){
			return typeof(obj[i])!='undefined'?obj[i]:undefined;
		}
		else{
			return undefined;
		}
	}, data);
};
jstack.dotSet = function(data,key,value,isDefault,setterCallback){
	if(typeof(data)!='object'||data===null){
		return;
	}
	key.split('.').reduce(function(obj,k,index,array){
		if(array.length==index+1){
			if(isDefault){
				if(typeof(obj[k])==='undefined'){
					if(setterCallback){
						setterCallback(obj,k,value);
					}
					else{
						obj[k] = value;
					}
				}
				else{
					value = obj[k];
				}
			}
			else{
				if(setterCallback){
					setterCallback(obj,k,value);
				}
				else{
					obj[k] = value;
				}
			}
		}
		else{
			if(typeof(obj[k])!='object'||obj[k]===null){
				if(setterCallback){
					setterCallback(obj,k,{});
				}
				else{
					obj[k] = {};
				}
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
