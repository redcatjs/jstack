(function(){
	let templates = {};
	let requests = {};
	let registerTemplate = function(id, html){
		templates[id] = html;
	};
	let getTemplate = function( templatePath, absolute ) {
		if(!absolute){
			templatePath = jstack.config.templatesPath+templatePath;
		}
		if(templates[ templatePath ]){
			if ( !requests[ templatePath ] ) {
				requests[ templatePath ] = $.Deferred().resolve(templates[ templatePath ]);
			}
		}
		else if ( !requests[ templatePath ] ) {
			var url = templatePath;
			if ( jstack.config.debug ) {
				var ts = ( new Date().getTime() ).toString();
				if ( url.indexOf( "_t=" ) === -1 )
					url += ( url.indexOf( "?" ) < 0 ? "?" : "&" ) + "_t=" + ts;
			}
			requests[ templatePath ] = $.Deferred();
			$.ajax({
				url:url,
				cache:true,
			}).then(function(html){
				registerTemplate(templatePath, html);
				requests[ templatePath ].resolve( html, templatePath );				
			});
		}
		return requests[ templatePath ].promise();
	};
	jstack.templates = templates;
	jstack.registerTemplate = registerTemplate;
	jstack.getTemplate = getTemplate;
})();
