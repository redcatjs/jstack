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
		const resolveComponentUrl = function(){
			jsReady.resolve( jstack.components[config.componentUrl] );
		};
		if(jstack.components[config.componentUrl]){
			resolveComponentUrl();
		}
		else{
			$js( jstack.config.controllersPath+config.componentUrl, resolveComponentUrl);
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
