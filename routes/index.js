var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: '主页' });
});

router.post('/', function (req, res, next) {
  console.log(req.body.name);
  res.json(req.body);
});

router.get('/regis', function (req, res) {
  res.render('regis', { title: '注册' })
});

router.post('/regis', function (req, res) {
  
})

router.get('/login', function (req, res) {
  res.render('login', { title: '登录' })
});

router.post('/login', function (req, res) {
  
})

router.get('/logout', function (req, res) {
  
});

router.get('/form', function(reg, res){
  res.render('form', {title: 'FORM演示'})
})


router.get('/post', function (req, res) {
  res.render('post', {title: 'post'})
});

module.exports = router;
