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
					
					//self.data('data-model',data);
					
					var dotGet = function(key,data){
						return key.split('.').reduce(function(obj,i){return obj[i];}, data);
					};
					var dotSet = function(key,data,value){
						key.split('.').reduce(function(obj,i,array,index){ if(array.length==index+1) obj[i] = value; return obj[i];}, data);
					};
					
					self.find('form').each(function(){
						var form = $(this);
						self.find(':input[name]').each(function(){
							var input = $(this);
							var scope = input.parents('[data-j-model]')
								.map(function() {
									return $(this).attr('data-j-model');
								})
								.get()
								.reverse()
								.join('.')
							;
							if(scope){
								scope += '.';
							}
							
							var name = input.attr('name');
							ui['[name="'+name+'"]'] = { bind: scope+name };
							ui['[name="'+name+'"]'] = {
							  bind: function (data, value, $control) {
								  console.log(value);
								if(value===null){
									var val = dotGet(scope+name, data);
									value = val;
								}
								else{
									dotSet(scope+name, data, value);
								}
								//console.log(data);
								
								$control.val(value);
								return value;
							  }
	
							};
							
						});
						
						//console.log(JSON.stringify(ui));
						//console.log(JSON.stringify(data));
						form.my({
							ui: ui,
						},data);
						//console.log(JSON.stringify(data));
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