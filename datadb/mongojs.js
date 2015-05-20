var mongojs = require('mongojs');

var dataurl = 'mongodb://localhost/test';
var collections = ["userlist"];
var db = mongojs(dataurl, collections);

db.on('error',function(err) {
    console.log('database error', err);
});
 
db.on('ready',function() {
    console.log('database connected');
});

module.exports = db;