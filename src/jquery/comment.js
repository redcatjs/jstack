$.fn.findComments = function(){
	var arr = [];
	var nt = Node.COMMENT_NODE;
	this.each(function(){
		for(var i = 0; i < this.childNodes.length; i++) {
			var node = this.childNodes[i];
			if(node.nodeType === nt){
				arr.push(node);
			}
			else{
				arr.push.apply( arr, $.fn.findComments.call( $(node) ) );
			}
		}
	});
	return $(arr);
};

$.fn.findCommentsChildren = function(tag){
	var arr = [];
	var comment = Node.COMMENT_NODE;
	var tl = tag.length;
	this.each(function(){
		for(var i = 0; i < this.childNodes.length; i++) {
			var node = this.childNodes[i];
			if(node.nodeType === comment && node.nodeValue.substr(0,tl)==tag){
				arr.push.apply( arr, $(node).commentChildren() );
			}
			else{
				arr.push.apply( arr, $.fn.findCommentsChildren.call( $(node), tag ) );
			}
		}
	});
	return $(arr);
};

$.fn.commentChildren = function(){
	var arr = [];
	var comment = Node.COMMENT_NODE;
	this.each(function(){
		var endTag = '/'+this.nodeValue;
		var n = this.nextSibling;
		while(n && (n.nodeType!==comment || n.nodeValue!=endTag) ){
			arr.push(n);
			n = n.nextSibling;
		}
	});
	return $(arr);
};

$.fn.parentComment = function(tag){
	var comment = Node.COMMENT_NODE;
	var a = [];
	n = this[0].previousSibling;
	while(n){
		if(n.nodeType===comment&&n.nodeValue===tag){
			a.push(n);
			break;
		}
		n = n.previousSibling;
	}
	return $(a);
};