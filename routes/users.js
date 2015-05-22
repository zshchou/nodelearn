var express = require('express');
var router = express.Router();
//var User = require('../datadb/mongoose');
var db = require('../datadb/mongojs');
var mongojs = require('mongojs');

/* GET users listing. */
router.get('/userlist', function(req, res, next) {
	/*
  User.find({}, function(err, users){

	users.forEach(function(element) {
	  var aa = new User(element);
	  console.log(aa.userinfo());
	}, this);
  });*/

  db.userlist.find({}, function (err, users) {
	  if (users) {
		  users.forEach(function (element) {
			  console.log(element);
		  }, this);
	  }
	  res.json(users);
  });
});

router.post('/adduser', function (req, res) {
	/*
  User.create(req.body, function (err, result) {
	res.send((err === null)?{msg:''}:{msg:err});
  });*/

	db.userlist.save(req.body, function (err, saved) {
		res.send((err === null || !saved)?{msg:''}:{msg:err});
	});
});

router.delete('/deleteuser/:id', function(req, res) {
	var userToDelete = req.params.id;
	/*
	User.remove({_id:userToDelete}, function(err) {
		res.send((err === null)?{msg:''}:{msg:err});
	});

	User.findByIdAndRemove(userToDelete, function(err) {
		res.send((err === null)?{msg:''}:{msg:err});
	});*/

	db.userlist.remove({_id:mongojs.ObjectId(userToDelete)}, function(err) {
		res.send((err === null)?{msg:''}:{msg:err});
	});
});

module.exports = router;
