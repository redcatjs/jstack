jstack.loadView = ( function() {
	return function( o ) {
		var html = $( "<tmpl>" + o.templateHtml + "</tmpl>" );
		if ( !html.find( "> *" ).length ) {
			html.wrapInner( "<div />" );
		}
		var controllers = html.find( "[j-controller]" );
		var processors = {};
		if ( !controllers.length ) {
			html.children( 0 ).attr( "j-controller", o.path || "" );
			controllers = html.find( "[j-controller]" );
		}
		var readyControllers = 0;
		var totalControllers = controllers.length;
		var renderCallbacksParams = [];

		if ( !o.defaultController ) {
			o.defaultController = function( controllerPath ) {
				jstack.controller( controllerPath, function() {
					this.jstack.render();
				} );
			};
		}

		controllers.each( function() {
			var self = $( this );
			var controllerPath = self.attr( "j-controller" );
			var controllerName = controllerPath.replace( "/", "." );
			//self.attr( "way-scope", controllerName );

			var cacheId = o.templatePath + "#" + controllerPath;

			var templatesPath = o.templatePath.split( "/" );
			templatesPath.pop();
			templatesPath = templatesPath.join( "/" );
			if ( templatesPath ) templatesPath += "/";

			var compileView = jstack.processTemplate( self, cacheId, templatesPath ).then( function( templateProcessor ) {
				processors[ controllerPath ] = function( data ) {
					var processedTemplate = templateProcessor( data );
					
					self.html( processedTemplate );
					
					var ui = {};
					
					self.data('data-model',data);
					
					var dotGet = function(key,data){
						return key.split('.').reduce(function(obj,i){return obj[i];}, data);
					};
					var dotSet = function(key,data,value){
						key.split('.').reduce(function(obj,i,index,array){ if(array.length==index+2) obj[i] = value; return obj[i];}, data);
					};
					var getKey = function(key){
						return key.replace( /\[(["']?)([^\1]+?)\1?\]/g, ".$2" ).replace( /^\./, "" );
					};
					var getScope = function(input){
						return $(input).parents('[data-j-model]')
							.map(function() {
								return $(this).attr('data-j-model');
							})
							.get()
							.reverse()
							.join('.')
						;
					};
					var getScoped = function(input){
						var scope = getScope(input);
						if(scope){
							scope += '.';
						}
						var name = $(input).attr('name');
						var key = getKey(name);
						scope += key;
						return scope;
					}
					self.on('input',':input[name]',function(){
						var name = $(this).attr('name');
						var value = $(this).val();
						var key = getScoped(this);
						dotSet(key,data,value);
						console.log(data);
					});
					self.find(':input[name]').each(function(){
						var key = getScoped(this);
						var value = dotGet(key,data);
						$(this).val(value);
					});
					
					
				};
			} );
			var controllerRendered = $.Deferred();
			var loadController = function() {
				var ctrl = jstack.controller( controllerPath );
				if ( !ctrl ){
					console.log( 'jstack controller "' + controllerPath + '" not found as expected (or parse error) in "' + o.controllersPath + controllerPath + '"' );
				}
				
				ctrl.jstack.render = function( data ) {
					if ( !data ) data = {};
					ctrl.jstack.data = data;
					var processedTemplate = processors[ controllerPath ]( ctrl.jstack.data );
					renderCallbacksParams.push( [ self, ctrl ] );
					controllerRendered.resolve();
					return data;
				};
				ctrl.jstack.element = self;
				return ctrl;
			};
			var controllerReady = $.Deferred();
			var viewReady = $.Deferred();
			$.when( controllerReady, viewReady ).then( function() {
				var ctrl = loadController();
				readyControllers++;
				if ( readyControllers == totalControllers ) {
					$.when( controllerRendered ).then( function() {
						$( "[j-view]" ).html( html.contents() );
						if ( o.renderCallback ) {
							$.each( renderCallbacksParams, function( i, params ) {
								o.renderCallback.apply( o, params );
							} );
						}
					} );
				}
				ctrl();
			} );
			compileView.then( function() {
				viewReady.resolve();
			} );
			$js.onExists( o.controllersPath + controllerPath,
				function() {
					controllerReady.resolve();
				},
				function() {
					o.defaultController( controllerPath );
					controllerReady.resolve();
				}
			);

		} );
	};
} )();