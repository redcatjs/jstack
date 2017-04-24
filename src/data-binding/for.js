(function(){

const reg1 = new RegExp('(\\()(.*)(,)(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
const reg2 = new RegExp('(\\()(.*)(,)(.*)(\\))(\\s+)(in)(\\s+)(.*)',["i"]);
const reg3 = new RegExp('(.*)(\\s+)(in)(\\s+)(.*)',["i"]);
	
jstack.dataBindingElementCompiler.push({
	match(n){
		return n.hasAttribute('j-for');
	},
	callback(el,dataBinder,scope){
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

		
		let isTemplate = el.tagName.toLowerCase()=='template';
		
		
		let buildNewRow;
		
		$(el).detach();
		if(isTemplate){
			let content = el.content;
			buildNewRow = function(k, jforClose, scopeExtend){
				let addRow = document.createElement('div');
				addRow.appendChild( document.importNode(content, true) );
				
				jstack.copyAttributes(el,addRow);
				
				let contents = $(addRow).contents();
				
				jforClose.before(contents);
				
				contents.each(function(){
					dataBinder.compileDom( this, scopeExtend );
				});
				
				return addRow;
			};
			
		}
		else{
			buildNewRow = function(k, jforClose, scopeExtend){
				//let addRow = $(document.createElement('div'));
				let addRow = $this.clone();
				addRow.attr('j-for-id',k);
				
				jforClose.before(addRow);
				
				dataBinder.compileDom( addRow[0], scopeExtend );
				
				return addRow;
			};
			
		}
		
		let forStack = {};
		
		let render = function(){
			let data = jstack.dataBinder.getValueEval(jfor[0],myvar,scope);
			
			if(!data){
				forStack.each(function(n){
					n.el.remove();
				});
				return;
			}
			
			let method = data instanceof Array?'forEach':'each';
						
			//add
			let i = 1;
			data[method](function(v,k){
				let scopeExtend = $.extend({},dataBinder.model,scope);
				scopeExtend[value] = v;
				if(key){
					scopeExtend[key] = k;
				}
				if(index){
					scopeExtend[index] = i;
				}
				let row = forStack[k];
				if(typeof(row)==='undefined'){
					forStack[k] = {
						el:buildNewRow(k,jforClose,scopeExtend),
						scope:scopeExtend,
					};
				}
				else if(row.scope[value]!==v){
					row.el.remove(); //remove
					forStack[k] = {
						el:buildNewRow(k,jforClose,scopeExtend),
						scope:scopeExtend,
					};
				}
				else if(index){
					row.scope[index] = i;
				}
				i++;
			});

			//remove
			i = 0;
			forStack.each(function(row,k){
				if(typeof(data[k])==='undefined'){
					delete forStack[k];
					row.el.remove();
				}
				i++;
			});
			
		};
		
		dataBinder.addWatcher(jfor[0],render);
		render();
		
		return false;
		
	},
});

})();
