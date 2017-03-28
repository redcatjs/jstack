jstack.dataBindingCompilers.for = {
	level: 1,
	match(){
		return this.hasAttribute('j-for');
	},
	callback(dataBinder){
		var el = this;
		var $this = $(this);
		var jfor = $('<!--j:for-->');
		var jforClose = $('<!--/j:for-->');
		$this.replaceWith(jfor);
		jforClose.insertAfter(jfor);

		var attrFor = el.getAttribute('j-for');
		el.removeAttribute('j-for');
		attrFor = attrFor.trim();
		var index, key, value, myvar;

		var p = new RegExp('(\\()(.*)(,)(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
		var m = p.exec(attrFor);
		if (m != null){
			index = m[2].trim();
			key = m[4].trim();
			value = m[6];
			myvar = m[11].trim();
		}
		else{
			var p = new RegExp('(\\()(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
			var m = p.exec(attrFor);
			if (m != null){
				key = m[2].trim();
				value = m[4];
				myvar = m[9].trim();
			}
			else{
				var p = new RegExp('(.*)(\\s+)(in)(\\s+)(.*)',["i"]);
				var m = p.exec(attrFor);
				if (m != null){
					value = m[1];
					myvar = m[5].trim();
				}
				else{
					throw new Error('Malformed for clause: '+attrFor);
				}
			}
		}

		var currentData;
		var getData = function(){
			return dataBinder.getValueEval(jfor[0],myvar);
		};

		//parentForList
		jfor.dataComment({
			value:value,
			key:key,
			index:index,
		});

		
		let isTemplate = el.tagName.toLowerCase()=='template';
		
		var content = this.content;

		var render = function(){
			if(!document.body.contains(jfor[0])) return jfor[0];

			var data = getData();
			if(currentData===data) return;
			currentData = data;
			
			if(!data){
				data = [];
			}
			
			let domRows = {};
			
			$.each(jfor.commentChildren(),function(k,v){
				if(v.nodeType===Node.COMMENT_NODE&&this.nodeValue.split(' ')[0] == 'j:for:id'){
					let row = $(v);
					let data = row.dataComment('j:for:row');
					if(data&&typeof(data.key)!=='undefined'){
						let key = data.key;
						domRows[key] = row;
					}
				}
			});
			
			//add
			let index = 1;
			$.each(data,function(k,v){
				let row = domRows[k];
				delete domRows[k];
				let create;
				if(!row){
					row = $('<!--j:for:id-->');
					create = true;
				}
				row.dataComment('j:for:row',{
					'value':v,
					'index':index,
					'key':k,
				});
				//console.log(row.dataComment());
				if(create){
					row.insertBefore(jforClose);
					
					let addRow;
					if(isTemplate){
						addRow = $(document.importNode(content, true));
					}
					else{
						addRow = $this.clone();
						addRow.attr('j-for-id',k);
					}
					addRow.insertBefore(jforClose);
					
					$('<!--/j:for:id-->').insertBefore(jforClose);
				}
				index++;
			});

			//remove
			$.each(domRows,function(k,row){
				row.commentChildren().remove();
				row.remove();
			});
			
		};

		return render;


	},
};
