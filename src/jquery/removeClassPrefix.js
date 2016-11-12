$.fn.removeClassPrefix = function(prefix) {
	this.each(function(i, el) {
		var classes = el.className.split(" ").filter(function(c) {
			return c.lastIndexOf(prefix, 0) !== 0;
		});
		el.className = $.trim(classes.join(" "));
	});
	return this;
};