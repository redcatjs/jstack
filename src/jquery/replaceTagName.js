$.fn.replaceTagName = function(replaceWith) {
	var tags = [],
		i    = this.length;
	while (i--) {
		var newElement = document.createElement(replaceWith),
			thisi      = this[i],
			thisia     = thisi.attributes;
		for (var a = thisia.length - 1; a >= 0; a--) {
			var attrib = thisia[a];
			newElement.setAttribute(attrib.name, attrib.value);
		};
		newElement.innerHTML = thisi.innerHTML;
		$(thisi).replaceWith(newElement);
		tags[i] = newElement;
	}
	return $(tags);
};