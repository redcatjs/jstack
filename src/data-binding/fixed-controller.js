jstack.dataBindingCompilers.fixedController = {
	level: 0,
	match(){
		return this.hasAttribute('j-fixed-controller');
	},
	callback(dataBinder){
		this.removeAttribute('j-fixed-controller');
		let controllerData = $(jstack.dataBinder.getController(this)).data();
		$(this).data({
			jController:controllerData.jController,
			jModel:controllerData.jModel,
		});
		this.setAttribute('j-controller','__fixed');
	}
};
