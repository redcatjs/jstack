$.walkTheDOM = function(node, func){
	if(func(node)===false){
		return false;
	}
	node = node.firstChild;
	while(node){
		if(this.walkTheDOM(node, func)===false){
			return false;
		}
		node = node.nextSibling;
	}
};
$.fn.walkTheDOM = function(func){
	var r = $();
	this.each(function(){
		$.walkTheDOM(this,function(node){
			r.add(node);
			if(func){
				return func.call(node);
			}
		});
	});
	return r;
};