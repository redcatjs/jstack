( function() {
	let hasOwnProperty2 = function(o,k){
		let v = o[k];
		return v!==Object[k]&&v!==Object.__proto__[k]&&v!==Array[k]&&v!==Array.__proto__[k];
	};
	let toParamsPair = function( data ) {
		let pair = [];
		let params = $.param( data ).split( "&" );
		for ( let i = 0; i < params.length; i++ ) {
			let x = params[ i ].split( "=" );
			
			let val;
			if(x[ 1 ] === null){
				val = "";
			}
			else{
				val =  x[ 1 ];
				val =  val.replace(/\+/g, '%20');
				val =  decodeURIComponent( val );
			}
			let key = x[ 0 ];
			key =  key.replace(/\+/g, '%20');
			key =  decodeURIComponent( key );
			
			pair.push( [ key, val ] );
		}
		return pair;
	};


	let recurseFormat = function( o, files, prefix, deepness ) {
		if(!prefix){
			prefix = "";
		}
		if(o instanceof Array){ //cast array of value as object
			let obj = {};
			for( let i = 0; i < o.length; i++ ) {
				obj[i] = o[i];
			}
			return recurseFormat(obj, files, prefix, deepness);
		}
		else if(typeof(o)=='undefined'||o===null){ //cast null and undefined as string
			o = '';
		}
		else if(typeof(o)=='object'){
			let obj = {};
			Object.keys(o).forEach(function(k){
				let key = prefix + k;
				let value = o[k];
				if(value instanceof FileList){ //extract file
					if(value.length==1){
						files[key] = value[0];
					}
					else{
						files[key] = [];
						for(let i = 0; i < value.length; i++){
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
		let settings, files = {}, sendAsJSON, jsonKey;
		if ( arguments.length == 2 ) {
			settings = arguments[ 1 ] || {};
			settings.url = arguments[ 0 ];
		} else {
			settings = arguments[ 0 ];
		}
		
		if ( settings.data ) {
			settings.data = recurseFormat( settings.data, files );
		}
		
		if(typeof(settings.sendAsJSON)!=='undefined'){
			sendAsJSON = settings.sendAsJSON;
			delete settings.sendAsJSON;
		}
		if(sendAsJSON){
			if(typeof(settings.jsonKey)!=='undefined'){
				jsonKey = settings.jsonKey;
				delete settings.jsonKey;
			}
			if(!jsonKey){
				if(sendAsJSON!==true){
					jsonKey = sendAsJSON;
				}
				else if(!$.isEmptyObject( files )){
					jsonKey = 'json';
				}
			}
			
			let data = JSON.stringify(settings.data);
			if(jsonKey){
				settings.data = {};
				settings.data[jsonKey] = data;
			}
			else{
				settings.contentType = 'application/json; charset=UTF-8';
				settings.data = data;
			}
		}
		
		if ( !$.isEmptyObject( files ) ) {
			let haveFiles;
			let fd = new FormData();
			let params = toParamsPair( settings.data );
			for ( let i = 0; i < params.length; i++ ) {
				fd.append( params[ i ][ 0 ], params[ i ][ 1 ] );
			}
			for ( let k in files ) {
				if ( files.hasOwnProperty( k ) ) {
					let file = files[ k ];
					if ( file instanceof Array ) {
						for ( let i = 0; i < file.length; i++ ) {
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
		let xhr = jstack.ajax( {
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
