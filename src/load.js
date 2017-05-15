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

jstack.componentRegistry = {};

jstack.load = function(target,config,options){
	
	if(typeof(config)=='string'){
		config = {
			component: config,
		};
	}
	
	const jsReady = $.Deferred();
	if(typeof(config.component)=='string'){
		let componentPath = config.component;
		let componentUrl = jstack.config.controllersPath+componentPath;
		if(jstack.componentRegistry[componentPath]){
			jsReady.resolve( jstack.componentRegistry[componentPath] );
		}
		else if(typeof requirejs == 'function'){
			requirejs( [ componentUrl ], function( module ){
				jsReady.resolve( module );
			});
		}
		else{
			$.getScript( componentUrl+'.js', function(){
				if(jstack.componentRegistry[componentPath]){
					jsReady.resolve( jstack.componentRegistry[componentPath] );
				}
				else{
					throw new Error('missing component '+componentPath);
				}
			});
		}
	}
	else{
		jsReady.resolve( config.component );
	}
	
	
	const ready = getViewReady(target);
	
	jsReady.then(function(componentClass){

		if(config.clear){
			$(config.clear).contents().not(target).remove();
		}
		
		let component = jstack.Component.factory(componentClass, target, (options || {}), {
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
