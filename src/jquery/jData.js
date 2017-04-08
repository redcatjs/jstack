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
		
		let controller = $(jstack.dataBinder.getController(el)).data('jController');
		let dataBinder;
		if(controller){
			dataBinder = controller.dataBinder;
		}
		
		$.each(this.attrStartsWith('j-data-'),function(k,v){
			a[k] = v;
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
