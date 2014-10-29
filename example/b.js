def(function(){

	$import("a.js");

		console.log("-----------------b");

	var User = this.User = function(){
			var name = "zm";
			var age =24;
	};
	User.prototype={
		toString:function(){
			return "User#{name:zm,age:24}";
		}
	};


});