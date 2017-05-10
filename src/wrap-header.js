(function(factory){
	if(typeof module === "object" && typeof module.exports === "object"){
		module.exports = factory( require('jquery') );
	}
	else if( typeof define === "function" && define.amd ) {
		define(['jquery'],factory);
	}
	else{
		factory(jQuery);
	}
})(function($){
