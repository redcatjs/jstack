$.on = function(event,selector,callback){
	return $(document).on(event,selector,callback);
};

$.off = function(event,selector,callback){
	return $(document).off(event,selector,callback);
};

$.one = function(event,selector,callback){
	return $(document).one(event,selector,callback);
};