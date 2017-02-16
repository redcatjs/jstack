$.xhrPool = [];
$.xhrPool.abortAll = function() {
	$(this).each(function(i, jqXHR){
		jqXHR.abort();
		$.xhrPool.splice(i, 1);
	});
}
$(document).ajaxStart(function(jqXHR){
	$.xhrPool.push(jqXHR);
});
$(document).ajaxComplete(function(jqXHR){
	var i = $.xhrPool.indexOf(jqXHR);
	if (i > -1) $.xhrPool.splice(i, 1);
});