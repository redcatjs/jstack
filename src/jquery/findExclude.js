$.fn.findExclude = function (Selector, Mask, Parent) {
	var result = $([]);
	$(this).each(function (Idx, Elem) {
		$(Elem).find(Selector).each(function (Idx2, Elem2) {
			var el = $(Elem2);
			if(Parent)
				el = el.parent();
			var closest = el.closest(Mask);
			if (closest[0] == Elem || !closest.length) {
				result =  result.add(Elem2);
			}
		});
	});
	return result;
};