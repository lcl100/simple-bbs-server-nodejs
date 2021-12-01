// 0.Express提供了一种更好的方式，专门用来包装路由
var express = require('express');
var md5 = require('md5');// md5加密模块
var path = require('path');// 路径处理模块
var fs = require('fs');// 文件系统模块

// 1.创建一个路由容器
var router = express.Router();
var userModel = require('./models/user.js');
var noteModel = require('./models/note');
var commentModel = require('./models/comment');

router.get('/', function (request, response) {
    // 如果访问"/"则重定向到"/index.html"中
    response.redirect('/index.html');
});

// 渲染首页
router.get('/index.html', async function (request, response) {
    // 涉及mongodb多表查询，但这里利用的是单表查询，在这里进行了组合
    var notes = null;
    // 根据是否有author参数来决定是显示所有帖子还是显示某个用户的帖子
    if (request.query.author != null) {
        var userId = request.query.author;
        notes = await noteModel.selectByUserId(userId);
    } else {
        var notes = await noteModel.selectAll();
    }
    var newNotes = notes.map(async item => {
        var user = await userModel.selectById(item.userId);
        return {
            note: {
                id: item._id.toString().replace('"', ''),// 会多一对双引号，所以特殊处理
                userId: item.userId !== undefined ? item.userId.toString().replace('"', '') : null,
                title: item.title,
                content: item.content,
                viewCount: item.viewCount !== undefined ? item.viewCount : 0,
                insertDate: formatDate(item.insertDate)
            },
            user: {
                id: user._id.toString().replace(/"/g, ''),
                username: user.username,
                avatar: user.avatar,
                gender: user.gender === -1 ? '保密' : (user.gender === 0 ? '男' : '女'),
                introduction: user.introduction,
                registerDate: formatDate(user.registerDate)
            },
            comment: {
                commentCount: await commentModel.getCommentCountByNoteId(item._id)// 该篇帖子下的留言评论数
            }
        }
    });
    var res = [];
    for (var i in newNotes) {
        res.push(await newNotes[i])
    }
    // 判断是否登录
    var isLogin = false;
    if (request.session.user !== undefined && request.session.user !== null) {
        isLogin = true;
    }
    response.render('index.html', {
        isLogin: isLogin,
        notes: res,
        user: request.session.user != null ? request.session.user[0] : null
    });
});

// 渲染login.html页面
router.get('/login.html', function (request, response) {
    // 如果处于登录状态，则不渲染login.html而是重定向到index.html
    if (request.session.user != null) {
        return response.redirect('/');
    }
    response.render("login.html");
});

// 登录请求处理
router.post('/login', async function (request, response) {
    // 获取请求数据
    var postForm = request.body;

    // 对提交的数据进行校验
    if (postForm.username === null || postForm.username.length < 3) {
        return response.status(400).send({code: 400, msg: "用户名不能为空并且至少三个字符！"});
    }
    if (postForm.password === null || postForm.password.length < 6 || postForm.password.length > 18) {
        return response.status(400).send({code: 400, msg: "密码不能为空并且长度在6到18个字符之间！"});
    }

    // 根据用户名和密码在mongodb数据库中查询，如果查询到结果表示有用户则登录成功，否则提示前去注册
    var checkedUser = await userModel.selectByUsernameAndPassword(postForm.username, md5(postForm.password));// 注意，数据库中的密码是已经经过md5加密的，所以也需要加密后去对比查询
    if (checkedUser != null && checkedUser.length === 1) {// checkedUser是一个数组
        // 登录成功后，将用户信息保存到session中
        checkedUser.password = null;
        request.session.user = checkedUser;
        return response.send({code: 200, msg: '登录成功！'});
    } else {
        return response.status(400).send({code: 400, msg: '用户名或密码不正确！'})
    }
});

// 渲染register.html页面
router.get('/register.html', function (request, response) {
    // 如果处于登录状态，则不渲染register.html而是重定向到index.html
    if (request.session.user != null) {
        return response.redirect('/');
    }
    response.render('register.html');
});

// 注册请求处理
router.post('/register', async function (request, response) {
    // 获取请求数据
    var files = request.files;// POST请求上传的头像文件
    var postForm = request.body;// POST请求提交的数据

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
    }).then(function (result) {
        response.send({code: 200, msg: "用户注册成功！"});
    }).catch(function (reason) {
        console.log(reason);
        response.status(500).send({code: 500, msg: '用户注册失败！'});
    });
});

// 登出请求处理
router.get('/logout', function (request, response) {
    // 清除session
    request.session.user = null;
    // 并且重定向到首页
    response.redirect('/');
});

// 判断是否登录
router.get('/isLogin', function (request, response) {
    // 根据session中是否有用户来判断是否处于登录状态
    if (request.session.user != null) {
        response.status(200).send({code: 200, msg: '已登录！', data: true})
    } else {
        response.status(200).send({code: 200, msg: '未登录！', data: false});
    }
});

// 获取登录用户信息
router.get('/getUser', function (request, response) {
    if (request.session.user == null) {
        return response.status(400).send({code: 400, msg: '未登录！', data: null});
    } else {
        var user = request.session.user[0];
        user.password = null;// 密码不能对外暴露
        user.gender = parseInt(user.gender) === -1 ? '保密' : (parseInt(user.gender) === 0 ? '男' : '女');// 将性别由数字转换成文字显示
        return response.status(200).send({code: 200, msg: '成功获取到用户信息！', data: user});
    }
});

// 渲染detail.html页面
router.get('/detail.html', async function (request, response, next) {
    if (request.query.id != null) {
        var noteId = request.query.id;
        var note = await noteModel.selectById(noteId);// 获取指定id的帖子
        // 每访问一次，浏览量都会加1
        var viewCount = note.viewCount;
        viewCount++;
        var updateResult = await noteModel.updateViewCountByNoteId(noteId, {viewCount: viewCount});// 更新浏览量
        var comments = await commentModel.selectByNoteId(noteId);// 获取该帖子下的所有留言
        var commentCount = await commentModel.getCommentCountByNoteId(noteId);// 获取该帖子的留言总数
        var user = await userModel.selectById(note.userId);// 根据用户id获取用户信息
        var newComments = comments.map(async item => {
            var user = await userModel.selectById(item.userId);
            return {
                comment: {
                    id: item._id.toString().replace(/"/g, ''),
                    userId: item.userId,
                    content: item.content,
                    noteId: item.noteId,
                    insertDate: formatDate(item.insertDate)
                },
                user: {
                    id: user._id.toString().replace(/"/g, ''),
                    username: user.username,
                    avatar: user.avatar,
                    gender: user.gender === -1 ? '保密' : (user.gender === 0 ? '男' : '女'),
                    introduction: user.introduction,
                    registerDate: formatDate(user.registerDate)
                }
            }
        });
        // newComments是一个Promise对象数组，所以要提取其中的成功结果
        var res = [];
        for (var i in newComments) {
            res.push(await newComments[i])
        }
        // 渲染detail.html页面
        response.render('detail.html', {
            user: {
                id: user._id.toString().replace(/"/g, ''),
                username: user.username,
                avatar: user.avatar,
                gender: user.gender === -1 ? '保密' : (user.gender === 0 ? '男' : '女'),
                introduction: user.introduction,
                registerDate: formatDate(user.registerDate)
            },
            note: note,
            comment: {
                commentCount: commentCount
            },
            comments: res,
            isLogin: request.session.user !== undefined,
            loginUserId: request.session.user !== undefined ? request.session.user[0]._id : null
        });
    } else {
        next();
    }
});

// 渲染publish.html页面
router.get('/publish.html', async function (request, response) {
    // 该页面只有登录用户才能访问，所以验证session判断是否登录
    if (request.session.user != null) {
        // 如果有id参数表示要编辑帖子；如果没有id参数则表示要发布帖子
        if (request.query.id !== null) {
            var note = await noteModel.selectById(request.query.id);
            response.render('publish.html', {note: note})
        } else {
            // 如果登录了则渲染publish.html页面
            response.render('publish.html');
        }
    } else {
        // 如果没有登录则重定向到首页
        return response.redirect('/');
    }
});

// 发布帖子
router.post('/publish', function (request, response) {
    // 判断是否登录
    if (request.session.user === null) {
        return response.status(400).send({code: 400, msg: '未登录！', data: null});
    } else {
        // 获取POST请求提交的数据
        var postForm = request.body;

        // 对提交的数据进行校验
        if (postForm.title === null || postForm.title.length < 3 || postForm.title.length > 30) {
            return response.status(400).send({code: 400, msg: '标题不能为空并且字符个数在3到30之间！'});
        }
        if (postForm.content === null || postForm.content.length === 0) {
            return response.status(400).send({code: 400, msg: '话题内容不能为空！'});
        }

        // 发布帖子
        var note = {
            userId: request.session.user[0]._id,
            title: postForm.title,
            content: postForm.content,
            viewCount: 0,
            insertDate: new Date()
        };
        noteModel.insert(note).then(function (result) {
            response.send({code: 200, msg: "帖子发布成功！"});
        }).catch(function (reason) {
            console.log(reason);
            response.status(500).send({code: 500, msg: '帖子发布失败！'});
        });
    }
});

// 编辑帖子
router.post('/note/edit', function (request, response) {
    // 判断是否登录
    if (request.session.user === null) {
        return response.status(400).send({code: 400, msg: '未登录！', data: null});
    } else {
        // 获取POST请求提交的数据
        var postForm = request.body;

        // 对提交的数据进行校验
        if (postForm.title === null || postForm.title.length < 3 || postForm.title.length > 30) {
            return response.status(400).send({code: 400, msg: '标题不能为空并且字符个数在3到30之间！'});
        }
        if (postForm.content === null || postForm.content.length === 0) {
            return response.status(400).send({code: 400, msg: '话题内容不能为空！'});
        }

        // 更新帖子
        var note = {
            userId: request.session.user[0]._id,
            title: postForm.title,
            content: postForm.content,
            viewCount: request.body.viewCount,
            insertDate: new Date()
        };
        var id = request.body.id.toString().replace(/"/g, '');// 如果id中存在双引号，则无法更新成功，所以要进行处理
        noteModel.updateById(id, note).then(function (result) {
            response.send({code: 200, msg: '帖子更新成功！'});
        }).catch(function (reason) {
            console.log(reason);
            response.status(500).send({code: 500, msg: '帖子更新失败！'});
        });
    }
});

// 删除帖子，同时要删除帖子下的所有留言
router.get('/note/delete', async function (request, response) {
    // 判断是否登录
    if (request.session.user === null) {
        return response.status(400).send({code: 400, msg: '未登录！', data: null});
    } else {
        // 获取待删除的帖子id
        var noteId = request.query.id;
        // 删除帖子
        await noteModel.deleteById(noteId);
        // 删除帖子下的所有留言
        await commentModel.deleteByNoteId(noteId);
        response.redirect('/index.html');
    }
});

// 发布留言
router.post('/comment/publish', function (request, response) {
    if (request.session.user === undefined) {
        return response.status(400).send({code: 400, msg: '未登录！', data: null});
    } else {
        // 参数校验
        if (request.body.content === null || request.body.content.length === 0) {
            return response.status(400).send({code: 400, msg: '留言不能为空！'});
        }
        // 插入到数据库
        commentModel.insert({
            userId: request.session.user[0]._id,
            content: request.body.content,
            noteId: request.body.noteId,
            insertDate: new Date()
        }).then(function (ret) {
            response.redirect('/detail.html?id=' + request.body.noteId);
        }).catch(function (err) {
            console.log(err);
            return response.status(500).send({code: 500, msg: '发布留言失败！'});
        });
    }
});

function formatDate(date) {
    if (date !== undefined) {
        return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
    }
    return null;
}

// 3.把router暴露出去
module.exports = router;
