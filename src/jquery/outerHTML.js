$.fn.outerHTML = function(){
	if (this.length){
		var div = $('<tmpl style="display:none;"></tmpl>');
		var clone = $(this[0].cloneNode(false)).html(this.html()).appendTo(div);
		var outer = div.html();
		div.remove();
		return outer;
	}
	else{
		return null;
	}
};