(function(){


let walkTheDOM = function(node, func){
	if(func(node)===false){
		return false;
	}

	Object.values(node.childNodes).forEach(function(n){
		walkTheDOM(n, func);
	});
};

jstack.walkTheDOM = walkTheDOM;

})();
