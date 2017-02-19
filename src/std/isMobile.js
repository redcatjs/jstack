(function(){

var re = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
jstack.isMobile = function(userAgent){
	if(!userAgent) userAgent = navigator.userAgent;
	return re.test()
};

})();