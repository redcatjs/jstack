(function(){

const reg1 = new RegExp('(\\()(.*)(,)(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
const reg2 = new RegExp('(\\()(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
const reg3 = new RegExp('(.*)(\\s+)(in)(\\s+)(.*)',["i"]);
	
jstack.dataBindingElementCompiler.for = {
	match(n){
		return n.hasAttribute('j-for');
	},
	callback(el,dataBinder){
		let $this = $(el);
		let jfor = $('<!--j:for-->');
		let jforClose = $('<!--/j:for-->');
		$this.replaceWith(jfor);
		jforClose.insertAfter(jfor);

		let attrFor = el.getAttribute('j-for');
		el.removeAttribute('j-for');
		attrFor = attrFor.trim();
		let index, key, value, myvar;

		let m = reg1.exec(attrFor);
		if (m != null){
			index = m[2].trim();
			key = m[4].trim();
			value = m[6];
			myvar = m[11].trim();
		}
		else{
			let m = reg2.exec(attrFor);
			if (m != null){
				key = m[2].trim();
				value = m[4];
				myvar = m[9].trim();
			}
			else{
				let m = reg3.exec(attrFor);
				if (m != null){
					value = m[1];
					myvar = m[5].trim();
				}
				else{
					throw new Error('Malformed for clause: '+attrFor);
				}
			}
		}

		let currentData;
		let getData = function(){
			return dataBinder.getValueEval(jfor[0],myvar);
		};

		//parentForList
		jfor.dataComment({
			value:value,
			key:key,
			index:index,
		});

		
		let isTemplate = el.tagName.toLowerCase()=='template';
		
		
		let buildNewRow;
		
		if(isTemplate){
			let content = el.content;
			buildNewRow = function(k, jforClose){
				let elements = document.importNode(content, true);
				let addRow = document.createElement('div');
				for(let i = 0, l = elements.length; i<l; i++){
					addRow.appendChild(elements[i]);
				}
				
				jforClose.before(addRow.childNodes);
				
				dataBinder.compileDom( addRow );
			};
			
		}
		else{
			buildNewRow = function(k, jforClose){
				//let addRow = $(document.createElement('div'));
				let addRow = $this.clone();
				addRow.attr('j-for-id',k);
				
				jforClose.before(addRow);
				
				dataBinder.compileDom( addRow[0] );
				
				return addRow;
			};
			
		}
		
		let render = function(){
			let data = getData();
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
				if(create){
					row.insertBefore(jforClose);
					
					//let addRow = buildNewRow(k);
					//addRow.insertBefore(jforClose);
					
					buildNewRow(k,jforClose);
					
					$('<!--/j:for:id-->').insertBefore(jforClose);
				}
				index++;
			});

			//remove
			$.each(domRows,function(k,row){
				row.commentChildren().remove();
				$(row[0].nextSibling).remove();
				row.remove();
			});
			
		};
		
		dataBinder.addWatcher(jfor[0],render);
		render();
		
		return false;
		
	},
};

})();
