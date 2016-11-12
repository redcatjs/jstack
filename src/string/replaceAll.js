String.prototype.escapeRegExp = function() {
	//return this.replace( /([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1" );
	return this.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
};
String.prototype.replaceAllRegExp = function(find, replace){
  return this.replace( new RegExp( find, "g" ), replace );
};
String.prototype.replaceAll = function(find, replace){
	find = find.escapeRegExp();
	return this.replaceAllRegExp(find, replace);
};