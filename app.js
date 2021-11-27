// 第一步，引入express
var express = require("express");// express框架
var bodyParser = require('body-parser');// POST请求体数据处理模块
var fileUpload = require('express-fileupload');// 文件上传处理模块
// 导入路由router.js
var router = require('./router');

// 第二步，创建服务器应用程序，即原来的http.createServer()
var app = express();

// 公开静态资源目录
app.use('/public/', express.static('./public/'));

// 配置express-art-template模板引擎
app.engine('html', require('express-art-template'));
// 配置body-parser
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(fileUpload());

// 把路由挂载到app容器中
app.use(router);

app.use(function (request, response) {
    // 404处理
    response.render('404.html');
});

// 监听端口，相当于原来的server.listen()
app.listen(8888, function () {
    console.log("app is running at port 8888.");
});