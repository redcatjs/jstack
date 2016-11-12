$.arrayCompare = function (a, b) {
	return $(a).not(b).get().length === 0 && $(b).not(a).get().length === 0;
};