jstack.template.directives = {};
jstack.template.directive = function( id, fn ) {
	if ( fn ) {
		jstack.template.directives[ id ] = fn;
	}
	return jstack.template.directives[ id ];
};
jstack.template.directiveCompileLoaded = function( el ) {
	el.find( "*" ).each( function() {
		var self = $( this );
		$.each( this.attributes, function() {
			var key = this.name;
			if ( key.substr( 0, 9 ) == "j-loaded-" ) {
				self.attr( key.substr( 9 ), this.value );
				self.removeAttr( key );
			}
		} );
	} );
	return el;
};
jstack.template.directiveCompile = function( el, templatesPath ) {
	var deferreds = [];
	$.each( jstack.template.directives, function( k, d ) {
		el.find( "[j-" + k + "]," + k + "[j]" ).each( function() {
			var ctag = this.tagName == k.toUpperCase();
			var self = $( this );
			var val = ctag ? self.attr( "j" ) : self.attr( "j-" + k );
			var deferred = d( val, self, templatesPath );
			if ( deferred ) {
				deferreds.push( deferred );
			}
			if ( ctag ) {
				self.removeAttr( "j" );
				if ( deferred ) {
					deferred.then( function() {
						self.replaceWith( self.html() );
					} );
				} else {
					self.replaceWith( self.html() );
				}
			} else {
				self.removeAttr( "j-" + k );
			}
		} );
	} );
	return deferreds;
};

jstack.template.jmlInject = function( el, jq, snippet ) {
	return el.each( function() {
		var $this = $( this );
		var uid = jstack.uniqid( "tmpl" );
		jstack.template.templateVarSubstitutions[ uid ] = snippet;
		$this[ jq ]( uid );
	} );
};