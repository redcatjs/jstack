$.fn.loadJml = function(url,data){
	var self = this;
	return jstack.jml(url,data).then(function(content){
		self.append(content);
	});
};