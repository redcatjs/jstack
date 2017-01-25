$.fn.jml = function(){
	var comment = Node.COMMENT_NODE;
	var clone = this.clone(true);
	clone.findComments().each(function(){
		if(this.nodeValue.substr(0,2)=='j:'){
			var origin = $(this).dataComment('origin');
			if(origin){
				var endTag = '/'+this.nodeValue.split(' ')[0];
				var n = this.nextSibling;
				while(n && (n.nodeType!==comment || n.nodeValue!=endTag)){
					var next = n.nextSibling;
					n = next;
					$(n).remove();
				}
				$(this).replaceWith(origin);
			}
		}
	});
	return clone.html();
};