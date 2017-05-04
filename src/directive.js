(function(){

let directives = {};

jstack.directive = function(name, className){
	name = jstack.snakeCase(name);
	if(typeof(className)!=='undefined'){
		directives[name] = className;
	}
	return directives[name];
};

jstack.runDirective = function(el,name,options,config){
	name = jstack.snakeCase(name);
	let componentClass = directives[name];
	return jstack.Component.factory(componentClass, el, options, config);
};
jstack.__directives = directives;


})();
