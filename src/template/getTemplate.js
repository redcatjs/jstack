(function(){
	var templates = {};
	var requests = {};
	jstack.getTemplate = function( templatePath, absolute ) {
		if(!absolute){
			templatePath = jstack.config.templatesPath+templatePath;
		}
		if ( !requests[ templatePath ] ) {
			var url = templatePath;
			if ( jstack.config.debug ) {
				var ts = ( new Date().getTime() ).toString();
				if ( url.indexOf( "_t=" ) === -1 )
					url += ( url.indexOf( "?" ) < 0 ? "?" : "&" ) + "_t=" + ts;
			}
			requests[ templatePath ] = $.Deferred();
			$.ajax( {
				url:url,
				cache:true,
				success:function( html ) {
					templates[ templatePath ] = html;
					requests[ templatePath ].resolve( html, templatePath );
				}
			} );
		}
		return requests[ templatePath ].promise();
	};

})();