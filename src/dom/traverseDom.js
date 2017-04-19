jstack.traverseDomBreak = {
	DESC:2,
	ASC:4,
	ADJ:8,
	BOTH:6,
	ALL:14,
};
jstack.traverseDom = function(node, func, asc){
	let result;
	if(!asc){
		result = func(node);
	}
	if(asc || ! (result&jstack.traverseDomBreak.DESC) ){
		let children = Object.values(node.childNodes);
		for(let i = 0; i < children.length; i++){
			let adjResult = this.traverseDom(children[i], func);
			if(adjResult&jstack.traverseDomBreak.ASC){
				result = result|adjResult;
			}
			if(adjResult&jstack.traverseDomBreak.ADJ){
				break;
			}
		}
	}
	if(asc && !(result&jstack.traverseDomBreak.ASC) ){
		result = func(node);
	}
	return result;
};
