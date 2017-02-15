jstack.fragmentToHTML = function(fragment){
	var div = document.createElement('div');
	div.appendChild( document.importNode(fragment.content, true) );
	return div.innerHTML;
};