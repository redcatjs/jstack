( function( w, j ) {

	j.directive( "if", function( val, el ) {
		el.jmlInject( "before", "if(" + val + "){" );
		el.jmlInject( "after", "}" );
	} );

	j.directive( "foreach", function( val, el ) {
		var sp;
		if ( val.indexOf( " as " ) !== -1 ) {
			sp = val.split( " as " );
			el.jmlInject( "before", "$.each(" + sp[ 0 ] + ", function(i," + sp[ 1 ] + "){" );
		} else {
			sp = val.split( " in " );
			el.jmlInject( "before", "$.each(" + sp[ 1 ] + ", function(" + sp[ 0 ] + "){" );
		}
		el.jmlInject( "after", "});" );
	} );

	j.directive( "href", function( val, el ) {
		href = j.route.baseLocation + "#" + val;
		el.attr( "href", href );
	} );

	j.directive( "src", function( val, el ) {
		el.attr( "j-loaded-src", val );
	} );

	j.directive( "model", function( val, el ) {
		el.attr( "way-data", val );
	} );

	j.directive( "include", function( val, el, templatesPath ) {
		var ext = val.split( "." ).pop();
		var include = templatesPath + val;
		if ( ext != "jml" ) {
			include += ".jml";
		}
		var deferred = $.Deferred();
		jstack.getTemplate( include ).then( function( html ) {
			var inc = $( "<tmpl>" + html + "</tmpl>" );
			$.when.apply( $, jstack.directiveCompile( inc, templatesPath ) ).then( function() {
				el.html( inc.contents() );
				deferred.resolve();
			} );
		} );
		return deferred;
	} );

	j.directive( "extend", function( val, el, templatesPath ) {
		var extend = templatesPath + val;
		var ext = val.split( "." ).pop();
		if ( ext != "jml" && ext != "xjml" ) {
			extend += ".xjml";
		}
		var deferred = $.Deferred();
		jstack.getTemplate( extend ).then( function( html ) {
			var inc = $( "<tmpl>" + html + "</tmpl>" );
			$.when.apply( $, jstack.directiveCompile( inc, templatesPath ) ).then( function() {
				el.find( ">*" ).each( function() {
					var $this = $( this );
					var selector = $this.attr( "selector" );
					if ( !selector ) selector = $this.attr( "j" );
					var method = this.tagName.toLowerCase();
					var contents = $this.contents();
					var target = inc.find( selector );
					if ( contents.length ) {
						target[ method ]( $this.contents() );
					} else {
						target[ method ]();
					}
				} );
				el.replaceWith( inc );
				deferred.resolve();
			} );
		} );
		return deferred;
	} );

	j.directive( "open", function( val, el ) {
		el.jmlInject( "prepend", val );
		var jclose = el.attr( "j-close" );
		if ( jclose ) {
			el.jmlInject( "append", jclose );
			el.removeAttr( "j-close" );
		}
	} );
	j.directive( "close", function( val, el ) {
		var jopen = el.attr( "j-open" );
		if ( jopen ) {
			el.jmlInject( "prepend", jopen );
			el.removeAttr( "j-open" );
		}
		el.jmlInject( "append", val );
	} );
	j.directive( "before", function( val, el ) {
		var jafter = el.attr( "j-after" );
		if ( jafter ) {
			el.jmlInject( "after", jafter );
			el.removeAttr( "j-after" );
		}
		el.jmlInject( "before", val );
	} );
	j.directive( "after", function( val, el ) {
		var jbefore = el.attr( "j-before" );
		if ( jbefore ) {
			el.jmlInject( "before", jbefore );
			el.removeAttr( "j-before" );
		}
		el.jmlInject( "after", val );
	} );

} )( window, jstack );
