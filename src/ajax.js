(function($,j){
	
	var toParams = function(params) {
		var pairs, proc;
		pairs = [];
		(proc = function(object, prefix) {
		var el, i, key, value, _results;
		if (object == null) object = params;
		if (prefix == null) prefix = null;
		_results = [];
		for (key in object) {
			if (!object.hasOwnProperty(key)) continue;
			value = object[key];
			if(value === null)
				value = '';
			if (value instanceof Array) {
			_results.push((function() {
				var _len, _results2;
				_results2 = [];
				for (i = 0, _len = value.length; i < _len; i++) {
				el = value[i];
				_results2.push(proc(el, prefix != null ? "" + prefix + "[" + encodeURIComponent(key) + "]["+i+"]" : "" + encodeURIComponent(key) + "["+i+"]"));
				}
				return _results2;
			})());
			} else if (value instanceof Object) {
			if (prefix != null) {
				prefix += "[" + key + "]";
			} else {
				prefix = key;
			}
			_results.push(proc(value, prefix));
			} else {
			_results.push(pairs.push(prefix != null ? "" + prefix + "[" + encodeURIComponent(key) + "]=" + encodeURIComponent(value) : "" + encodeURIComponent(key) + "=" + encodeURIComponent(value)));
			}
		}
		return _results;
		})();
		return pairs.join('&');
	};
	var toParamsPair = function(data){
		var pair = [];
		var params = toParams(data).split('&');
		for(var i=0;i<params.length;i++){
			var x = params[i].split('=');
			var val = x[1]!==null?decodeURIComponent(x[1]):'';
			pair.push([decodeURIComponent(x[0]), val]);
		}
		return pair;
	};
	
	var recurseExtractFiles = function(data,files,prefix,deepness){
		if(!prefix)
			prefix = '';
		for(var k in data){
			if(!data.hasOwnProperty(k)) continue;
			var key = prefix+k;
			var value = data[k];
			if(value instanceof FileList){
				if(value.length==1){
					files[key] = value[0];
				}
				else{
					files[key] = [];
					for(var i=0;i<value.length;i++){
						files[key].push(value[i]);
					}
				}
				delete(data[k]);
			}
			else if(value instanceof $){
				data[k] = value.jsonml();
			}
			else if(value instanceof HTMLCollection || value instanceof HTMLElement){
				data[k] = $(value).jsonml();
			}
			else if(typeof(value)=='object'){
				recurseExtractFiles(value,files,key+'_',deepness+1);
			}
		}
	};
	
	j.ajax = function(){
		var settings,files = {};
		if(arguments.length==2){
			settings = arguments[1]||{};
			settings.url = arguments[0];
		}
		else{
			settings = arguments[0];
		}
		
		if(settings.data){
			recurseExtractFiles(settings.data,files);
		}
		if(!$.isEmptyObject(files)){
			var haveFiles;
			var fd = new FormData();
			var params = toParamsPair(settings.data);
			for(var i=0;i<params.length;i++){
				fd.append(params[i][0], params[i][1]);
			}
			for(var k in files){
				if(files.hasOwnProperty(k)){
					var file = files[k];
					if(file instanceof Array){
						for(var i=0;i<file.length;i++){
							if(typeof(file[i])!='undefined'){
								fd.append(k+'[]',file[i]);
								haveFiles = true;
							}
						}
					}
					else{
						if(typeof(file)!='undefined'){
							fd.append(k,file);
							haveFiles = true;
						}
					}
				}
			}
			if(haveFiles){
				settings.type = "POST";
				settings.processData = false;
				settings.contentType = false;
				settings.data = fd;
			}
		}
		return $.ajax(settings);
	};
	
	j.post = function(url,data,success,dataType){
		return j.ajax({
			type: "POST",
			url: url,
			data: data,
			success: success,
			dataType: dataType
		});
	};
	
})(jQuery,jstack);