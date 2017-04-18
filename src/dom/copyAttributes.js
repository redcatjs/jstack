jstack.copyAttributes = function(from,to){
	for(let i = 0, attrs = from.attributes, l = attrs.length; i < l; i++) {
		let attr = attrs[i];
		to.setAttribute(attr.name,attr.value);
	}
};
