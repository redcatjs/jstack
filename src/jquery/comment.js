$.fn.findComments = function(tag){
	var arr = [];
	var nt = Node.COMMENT_NODE;
	this.each(function(){
		for(var i = 0; i < this.childNodes.length; i++) {
			var node = this.childNodes[i];
			if(node.nodeType === nt && (!tag || node.nodeValue.split(' ')[0]==tag)){
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
	this.each(function(){
		for(var i = 0; i < this.childNodes.length; i++) {
			var node = this.childNodes[i];
			if(node.nodeType === comment && node.nodeValue.split(' ')[0]==tag){
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
		var endTag = '/'+this.nodeValue.split(' ')[0];
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
		if(n.nodeType===comment&&n.nodeValue.split(' ')[0]===tag){
			a.push(n);
			break;
		}
		n = n.previousSibling;
	}
	return $(a);
};

$.fn.dataComment = function(){
	if(arguments.length>1||$.type(arguments[0])=='object'){
		var setData;
		if(arguments.length>1){
			setData = {};
			setData[arguments[0]] =	arguments[1];
		}
		else{
			var setData = arguments[0];
		}
		return this.each(function(){
			var x = this.nodeValue.split(' ');
			var nodeName = x.shift();
			var data = x.length ? JSON.parse( x.join(' ') ) : {};
			$.extend(data,setData);
			this.nodeValue = nodeName+' '+JSON.stringify(data);
		});
	}
	var x = this[0].nodeValue.split(' ');
	x.shift();
	var data = x.length ? JSON.parse( x.join(' ') ) : {};
	if(arguments.length){
		data = data[arguments[0]];
	}
	return data;
};