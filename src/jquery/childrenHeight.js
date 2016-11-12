$.fn.childrenHeight = function( outer, marginOuter, filterVisible ) {
	var topOffset = bottomOffset = 0;
	if ( typeof( outer ) == "undefined" ) outer = true;
	if ( typeof( marginOuter ) == "undefined" ) marginOuter = true;
	if ( typeof( filterVisible ) == "undefined" ) filterVisible = true;
	var children = this.children();
	if(filterVisible){
		children = children.filter(':visible');
	}
	children.each( function( i, e ) {
		var $e = $( e );
		var eTopOffset = $e.offset().top;
		var eBottomOffset = eTopOffset + ( outer ? $e.outerHeight(marginOuter) : $e.height() );
		
		if ( eTopOffset < topOffset )
			topOffset = eTopOffset;
		if ( eBottomOffset > bottomOffset )
			bottomOffset = eBottomOffset;
	} );
	return bottomOffset - topOffset - this.offset().top;
};