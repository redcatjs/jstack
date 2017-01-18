$.fn.jExposeVar = function(onOrigin){
	var collection = [];
	this.each(function(){
		var el = onOrigin?this:$(this).clone().get(0);
		var $el = $(el);
		var all = $el.find(':data(j-var)');
		if($el.data('j-var')){
			all.add(el);
		}
		all.each(function(){
			var span = $(this);
			span.attr('j-var',span.data('j-var'));
			span.removeData('j-var');
		});
		collection.push(el);
	});
	return $(collection);
};
$.fn.jhtml = function(onOrigin){
	return this.jExposeVar(onOrigin).html();
};