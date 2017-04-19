(function(){


let walkTheDOM = function(node, func){
	if(func(node)===false){
		return false;
	}
	
	let children = [];
	let childNodes = node.childNodes;
	for(let i = 0, l = childNodes.length; i<l ;i++){
		children.push(childNodes[i]);
	}
	children.forEach(function(n){
		walkTheDOM(n, func);
	});
};

jstack.walkTheDOM = walkTheDOM;

})();
