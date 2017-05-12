var jstackDirectives = {};

jstack.directive = function(name, className){
	name = jstack.snakeCase(name);
	if(typeof(className)!=='undefined'){
		jstackDirectives[name] = className;
	}
	return jstackDirectives[name];
};

jstack.runDirective = function(el,name,options,config){
	name = jstack.snakeCase(name);
	let componentClass = jstackDirectives[name];
	config.noscope = true;
	return jstack.Component.factory(componentClass, el, options, config);
};
jstack.__directives = jstackDirectives;
