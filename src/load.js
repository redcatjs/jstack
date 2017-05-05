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
	if(typeof(config.component)=='string'){
		let componentUrl = jstack.config.controllersPath+config.component+'.js';
		
		
		if($js.modules[componentUrl]){
			jsReady.resolve( $js.modules[componentUrl] );
		}
		else{
			$js( jstack.config.controllersPath+config.component, function(){
				jsReady.resolve( $js.modules[componentUrl] );
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
