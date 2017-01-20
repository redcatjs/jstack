$.walkTheDOM = function(node, func){
	if(func(node)===false){
		return false;
	}
	
	var children = node.childNodes;
	for(var i = 0, l = children.length; i < l; i++){
		if(this.walkTheDOM(children[i], func)===false){
			return false;
		}
	}
	
	/*
	node = node.firstChild;
	while(node){
		if(this.walkTheDOM(node, func)===false){
			return false;
		}
		node = node.nextSibling;
	}
	*/
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