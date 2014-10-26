/*
	描述: 1  一个自己实现的js模块加载程序, 虽然有seajs, rjs , nodejs等指明品牌 . 用的感觉不舒服
		  所以打算自己实现一个.
		  2  我不是很喜欢 seajs,rjs 等中的要求带入参数的写法, 希望定义模块可以尽可能的自由随性.
		  3  在依赖判断上面使用了有别于seajs的判断方式, 通过“exception-catch-rerun”的方式实现对
		  	 依赖的加载和执行
		  4  现阶段兼容性和稳定性还没有加以考虑, 但我会持续改进

		  5	 当然在js文件路径判断上面也存在非常大的bug (现价段压根就没有做路径处理).

		  6	 在事件依赖上面,目前的处理也很糟糕(为了尽快写出马虎处理了), 在方面的测试会在 sf-event.js
		  	 中学习尝试.
*/
(function(){
		var $_tos= Object.prototype.toString ;
		var $x = window.$x = {
				isFunc:function(obj){
					return $_tos.call(obj) === "[object Function]";
				},
				isArray:function(obj){
					return $_tos.call(obj) === "[object Array]";
				},
				isObj:function(obj){
					return $_tos.call(obj) === "[object Object]";
				},
				isStr:function(obj){
					return $_tos.call(obj) === "[object String]";
				},			
				get:function(src){ 
							var meta = module_meta(src);							
							
							if(!$x.CACHE[meta.id]){ 
								$x.CACHE[meta.id] = new Module(meta.id,meta.src);
							} 
							return $x.CACHE[meta.id];
				},
				libId:function(src){
						var _jsIndex = src.indexOf(".js");
						if(_jsIndex !=-1){
							return src.substring(0,_jsIndex);
						}
						return src;
				},



				CACHE: {},
				root : "" 			
		}; 


		/*事件Event 对象 */

		function Entity(func,num){
		this.func = func;
		this.num =  (num === undefined) ? -1 : num ;
		this.time = new Date();
		this.isExpired= function(){
			return this.num == 0;
		}
		this.exec =function(){
			if(!this.isExpired()){
				func.call();
				if(this.num > 0){
					this.num -= 1;
				}
			}
		}
	}


	function Event(){
	
		this.eventSource={};
	}
	Event.prototype ={
		on:function(key,func,num){
			
			if(!$x.isFunc(func)) { throw "func not a  function" ;}
			var ls = this.eventSource[key] || (this.eventSource[key]=[]);
				ls.push(new Entity(func,num));
		},
		fire:function(key){
			console.log(this.eventSource)
			var ls = this.eventSource[key] || [];
			
			for(var i = 0 ; i<ls.length; i++ ){
				//console.log(ls[i]);
				 var entity = ls[i];
					 entity.exec();
			} 
			this.flush(key);
			
		},
		one:function(key,func){
		
			this.on(key,func,1);
		},
		flush:function(key){
			var ls = this.eventSource[key] || [];
			var survivors = [];
			for(var i =0 ; i < ls.length;  i++ ){
				var entity = ls[i];
				if(!entity.isExpired()){
					survivors.push(entity);
				}
			}
			this.eventSource[key] = survivors;
		}
					
	}

	



		/* 模块状态 : 存在错误, 未加载, 加载中, 已加载, 已执行 */
		var STATUS ={ ERROR:0, UNLOAD:1, LOADING:2,LOADED:3 ,EXECUTED:4};
		var EVENTS ={ LOADED :"loaded", EXECUTED:"execed"}; 
		var CURRENT_MODULE = null;

		function module_meta(src){
			var indexOfPointJs=src.indexOf(".js");
			return {
				id: (indexOfPointJs != -1 ? src.substring(0,indexOfPointJs) : src),
				src: (indexOfPointJs !=-1  ? src : src+".js")
			}
		}
		/* 模块 */
		function Module(id,src,func){

			this.id = id; 
			this.src =src;
			this.func = func || null;
			this.status = STATUS.UNLOAD; 
			this.depsnum = 0;
			this.eventbus =  new Event();
			this._deps = []; 
		}
		
		
		Module.prototype ={

			load:function(callback){ // for some reason , it just invock by self.
				var self = this;	
					
				this.on(EVENTS.LOADED,callback);				
				if(this.status >= STATUS.LOADING){ return ;}
				this.status = STATUS.LOADING;
				var script = document.createElement("SCRIPT");
					script.type="text/javascript";
					script.async=true;
					script.src=this.src;		
					script.onload=function(){					
						self.func = $x.eax_func;
						self.status = STATUS.LOADED;
						self.emit(EVENTS.LOADED);
					}				 
					document.getElementsByTagName("HEAD")[0].appendChild(script);
			},

			exec:function(){
				var self = this;
				if(this.func == null || this.status < STATUS.LOADED){
					this.load(function(){
						self.exec();
					});
					return;
				}
				if(this.status == STATUS.EXECUTED){
					//this.emit(EVENTS.EXECUTED);
					return;
				}
				try{
					 this.func.call($x,$x);	

					 this.status = STATUS.EXECUTED;
					 this.emit(EVENTS.EXECUTED);
				}catch(e){
				
					 if(e instanceof ModuleDepException){
					 	 var modules = e.modules;
					 	 var deps = [] ; 
					 	 for(var i = 0 ; i< modules.length; i++){	
					 	 	if(modules[i].id  != this.id ){	 // 屏蔽对自己的依赖
					 	 		self.afterExec(modules[i]);
					 	 		deps.push(modules[i]);
					 	 	}
					 	 }
					 	 for(var i = 0 ; i< deps.length; i++){
					 	 	modules[i].exec();
					 	 }


					 }else{
					 	throw e;
					 }

				}
				

			},
			afterExec:function(module){
					var self = this;
					this.depsnum += 1;
					this._deps.push(module);
					
					module.on(EVENTS.EXECUTED,function(){
						self.depsnum -- ;
						if(self.depsnum == 0){
							self.exec();
						}
					});
			},

			on:function(key,func){
				/*
				    the old code ,implements a eventsource at self.
				    and change to a sf-event.js Event Object
					var ls = this.listener[key] || (this.listener[key] =[] );
					ls.push(func);	

				*/
				this.eventbus.one(key,func);
			},
			emit:function(key){
				console.log( this.id);
				this.eventbus.fire(key);
			}	


		}

		function ModuleDepException(modules){
			this.modules = $x.isArray(modules) ? modules : [modules];
		}

		function def(func){

				$x.eax_func = func;

		}
		function def0(src,func){
				var meta = module_meta(src);
				var id = meta.id, src = meta.src;
				if($x.CACHE[id]){
					throw "the lib#"+id+" has exists. please check it.";
				}
				var newModule  = new Module(id, src,func);
					newModule.status = STATUS.LOADED;
				$x.CACHE[id] = newModule;
		}

		function $import(src){
			
			var src = $x.isArray(src)  ? src : [src];
			var deps= [];
			for(var i = 0 ; i< src.length; i ++){
				var meta = module_meta(src[i]);
				deps.push(meta.id);
			}

			var unExecedDepsModule = [] ;
			for(var i = 0 ; i < deps.length ; i++){
				var module = $x.get(deps[i]);
				
				if(module.status < STATUS.EXECUTED){
					unExecedDepsModule.push(module);
				}
			}
			
			if(unExecedDepsModule.length > 0){
				throw new ModuleDepException(unExecedDepsModule);
			}

		}

		function $run(src){
			
			var id 	= $x.libId(src);
				var src = src.indexOf(".js")!= -1 ? src : (src+".js");
			var module = $x.get(id);
				
				module.exec();
				
			
		}



		window.$import = $import;
		window.def = def;
		window.def0 = def0;
		$x.$run = $run;




})();