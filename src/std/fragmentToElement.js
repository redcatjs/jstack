jstack.fragmentToElement = function(fragment){
	return document.createElement('div').appendChild(document.importNode(fragment.content, true)).innerHTML;
};