jstack.camelCase = function(str){
	return str.replace(/([A-Z])/g, function($1){ return "-" + $1.toLowerCase(); });
};
jstack.snakeCase = function(str){
	return str.replace( /([A-Z])/g, function( $1 ) {return "-" + $1.toLowerCase();} );
};
