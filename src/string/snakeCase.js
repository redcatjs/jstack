String.prototype.snakeCase = function() {
	return this.replace( /([A-Z])/g, function( $1 ) {return "_" + $1.toLowerCase();} );
};
String.prototype.snakeCaseDash = function() {
	return this.replace( /([A-Z])/g, function( $1 ) {return "-" + $1.toLowerCase();} );
};