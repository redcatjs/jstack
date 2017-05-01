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
			jsReady.resolve( jstack.controllers[config.componentUrl] );
		};
		if(jstack.controllers[config.componentUrl]){
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
	const templateReady = $.Deferred();
	
	jsReady.then(function(componentClass){
		let component = jstack.Component.factory(componentClass, target, config.hash);
		component.dependenciesReady.then(function(){
			if(config.clear){
				$(config.clear).contents().not(target).remove();
			}
			let domReady = component.render();
			domReady.then(function(){
				ready.resolve(target,component);
			});
		});

	});

	return ready.promise();
};
jstack.viewReady = function(el){
	return getViewReady(el).promise();
};

})();
