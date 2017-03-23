(function(){


function trim ( str, charlist ) {
  //  discuss at: http://locutusjs.io/php/trim/
  // original by: Kevin van Zonneveld (http://kvz.io)
  // improved by: mdsjack (http://www.mdsjack.bo.it)
  // improved by: Alexander Ermolaev (http://snippets.dzone.com/user/AlexanderErmolaev)
  // improved by: Kevin van Zonneveld (http://kvz.io)
  // improved by: Steven Levithan (http://blog.stevenlevithan.com)
  // improved by: Jack
  //    input by: Erkekjetter
  //    input by: DxGx
  // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
  //   example 1: trim('    Kevin van Zonneveld    ')
  //   returns 1: 'Kevin van Zonneveld'
  //   example 2: trim('Hello World', 'Hdle')
  //   returns 2: 'o Wor'
  //   example 3: trim(16, 1)
  //   returns 3: '6'

  var whitespace = [
    " ",
    "\n",
    "\r",
    "\t",
    "\f",
    "\x0b",
    "\xa0",
    "\u2000",
    "\u2001",
    "\u2002",
    "\u2003",
    "\u2004",
    "\u2005",
    "\u2006",
    "\u2007",
    "\u2008",
    "\u2009",
    "\u200a",
    "\u200b",
    "\u2028",
    "\u2029",
    "\u3000"
  ].join( "" );
  var l = 0;
  var i = 0;
  str += "";

  if ( charlist ) {
    whitespace = ( charlist + "" ).replace( /([\[\]\(\)\.\?\/\*\{\}\+\$\^:])/g, "$1" );
  }

  l = str.length;
  for ( i = 0; i < l; i++ ) {
    if ( whitespace.indexOf( str.charAt( i ) ) === -1 ) {
      str = str.substring( i );
      break;
    }
  }

  l = str.length;
  for ( i = l - 1; i >= 0; i-- ) {
    if ( whitespace.indexOf( str.charAt( i ) ) === -1 ) {
      str = str.substring( 0, i + 1 );
      break;
    }
  }

  return whitespace.indexOf( str.charAt( 0 ) ) === -1 ? str : "";
}


function ltrim ( str, charlist ) {
  //  discuss at: http://locutusjs.io/php/ltrim/
  // original by: Kevin van Zonneveld (http://kvz.io)
  //    input by: Erkekjetter
  // improved by: Kevin van Zonneveld (http://kvz.io)
  // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
  //   example 1: ltrim('    Kevin van Zonneveld    ')
  //   returns 1: 'Kevin van Zonneveld    '

  charlist = !charlist ? " \\s\u00A0" : ( charlist + "" )
    .replace( /([\[\]\(\)\.\?\/\*\{\}\+\$\^:])/g, "$1" );

  var re = new RegExp( "^[" + charlist + "]+", "g" );

  return ( str + "" )
    .replace( re, "" );
}

function rtrim ( str, charlist ) {
  //  discuss at: http://locutusjs.io/php/rtrim/
  // original by: Kevin van Zonneveld (http://kvz.io)
  //    input by: Erkekjetter
  //    input by: rem
  // improved by: Kevin van Zonneveld (http://kvz.io)
  // bugfixed by: Onno Marsman (https://twitter.com/onnomarsman)
  // bugfixed by: Brett Zamir (http://brett-zamir.me)
  //   example 1: rtrim('    Kevin van Zonneveld    ')
  //   returns 1: '    Kevin van Zonneveld'

  charlist = !charlist ? " \\s\u00A0" : ( charlist + "" )
    .replace( /([\[\]\(\)\.\?\/\*\{\}\+\$\^:])/g, "\\$1" );

  var re = new RegExp( "[" + charlist + "]+$", "g" );

  return ( str + "" ).replace( re, "" );
}


Object.defineProperty(String.prototype, 'trim', {
	value: function( charlist ) {
		return trim( this, charlist );
	},
	enumerable:false,
});
Object.defineProperty(String.prototype, 'ltrim', {
	value: function( charlist ) {
		return ltrim( this, charlist );
	},
	enumerable: false
});
Object.defineProperty(String.prototype, 'rtrim', {
	value: function( charlist ) {
		return rtrim( this, charlist );
	},
	enumerable: false
});

Object.defineProperty(String.prototype, 'escapeRegExp', {
	value: function() {
		//return this.replace( /([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1" );
		return this.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	},
	enumerable: false
});
Object.defineProperty(String.prototype, 'replaceAllRegExp', {
	value: function(find, replace){
		return this.replace( new RegExp( find, "g" ), replace );
	},
	enumerable: false
});
Object.defineProperty(String.prototype, 'replaceAll', {
	value: function(find, replace){
	find = find.escapeRegExp();
		return this.replaceAllRegExp(find, replace);
	},
	enumerable: false
});

Object.defineProperty(String.prototype, 'lcfirst', {
	value: function() {
		return this.charAt( 0 ).toLowerCase() + this.substr( 1 );
	},
	enumerable: false
});

Object.defineProperty(String.prototype, 'camelCase', {
	value: function() {
		return this.replace( /(\_[a-z])/g, function( $1 ) {return $1.toUpperCase().replace( "_", "" );} );
	},
	enumerable: false
});
Object.defineProperty(String.prototype, 'camelCaseDash', {
	value: function() {
		return this.replace( /(\-[a-z])/g, function( $1 ) {return $1.toUpperCase().replace( "-", "" );} );
	},
	enumerable: false
});


Object.defineProperty(String.prototype, 'snakeCase', {
	value: function() {
		return this.replace( /([A-Z])/g, function( $1 ) {return "_" + $1.toLowerCase();} );
	},
	enumerable: false
});
Object.defineProperty(String.prototype, 'snakeCaseDash', {
	value: function() {
		return this.replace( /([A-Z])/g, function( $1 ) {return "-" + $1.toLowerCase();} );
	},
	enumerable: false
});

Object.defineProperty(String.prototype, 'ucfirst',{
   value: function(){
	   return this.charAt( 0 ).toUpperCase() + this.substr( 1 );
   },
   enumerable: false
});

Object.defineProperty(String.prototype, 'lcfirst', {
	value: function() {
		return this.charAt( 0 ).toLowerCase() + this.substr( 1 );
	},
	enumerable: false
});


})();
