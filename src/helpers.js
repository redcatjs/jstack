jstack.replaceAllRegExp = function( str, find, replace ) {
  return str.replace( new RegExp( find, "g" ), replace );
};
jstack.escapeRegExp = function( find ) {
	return find.replace( /([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1" );
};
jstack.replaceAll = function( str, find, replace ) {
	find = jstack.escapeRegExp( find );
	return jstack.replaceAllRegExp( str, find, replace );
};
jstack.camelCaseDataToObject = function( k, v, r ) {
	var s = k.replace( /([A-Z])/g, " $1" ).toLowerCase().split( " " );
	if ( typeof( r ) == "undefined" ) r = {};
	var ref = r;
	var l = s.length - 1;
	$.each( s, function( i, key ) {
		if ( i == l ) {
			ref[ key ] = v;
		} else {
			if ( !ref[ key ] ) ref[ key ] = {};
			ref = ref[ key ];
		}
	} );
	return r;
};
