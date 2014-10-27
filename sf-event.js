/*
	描述: 一个测试 js 文件,代码还在测试用来实现一个带计数的事件对象
	目的: 打算建一个 任务依赖处理系统 , 用来整合到 sf.js 的模块执行工作中.
*/
(function(){


	var $_tos= Object.prototype.toString ;
	var $x =  {
			isFunc:function(obj){
				return $_tos.call(obj) === "[object Function]";
			},
			isArray:function(obj){
				return $_tos.call(obj) === "[object Array]";
			}	
	}; 
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
		this.eventSource=[];
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
				 var entity = ls[i];
					 entity.exec();
			} 
			this.flush();			
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


	/*  test  */

		
		function Task(name){
			this.name = name;
			this.e = new Event();
		}
		Task.prototype = {
			exec:function(){
				console.log(this.name);
			},
			on:function(key,func){
				this.e.one(key,func);
			},
			emit:function(key){
				this.e.fire(key);
			}
		}
		
		function DSL(mainTask){
			 this.dependsOn = {num:0 , _:[]};
			 this.task =mainTask;
			 this.isFinish =false;
			 this.id = mainTask._id ||  (mainTask._id= new Date().getTime()); 
		}
		DSL.prototype={
			 cache:{ },
			 get:function(task){
			 	 var  existDslTask = this.cache[task.id];
			 	 if(!existDslTask){
					 existDslTask = this.cache[task.id] = new DSL(task);
			 	 }
			 	 return existDslTask;
			 },
			 run:function(){
			 	var self = this , dependsOn = this.dependsOn._;
			 	if(dependsOn.length > 0){
			 		for( var i = 0 ; i < dependsOn.length ; i++){
			 			dependsOn[i].task.on("exec",function(){
			 				  self.dependsOn.num -- ; 
			 				  if(self.dependsOn.num == 0){
			 				  	  self.task.exec();
			 				  }	
			 			});	
			 			dependsOn[i].run();
			 		}
			 	}else{
			 		this.task.exec();
			 	}

			 },
			 after:function(dsl){
			 	   this.dependsOn._.push(dsl);
			 	   return this;
			 },
			 before:function(task){

			 }
		};



	var d1 = new DSL(new Task(1));
	var d2 = new DSL(new Task(2));
	var d3 = new DSL(new Task(3));
	
	var d4 = new DSL(new Task(4));
	
	

	var  main = new DSL(new Task("main")).after(d4).after(d1);
		d4.after(d3).after(d2);

		main.run();









})();