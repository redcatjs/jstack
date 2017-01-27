jstack.walkTheDOM = function(node, func){
	if(func(node)===false){
		return;
	}
	var children = node.childNodes;
	for(var i = 0; i < children.length; i++){
		if(!children[i]) continue;
		this.walkTheDOM(children[i], func);
	}
};