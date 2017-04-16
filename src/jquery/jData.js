$.fn.jData = function(key){
	if(this.length>1){
		let a = [];
		this.each(function(){
			a.push( $.fn.jData.call( $(this), key ) );
		});
		return a;
	}
	else{
		let el = this[0];
		let data = {};
		this.attrStartsWith('j-data-').each(function(v,k){
			$.attrsToObject( k.substr(7), v, data );
		});
		if(key){
			data = jstack.dotGet(key,data);
		}
		return data;
	}
};
