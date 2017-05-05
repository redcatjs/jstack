(function(){

let getViewReady = function(el){
	el = $(el);
	let ready = el.data('jViewReady');
	if(!ready){
		ready = $.Deferred();
		el.data('jViewReady',ready);
	}
	return ready;
};

jstack.load = function(target,config){
	
	const jsReady = $.Deferred();
	if(config.componentUrl){
		let componentUrl = jstack.config.controllersPath+config.componentUrl;
		let module = $js.module(componentUrl);
		if(module){
			jsReady.resolve( module );
		}
		else{
			$js( jstack.config.controllersPath+config.componentUrl, function(){
				let module = $js.module(componentUrl);
				jsReady.resolve( module );
			});
		}
	}
	else if (config.component){
		jsReady.resolve( config.component );
	}
	
	
	const ready = getViewReady(target);
	
	jsReady.then(function(componentClass){

		if(config.clear){
			$(config.clear).contents().not(target).remove();
		}
		
		let component = jstack.Component.factory(componentClass, target, {}, {
			route : config.route,
		});
		component.ready.then(function(){
			ready.resolve(target,component);
		});

	});

	return ready.promise();
};
jstack.viewReady = function(el){
	return getViewReady(el).promise();
};

})();
