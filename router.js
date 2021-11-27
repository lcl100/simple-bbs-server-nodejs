// 0.Express提供了一种更好的方式，专门用来包装路由
var express = require('express');
var md5 = require('md5');// md5加密模块
var path = require('path');// 路径处理模块
var fs = require('fs');// 文件系统模块

// 1.创建一个路由容器
var router = express.Router();
var userModel = require('./models/user.js');

router.get('/', function (request, response) {
    // 如果访问"/"则重定向到"/index"中
    response.redirect('/index');
});

router.get('/index', function (request, response) {
    response.render('index.html');
});

// 渲染login.html页面
router.get('/login.html', function (request, response) {
    response.render("login.html");
});

router.get('/login', function (request, response) {
    response.render('login.html');
});

// 渲染register.html页面
router.get('/register.html', function (request, response) {
    response.render('register.html');
});

router.post('/register', async function (request, response) {
    // 获取请求数据
    var files = request.files;// POST请求上传的头像文件
    var postForm = request.body;// POST请求提交的数据
    console.log(files);
    console.log(postForm);

    // 对提交的数据进行校验
    if (postForm.username === null || postForm.username.length < 3) {
        return response.status(400).send({code: 400, msg: "用户名不能为空并且至少三个字符！"});
    }
    if (postForm.password === null || postForm.password.length < 6 || postForm.password.length > 18) {
        return response.status(400).send({code: 400, msg: "密码不能为空并且长度在6到18个字符之间！"});
    }
    if (postForm.repassword === null || postForm.password.length < 6 || postForm.password.length > 18) {
        return response.status(400).send({code: 400, msg: "确认密码不能为空并且长度在6到18个字符之间！"});
    }
    if (postForm.password !== postForm.repassword) {
        return response.status(400).send({code: 400, msg: "确认密码必须和密码一致！"});
    }
    if (!(parseInt(postForm.gender) === -1 || parseInt(postForm.gender) === 0 || parseInt(postForm.gender) === 1)) {
        return response.status(400).send({code: 400, msg: "请选择有效的性别！"});
    }
    if (postForm.introduction === null || postForm.introduction.length < 10 || postForm.introduction.length > 100) {
        return response.status(400).send({code: 400, msg: "个人简介不能为空并且长度在10到100个字符之间！"});
    }
    if (!request.files || Object.keys(request.files).length === 0) {
        return response.status(400).send({code: 400, msg: "请选择头像文件进行上传"});
    }

    // 将上传的头像保存到/public/img下
    var fileName = 'uploaded_' + new Date().getTime() + "_" + files.avatar.name;// 拼接文件名
    var uploadPath = require('path').join(__dirname, '/public/img/', fileName);// 拼接上传文件保存到本地的路径
    files.avatar.mv(uploadPath, function (err) {
        if (err) {
            console.error(err);// 打印错误日志
            return response.status(500).send({code: 500, msg: '文件上传失败！'});
        }
    });

    // 检查用户名是否已经存在
    var checkedUser = await userModel.selectByUsername(postForm.username);
    if (checkedUser !== null) {
        // 如果用户已经存在，那么刚才上传的头像文件应该删除掉
        fs.unlink(uploadPath, function (err) {
            if (err) {
                console.log(err);
                return response.status(500).send({code: 500, msg: '头像文件删除失败！'});
            }
            console.log('头像文件删除成功！');
        });
        return response.status(400).send({code: 400, msg: "用户名已经存在！"});
    }

    // 注册用户，将用户数据插入到mongodb数据库中
    userModel.insert({
        username: postForm.username,
        password: md5(postForm.password),// 注意，需要对密码进行加密
        avatar: './public/img/' + fileName,
        gender: postForm.gender,
        introduction: postForm.introduction,
        registerDate: new Date()
    });

    response.send({code: 200, msg: "用户注册成功！"});
});

router.get('/detail', function (request, response) {
    response.render('detail.html');
});

router.get('/publish', function (request, response) {
    response.render('publish.html');
});

router.get('/test', async function (request, response) {
    var user = {
        username: '赵六',
        password: '753159',
        avatar: './img/avatar.jpg',
        gender: -1,
        introduction: '我是用户赵六',
        registerDate: new Date()
    };
    var result = await userModel.selectByUsername('赵六1');
    response.send(result === null);
    // var result=await userModel.insert(user);
    // response.send(result);
});

// 3.把router暴露出去
module.exports = router;
