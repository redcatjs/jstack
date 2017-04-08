(function(){

let getController = function(p){
	let controller;
	
	while(p){
		if(p.hasAttribute&&p.hasAttribute('j-controller')){
			controller = p;
			break;
		}
		p = p.parentNode;
	}
	

	if(!controller){
		controller = document.body;
		controller.setAttribute('j-controller','')
		$(controller).data('jModel',{});
	}

	return controller;
};

$.fn.jModel = function(key,defaultValue){
	if(this.length<=1){
		var r = $(getController(this[0])).data('jModel');
		if(typeof(key)!='undefined'){
			return typeof(r[key])=='undefined'?defaultValue:r[key];
		}
		return r;
	}
	else{
		var data = [];
		this.each(function(){
			data.push($(this).jModel(key,defaultValue));
		});
		return data;
	}
};

})();
