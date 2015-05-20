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

router.get('/reg', function (req, res) {
  res.render('reg', { title: '注册' })
});

router.post('/reg', function (req, res) {
  
})

router.get('/login', function (req, res) {
  res.render('login', { title: '登录' })
});

router.post('/login', function (req, res) {
  
})

router.get('/logout', function (req, res) {
  
});


router.get('/post', function (req, res) {
  res.render('post', {title: 'post'})
});

module.exports = router;
