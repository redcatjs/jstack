$.xhrPool = [];
$.xhrPool.abortAll = function(namespace){
	$(this).each(function(i, jqXHR){
		if(namespace===true||namespace==jqXHR.jstackNS){
			jqXHR.abort();
			$.xhrPool.splice(i, 1);
		}
	});
};
$(document).ajaxStart(function(jqXHR){
	$.xhrPool.push(jqXHR);
});
$(document).ajaxComplete(function(jqXHR){
	var i = $.xhrPool.indexOf(jqXHR);
	if (i > -1) $.xhrPool.splice(i, 1);
});
$.ajaxPrefilter(function(options, originalOptions, jqXHR){
	jqXHR.jstackNS = options.namespace || jstack.ajaxNamespace;
});