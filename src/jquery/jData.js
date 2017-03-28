$.fn.jData = function(key){
	if(this.length>1){
		var a = [];
		this.each(function(){
			a.push( $.fn.jData.call( $(this), key ) );
		});
		return a;
	}
	else{
			
		var a = {};
		var el = this[0];
		let dataBinder = jstack.dataBinder.getControllerObject(el).dataBinder;
		$.each(this.attrStartsWith('j-data-'),function(k,v){
			var tokens = jstack.dataBinder.textTokenizer(v);
			var value;
			if(tokens===false){
				value = v;
			}
			else{
				value = dataBinder.compilerAttrRender(el,tokens);
			}
			a[k] = value;
		});
		var data = {};
		$.each(a,function(k,v){
			$.attrsToObject( k.substr(7), v, data );
		});
		
		if(key){
			data = jstack.dataBinder.dotGet(key,data);
		}
		
		return data;
	
	}
};
