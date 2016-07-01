( function( w, j ) {

	j.templateVarSubstitutions = {};

	//Var separatorStart = '<%';
	//var separatorEnd = '%>';
	//var escapeRegExp = function(str) {
		//return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|\%]/g, "\\$&");
	//}
	//var separatorEndE = escapeRegExp(separatorEnd);
	//var separatorStartE = escapeRegExp(separatorStart);

	var separatorStart = "<%";
	var separatorEnd = "%>";
	var separatorStartE = "<\%";
	var separatorEndE = "\%>";

	var cache = {};
	var reg1 = eval( "/'(?=[^" + separatorEndE + "]*" + separatorEndE + ")/g" );
	var reg2 = eval( "/" + separatorStartE + "=(.+?)" + separatorEndE + "/g" );
	j.template = function( html, data, id, debug ) {
		var fn;
		if ( id && cache[ id ] ) {
			fn = cache[ id ];
		} else {
			var substitutions = j.templateVarSubstitutions;
			html = html.html();
			for ( var k in substitutions ) {
				if ( substitutions.hasOwnProperty( k ) ) {
					html = html.replace( k, separatorStart + substitutions[ k ] + separatorEnd );
				}
			}

			var compile = "var p=[];with(obj){p.push('" + html
				.replace( /[\r\t\n]/g, " " )
				.replace( reg1, "\t" )
				.split( "'" ).join( "\\'" )
				.split( "\t" ).join( "'" )
				.replace( reg2, "',$1,'" )
				.split( separatorStart ).join( "');" )
				.split( separatorEnd ).join( "p.push('" ) +
				"');}return p.join('');";
			try {
				fn = new Function( "obj", compile );
				if ( id ) cache[ id ] = fn;
			}
			catch ( e ) {
				if ( debug ) {
					console.log( e );
					console.log( compile );
					console.log( html );
				}
			}
		}
		return data ? fn( data ) : fn;
	};

} )( window, jstack );
