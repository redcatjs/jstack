$.walkTheDOM = function(node, func){
	func(node);
	node = node.firstChild;
	while(node){
		if(this.walkTheDOM(node, func)===false){
			break;
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