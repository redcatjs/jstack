$.fn.findComments = function(tag){
	var arr = [];
	this.each(function(){
		for(var i = 0; i < this.childNodes.length; i++) {
			var node = this.childNodes[i];
			if(node.nodeType === Node.COMMENT_NODE && (!tag || node.nodeValue.split(' ')[0]==tag)){
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
	this.each(function(){
		for(var i = 0; i < this.childNodes.length; i++) {
			var node = this.childNodes[i];
			if(node.nodeType === Node.COMMENT_NODE && node.nodeValue.split(' ')[0]==tag){
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
	this.each(function(){
		var endTag = '/'+this.nodeValue.split(' ')[0];
		var n = this.nextSibling;
		while(n && (n.nodeType!==Node.COMMENT_NODE || n.nodeValue!=endTag) ){
			arr.push(n);
			n = n.nextSibling;
		}
	});
	return $(arr);
};

$.fn.parentComment = function(tag){
	var a = [];
	n = this[0].previousSibling;
	while(n){
		if(n.nodeType===Node.COMMENT_NODE&&n.nodeValue.split(' ')[0]===tag){
			a.push(n);
			break;
		}
		n = n.previousSibling;
	}
	return $(a);
};

$.fn.parentsComment = function(tag){
	var a = [];
	n = this[0].previousSibling;
	while(n){
		if(n.nodeType===Node.COMMENT_NODE&&n.nodeValue.split(' ')[0]===tag){
			a.push(n);
			n = n.parentNode;
		}
		if(n){
			n = n.previousSibling;
		}
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
			setData = arguments[0];
		}
		return this.each(function(){
			var data = $(this).dataComment();
			$.extend(data,setData);
		});
	}
	
	var el = this[0];

	if(!el.__jstackData){
		el.__jstackData = {};
	}
	let data = el.__jstackData;

	if(arguments.length){
		data = data[arguments[0]];
	}
	return data;
};
