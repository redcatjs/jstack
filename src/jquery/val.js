$.fn.setVal = $.fn.val;
$.fn.val = function() {
	var returnValue = $.fn.setVal.apply( this, arguments );
	if ( arguments.length ) {
		this.trigger( "val" );
	}
	return returnValue;
};