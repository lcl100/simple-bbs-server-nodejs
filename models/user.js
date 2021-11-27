// 引入mongoose
var mongoose = require('mongoose');
// 连接MongoDB
mongoose.connect('mongodb://127.0.0.1/bbs');

var userSchema = mongoose.Schema({
    // 用户名
    username: {
        type: String,
        require: true
    },
    // 登录密码
    password: {
        type: String,
        require: true
    },
    // 用户头像
    avatar: {
        type: String,
        require: false,
        default: './img/avatar.jpg'
    },
    // 性别
    gender: {
        type: Number,
        enum: [-1, 0, 1],// 保密、男、女
        default: -1
    },
    // 个人简介
    introduction: {
        type: String,
        require: true
    },
    // 注册日期
    registerDate: {
        type: Date,
        require: true
    }
});
var User = mongoose.model('User', userSchema);

module.exports = {
    /**
     * 插入新用户
     * @param user 用户对象
     * @returns {Promise<any>} 返回包含新增结果的Promise对象
     */
    insert: function (user) {
        return new Promise(function (resolve, reject) {
            var u = new User(user);
            u.save(function (err, ret) {
                if (err) {
                    reject(err);
                }
                resolve(ret);
            });
        });
    },
    /**
     * 查询所有用户
     * @returns {Promise<any>} 包含查询结果集的Promise对象
     */
    selectAll: function () {
        return new Promise(function (resolve, reject) {
            User.find(function (err, ret) {
                if (err) {
                    reject(err);
                }
                resolve(ret);
            });
        });
    },
    /**
     * 根据用户id查询用户
     * @param id 用户id
     * @returns {Promise<any>} 包含查询结果的Promise对象
     */
    selectById: function (id) {
        return new Promise(function (resolve, reject) {
            User.findById(id).exec(function (err, ret) {
                if (err) {
                    reject(err);
                }
                resolve(ret);
            });
        });
    },
    /**
     * 根据用户名查询用户
     * @param username 指定用户名
     * @returns {Promise<any>} 包含查询结果的Promise对象
     */
    selectByUsername: function (username) {
        return new Promise(function (resolve, reject) {
            User.findOne({username: username}, function (err, ret) {
                if (err) {
                    reject(err);
                }
                resolve(ret);
            });
        });
    },
    /**
     * 根据用户名和密码查询用户对象
     * @param username 用户名
     * @param password 密码
     * @returns {Promise<any>} 包含查询结果的Promise对象
     */
    selectByUsernameAndPassword: function (username, password) {
        return new Promise(function (resolve, reject) {
            User.find({username: username, password: password}, function (err, ret) {
                if (err) {
                    reject(err);
                }
                resolve(ret);
            })
        });
    }
};

