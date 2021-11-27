// 引入mongoose
var mongoose = require('mongoose');
// 连接MongoDB
mongoose.connect('mongodb://127.0.0.1/bbs');

var noteSchema = mongoose.Schema({
    // 发布人id
    userId: {
        type: String,
        require: true
    },
    // 标题
    title: {
        type: String,
        require: true
    },
    // 内容
    content: {
        type: String,
        require: true
    },
    // 插入日期
    insertDate: {
        type: Date,
        require: true
    }
});
var Note = mongoose.model('Note', noteSchema);

module.exports = {
    /**
     * 插入帖子
     * @param note 帖子对象
     * @returns {Promise<any>} 返回包含新增结果的Promise对象
     */
    insert: function (note) {
        return new Promise(function (resolve, reject) {
            var n = new Note(note);
            n.save(function (err, ret) {
                if (err) {
                    reject(err);
                }
                resolve(ret);
            })
        });
    },
    /**
     * 查询所有的帖子
     * @returns {Promise<any>} 含查询结果集的Promise对象
     */
    selectAll: function () {
        return new Promise(function (resolve, reject) {
            Note.find(function (err, ret) {
                if (err) {
                    reject(err);
                }
                resolve(ret);
            })
        });
    },
    /**
     * 根据指定帖子id查询指定帖子
     * @param id 指定的帖子id
     * @returns {Promise<any>} 含查询结果集的Promise对象
     */
    selectById: function (id) {
        return new Promise(function (resolve, reject) {
            Note.findById(id).exec(function (err, ret) {
                if (err) {
                    reject(err);
                }
                resolve(ret);
            });
        });
    },
    /**
     * 查询指定用户发布的所有帖子
     * @param userId 指定用户id
     * @returns {Promise<any>} 含查询结果集的Promise对象
     */
    selectByUserId: function (userId) {
        return new Promise(function (resolve, reject) {
            Note.find({userId: userId}).exec(function (err, ret) {
                if (err) {
                    reject(err);
                }
                resolve(ret);
            });
        });
    },
    /**
     * 根据帖子id删除帖子
     * @param id 帖子id
     * @returns {Promise<any>} 含删除结果集的Promise对象
     */
    deleteById: function (id) {
        return new Promise(function (resolve, reject) {
            Note.findByIdAndRemove(id, function (err, doc) {
                if (err) {
                    reject(err);
                }
                resolve(doc);
            })
        });
    },
    /**
     * 根据id更新帖子
     * @param id 待更新的帖子id
     * @param note 更新的内容
     * @returns {Promise<any>} 含更新结果集的Promise对象
     */
    updateById: function (id, note) {
        return new Promise(function (resolve, reject) {
            Note.findByIdAndUpdate(id, note, function (err, doc) {
                if (err) {
                    reject(err);
                }
                resolve(doc);
            });
        });
    }
};