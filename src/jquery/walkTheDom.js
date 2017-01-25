$.walkTheDOM = function(node, func, reverse){
	if(!reverse&&func(node)===false){
		return false;
	}
	var children = node.childNodes;
	for(var i = 0; i < children.length; i++){
		if(!children[i]) continue;
		if(this.walkTheDOM(children[i], func)===false){
			return false;
		}
	}
	if(reverse&&func(node)===false){
		return false;
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