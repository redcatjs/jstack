jstack.hasOwnProperty2 = function(o,k){
	var v = o[k];
	return v!==Object[k]&&v!==Object.__proto__[k]&&v!==Array[k]&&v!==Array.__proto__[k];
};