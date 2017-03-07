( function() {
	var hasOwnProperty2 = function(o,k){
		var v = o[k];
		return v!==Object[k]&&v!==Object.__proto__[k]&&v!==Array[k]&&v!==Array.__proto__[k];
	};
	var toParamsPair = function( data ) {
		var pair = [];
		var params = $.param( data ).split( "&" );
		for ( var i = 0; i < params.length; i++ ) {
			var x = params[ i ].split( "=" );
			var val = x[ 1 ] !== null ? decodeURIComponent( x[ 1 ] ) : "";
			pair.push( [ decodeURIComponent( x[ 0 ] ), val ] );
		}
		return pair;
	};


	var recurseFormat = function( o, files, prefix, deepness ) {
		if(!prefix){
			prefix = "";
		}
		if(o instanceof Array){ //cast array of value as object
			var obj = {};
			for( var i = 0; i < o.length; i++ ) {
				obj[i] = o[i];
			}
			return recurseFormat(obj, files, prefix, deepness);
		}
		else if(typeof(o)=='undefined'||o===null){ //cast null and undefined as string
			o = '';
		}
		else if(typeof(o)=='object'){
			var obj = {};
			Object.keys(o).forEach(function(k){
				var key = prefix + k;
				var value = o[k];
				if(value instanceof FileList){ //extract file
					if(value.length==1){
						files[key] = value[0];
					}
					else{
						files[key] = [];
						for(var i = 0; i < value.length; i++){
							files[ key ].push( value[ i ] );
						}
					}
				}
				else{
					obj[k] = recurseFormat(value, files, key + "_", deepness + 1);
				}
			});
			o = obj;
		}
		return o;
	};
	
	jstack.ajaxNamespace = undefined;
	
	jstack.ajax = function() {
		var settings, files = {};
		if ( arguments.length == 2 ) {
			settings = arguments[ 1 ] || {};
			settings.url = arguments[ 0 ];
		} else {
			settings = arguments[ 0 ];
		}
		
		if ( settings.data ) {
			settings.data = recurseFormat( settings.data, files );
		}
		if ( !$.isEmptyObject( files ) ) {
			var haveFiles;
			var fd = new FormData();
			var params = toParamsPair( settings.data );
			for ( var i = 0; i < params.length; i++ ) {
				fd.append( params[ i ][ 0 ], params[ i ][ 1 ] );
			}
			for ( var k in files ) {
				if ( files.hasOwnProperty( k ) ) {
					var file = files[ k ];
					if ( file instanceof Array ) {
						for ( var i = 0; i < file.length; i++ ) {
							if ( typeof( file[ i ] ) != "undefined" ) {
								fd.append( k + "[]", file[ i ] );
								haveFiles = true;
							}
						}
					} else {
						if ( typeof( file ) != "undefined" ) {
							fd.append( k, file );
							haveFiles = true;
						}
					}
				}
			}
			if ( haveFiles ) {
				settings.type = "POST";
				settings.processData = false;
				settings.contentType = false;
				settings.data = fd;
			}
		}
		return $.ajax( settings );
	};

	jstack.post = function( url, data, callback, dataType ) {
		var xhr = jstack.ajax( {
			type: "POST",
			url: url,
			data: data,
			dataType: dataType
		} );
		if(typeof(callback)=='function'){
			xhr.then(callback);
		}
		return xhr;
	};

} )();
