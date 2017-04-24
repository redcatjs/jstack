(function(){


let walkTheDOM = function(node, func, nocache){
	if(func(node)===false){
		return false;
	}
	
	let children;
	let childNodes = node.childNodes;
	if(nocache){
		children = childNodes;
	}
	else{
		children = [];
		for(let i = 0, l = childNodes.length; i<l ;i++){
			children.push(childNodes[i]);
		}
	}
	
	children.forEach(function(n){
		walkTheDOM(n, func, nocache);
	});
};

jstack.walkTheDOM = walkTheDOM;

})();
