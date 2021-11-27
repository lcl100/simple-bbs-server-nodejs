// 引入mongoose
var mongoose = require('mongoose');
// 连接MongoDB
mongoose.connect('mongodb://127.0.0.1/bbs');

var commentSchema = mongoose.Schema({
    // 留言人id
    userId: {
        type: String,
        require: true
    },
    // 留言内容
    content: {
        type: String,
        require: true
    },
    // 被留言的帖子id
    noteId: {
        type: String,
        require: true
    },
    // 留言时间
    insertDate: {
        type: Date,
        require: true
    }
});
var Comment = mongoose.model('Comment', commentSchema);

module.exports = {
    /**
     * 插入留言
     * @param comment 待插入的留言
     * @returns {Promise<any>} 返回包含新增结果的Promise对象
     */
    insert: function (comment) {
        return new Promise(function (resolve, reject) {
            var c = new Comment(comment);
            c.save(function (err, ret) {
                if (err) {
                    reject(err);
                }
                resolve(ret);
            })
        });
    },
    /**
     * 根据帖子id查询该帖子下的所有留言
     * @param noteId 帖子id
     * @returns {Promise<any>} 包含查询结果集的Promise对象
     */
    selectByNoteId(noteId) {
        return new Promise(function (resolve, reject) {
            Comment.find({noteId: noteId}, function (err, ret) {
                if (err) {
                    reject(err);
                }
                resolve(ret);
            });
        })
    },
    /**
     * 根据帖子id查询该帖子下的留言数
     * @param noteId 帖子id
     * @returns {Promise<any>} 包含查询结果的Promise对象
     */
    getCommentCountByNoteId(noteId) {
        return new Promise(function (resolve, reject) {
            Comment.count({noteId: noteId}, function (err, count) {
                if (err) {
                    reject(err);
                }
                resolve(count);
            });
        });
    },
    /**
     * 根据留言id删除一条留言
     * @param id 留言id
     * @returns {Promise<any>} 返回删除结果的Promise对象
     */
    deleteById(id) {
        return new Promise(function (resolve, reject) {
            Comment.findByIdAndDelete(id, function (err, doc) {
                if (err) {
                    reject(err);
                }
                resolve(doc);
            });
        });
    },
    /**
     * 根据帖子id删除该帖子下的所有留言
     * @param noteId 帖子id
     * @returns {Promise<any>} 返回删除结果集的Promise对象
     */
    deleteByNoteId(noteId) {
        return new Promise(function (resolve, reject) {
            Comment.deleteMany({noteId: noteId}, function (err, doc) {
                if (err) {
                    reject(err);
                }
                resolve(doc);
            });
        });
    }
};
