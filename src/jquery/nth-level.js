(function(){

var findForks = {
	"nth-level": function( selector, param ) {
		param = parseInt( param, 10 );
		var a = [];
		var $this = this;
		this.each( function() {
			var level = param + $( this ).parents( selector ).length;
			$this.find( selector ).each( function() {
				if ( $( this ).parents( selector ).length == param - 1 ) {
					a.push( this );
				}
			} );
		} );
		return $( a );
	}
};

$.fn.findOrig = $.fn.find;
$.fn.find = function( selector ) {

	if ( typeof( selector ) == "string" ) {
		var fork, THIS = this;
		$.each( findForks, function( k, v ) {
			var i = selector.indexOf( ":" + k );
			if ( i !== -1 ) {
				var l = k.length;
				var selectorPart = selector.substr( 0, i );
				var param = selector.substr( i + l + 2, selector.length - i - l - 3 );
				fork = findForks[ k ].call( THIS, selectorPart, param );
				return false;
			}
		} );
		if ( fork ) return fork;
	}

	return this.findOrig( selector );
};

})();