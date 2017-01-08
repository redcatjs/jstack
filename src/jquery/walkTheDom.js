$.walkTheDOM = function(node, func){
	func(node);
	node = node.firstChild;
	while(node){
		this.walkTheDOM(node, func);
		node = node.nextSibling;
	}
};
$.fn.walkTheDom = function(func){
	var r = $();
	this.each(function(){
		$.walkTheDOM(this,function(node){
			r.add(node);
			if(func){
				func.call(node);
			}
		});
	});
	return r;
};