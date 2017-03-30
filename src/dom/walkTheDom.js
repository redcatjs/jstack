(function(){

let walkTheDOM = function(node, func){
	if(func(node)===false){
		return;
	}
	let children = node.childNodes;
	for(let i = 0, l = children.length; i < l; i++){
		if(!children[i]) continue;
		walkTheDOM(children[i], func);
	}
};

/*
let staticWalkTheDOM = function(node, func){
	if(func(node)===false){
		return;
	}
	let children = node.childNodes;
	for(let i = 0; i < children.length; i++){
		if(!children[i]) continue;
		dynWalkTheDOM(children[i], func);
	}
};
*/

jstack.walkTheDOM = walkTheDOM;

})();
