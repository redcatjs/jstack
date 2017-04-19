jstack.traverseDomBreak = {
	DESC:2,
	ASC:4,
	ADJ:8,
	BOTH:6,
	ALL:14,
};
jstack.traverseDom = function(node, func, asc, wholeRest){
	let result;
	if(!asc){
		result = func(node);
	}
	if(asc || ! (result&jstack.traverseDomBreak.DESC) ){
		let children = Object.values(node.childNodes);
		if(!wholeRest){
			wholeRest = children;
		}
		while(children.length){
			let adjResult = this.traverseDom(children.shift(), func, undefined, wholeRest);
			if(adjResult&jstack.traverseDomBreak.ASC){
				result = result|adjResult;
			}
			if(adjResult&jstack.traverseDomBreak.ADJ){
				break;
			}
		}
	}
	if(asc && !(result&jstack.traverseDomBreak.ASC) ){
		result = func(node, children, wholeRest);
	}
	return result;
};
