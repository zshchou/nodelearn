var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/test');   

var db = mongoose.connection;    

db.on('error',console.error);
db.once('open',function(){
    //在这里创建你的模式和模型    
});   

var Schema = mongoose.Schema;
var userSchema = new Schema({
  username : String,
  email: String,
  fullname: String,  
  age : Number,
  location: String,
  gender: String,
});

userSchema.methods.userinfo = function() {
  var str = this.username + ':' + this.age + '岁';
  return str;
};

module.exports = mongoose.model('User', userSchema, 'users');
