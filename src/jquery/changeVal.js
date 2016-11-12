$.fn.changeVal = function( v ) {
	return $( this ).val( v ).trigger( "change" );
};