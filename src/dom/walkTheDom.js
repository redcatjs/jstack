(function(){


let walkTheDOM = function(node, func){
	if(func(node)===false){
		return;
	}
	//let children = $.extend({},node.childNodes);
	//for(let i = 0; i < children.length; i++){
		//if(!children[i]) continue;
		//walkTheDOM(children[i], func);
	//}
	let children = [];
	for(let i = 0; i < node.childNodes.length; i++){
		children.push(node.childNodes[i]);
	}
	while(children.length){
		walkTheDOM(children.shift(), func);
	}
};

/*
let staticWalkTheDOM = function(node, func){
	if(func(node)===false){
		return;
	}
	let children = node.childNodes;
	for(let i = 0, l = children.length; i < l; i++){
		if(!children[i]) continue;
		staticWalkTheDOM(children[i], func);
	}
};
*/

jstack.walkTheDOM = walkTheDOM;

})();
