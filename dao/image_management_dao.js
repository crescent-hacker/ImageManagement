var db = require("../infrastructure/database");
var logger = require("../infrastructure/logger")('normal');
var common_var = require("../infrastructure/common_var");
var async = require('async');
var tool = require("../infrastructure/tool");
var fs = require("fs");

// expose this function to our app using module.exports
var dao = module.exports;

//functionality definition
dao.test = function (done) {
    var sql = "SELECT * FROM IMAGE";
    connection.query(sql, function (err, result) {
        if (err) {
            logger.error(err);
            return done(false);
        }
        logger.info(result[0].id);
        logger.info(result[0].name);
        return done(true);
    });
};

//add sibling directory
dao.addDir = function (parentId, title, done) {
    db.getConnection(function (connection) {
        connection.beginTransaction(function (err) {
            if (err) {
                logger.error(err);
                return;
            }
        });

        //path
        var path = "";
        //insert id
        var insertId = -1;

        //check if parentId belongs to leave node
        var task0 = function (callback) {
            var qPathSql = "SELECT count(1) as NUM FROM IMAGE WHERE CATEGORY_ID = ? AND IS_TRASH = 0";
            connection.query(qPathSql, [parentId], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                logger.info("num is:" + result[0].NUM + " parentId: " + parentId + "   title: " + title)
                if (result[0].NUM > 0) {
                    callback(new Error("can't add children to a leave node!"), null);
                } else {
                    callback(null, result);
                }
            });
        }
        //query the path of parent
        var task1 = function (callback) {
            var qPathSql = "SELECT PATH FROM CATEGORY WHERE ID = ? AND IS_VALID = 1";
            connection.query(qPathSql, [parentId], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                path = (result.length > 0 ? result[0].PATH : "/") + title + "/";
                callback(null, result);
            });
        }
        //insert node
        var task2 = function (callback) {
            var insertSql = "INSERT INTO CATEGORY(PARENT_ID,TITLE,PATH) VALUES(?,?,?)";
            connection.query(insertSql, [parentId, title, path], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                insertId = result.insertId;
                callback(null, result);
            });
        }

        //execution
        async.series([task0, task1, task2], function (err, result) {
            if (err) {
                logger.error(err);
                //roll back
                connection.rollback(function () {
                    logger.error('error,rolling back!');
                    //release resource
                    connection.release();
                    done(false);
                });
                return;
            }
            //commit
            connection.commit(function (err) {
                if (err) {
                    logger.error(err);
                    done(false);
                    return;
                }

                logger.info('commit successfully!');
                //release resource
                connection.release();
                done(true, insertId, path);
            });
        })
    });
};

//delete directory
dao.delDir = function (id, done) {
    db.getConnection(function (connection) {
        connection.beginTransaction(function (err) {
            if (err) {
                logger.error(err);
                return;
            }
        });

        //check if only one root node left
        var rootNodeNum = 0;
        var task0 = function (callback) {
            var checkSql = "SELECT COUNT(1) AS NUM FROM CATEGORY WHERE IS_VALID = 1 AND PARENT_ID = -1";
            connection.query(checkSql, [], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                rootNodeNum = result[0].NUM;
                callback(null, result);
            });
        }

        //query the path of parent
        var path = "";
        var task1 = function (callback) {
            var qSql = "SELECT PATH FROM CATEGORY WHERE IS_VALID = 1 AND ID = ?";
            connection.query(qSql, [id], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                path = (result.length > 0 ? result[0].PATH : "/")
                var countSlash = tool.countChar(path, '/');
                if (countSlash == 2 && rootNodeNum == 1) {
                    callback(new Error("cannot delete the last root node!"), null);
                } else {
                    callback(null, result);
                }
            });
        }

        //query the path of parent
        var task2 = function (callback) {
            var updateSql = "DELETE FROM CATEGORY WHERE PATH LIKE ?";
            connection.query(updateSql, [path + "%"], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                callback(null, result);
            });
        }

        //execution
        async.series([task0, task1, task2], function (err, result) {
            if (err) {
                logger.error(err);
                //roll back
                connection.rollback(function () {
                    logger.error('error,rolling back!');
                    //release resource
                    connection.release();
                    done(false);
                });
                return;
            }
            //commit
            connection.commit(function (err) {
                if (err) {
                    logger.error(err);
                    done(false);
                    return;
                }

                logger.info('commit successfully!');
                //release resource
                connection.release();
                done(true);
            });
        })
    });
};

//rename dir
dao.editDirName = function (id, title, done) {
    db.getConnection(function (connection) {
        connection.beginTransaction(function (err) {
            if (err) {
                logger.error(err);
                return;
            }
        });
        var newPath = "";
        var oldPath = ""
        var task0 = function (callback) {
            var qSql = "SELECT PATH,TITLE FROM CATEGORY WHERE IS_VALID = 1 AND ID = ?";
            connection.query(qSql, [id], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                oldPath = result[0].PATH;
                var oldTitle = result[0].TITLE;
                newPath = oldPath.substring(0, oldPath.length - oldTitle.length - 1) + title + "/";
                callback(null, result);
            });
        }
        var task1 = function (callback) {
            var updateSql = "UPDATE CATEGORY SET TITLE = ? WHERE IS_VALID = 1 AND ID = ?";
            connection.query(updateSql, [title, id], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                callback(null, result);
            });
        }
        var task2 = function (callback) {
            var updateSql = "UPDATE CATEGORY SET PATH = REPLACE(PATH,?,?)  WHERE IS_VALID = 1 AND PATH LIKE ?";
            connection.query(updateSql, [oldPath, newPath, oldPath + "%"], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                callback(null, result);
            });
        };

        //execution
        async.series([task0, task1, task2], function (err, result) {
            if (err) {
                logger.error(err);
                //roll back
                connection.rollback(function () {
                    logger.error('error,rolling back!');
                    //release resource
                    connection.release();
                    done(false);
                });
                return;
            }
            //commit
            connection.commit(function (err) {
                if (err) {
                    logger.error(err);
                    done(false);
                    return;
                }

                logger.info('commit successfully!');
                //release resource
                connection.release();
                done(true);
            });
        })
    });
};

//moveDir
dao.moveDir = function (parentId, id, title, done) {
    db.getConnection(function (connection) {
        connection.beginTransaction(function (err) {
            if (err) {
                logger.error(err);
                return done(false);
            }
        });

        //check if parentId belongs to leave node
        var task0 = function (callback) {
            var qPathSql = "SELECT count(1) as NUM FROM IMAGE WHERE category_id = ? AND IS_TRASH = 0";
            connection.query(qPathSql, [parentId], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                logger.info("num is:" + result[0].NUM + " parentId: " + parentId + "  id:" + id + "   title: " + title)
                if (result[0].NUM > 0) {
                    callback(new Error("can't add children to a leave node!"), null);
                    return;
                }
                callback(null, result);
            });
        }
        //query the path of parent
        var path = "";
        var oldPath = "";
        var task1 = function (callback) {
            var qPathSql = "SELECT PATH FROM CATEGORY WHERE ID = ? AND IS_VALID = 1";
            connection.query(qPathSql, [id], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                oldPath = (result.length > 0 ? result[0].PATH : "/");
                callback(null, result);
            });
        }

        var task2 = function (callback) {
            var qPathSql = "SELECT PATH FROM CATEGORY WHERE ID = ? AND IS_VALID = 1";
            connection.query(qPathSql, [parentId], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                path = (result.length > 0 ? result[0].PATH : "/") + title + "/";
                callback(null, result);
            });
        }

        var task3 = function (callback) {
            var updateSql = "UPDATE CATEGORY SET PARENT_ID = ?  WHERE IS_VALID = 1 AND ID = ?";
            connection.query(updateSql, [parentId, id], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                callback(null, result);
            });
        };

        var task4 = function (callback) {
            var updateSql = "UPDATE CATEGORY SET PATH = REPLACE(PATH,?,?)  WHERE IS_VALID = 1 AND PATH LIKE ? ";
            connection.query(updateSql, [oldPath, path, oldPath + "%"], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                callback(null, result);
            });
        };

        //execution
        async.series([task0, task1, task2, task3, task4], function (err, result) {
            if (err) {
                logger.error(err);
                //roll back
                connection.rollback(function () {
                    logger.error('error,rolling back!');
                    //release resource
                    connection.release();
                    done(false);
                });
                return;
            }
            //commit
            connection.commit(function (err) {
                if (err) {
                    logger.error(err);
                    connection.release();
                    done(false);
                    return;
                }

                logger.info('commit successfully!');
                //release resource
                connection.release();
                done(true);
            });
        })
    });
};

//get directory tree
dao.getDirTree = function (done) {
    db.getConnection(function (connection) {
        var qSql = "SELECT parent_id,id,title,path,ID AS 'key' FROM CATEGORY WHERE is_valid = 1 ORDER BY parent_id,id ASC";
        connection.query(qSql, [], function (err, records) {
            if (err) {
                logger.error(err);
                connection.release()
                return done(false);
            }
            var qLeaveSql = "SELECT CATEGORY_ID AS ID,COUNT(1) AS NUM FROM IMAGE WHERE IS_TRASH = 0 GROUP BY CATEGORY_ID";
            connection.query(qLeaveSql, [], function (err, leafIds) {
                if (err) {
                    logger.error(err);
                    connection.release()
                    return done(false);
                }
                connection.release();
                return done(true, records, leafIds);
            });
        });
    });
};

//query image list
dao.getImageList = function (leafIds, isAll, sortType, orderType, searchKey, done) {
    db.getConnection(function (connection) {
        var qSql = "SELECT * FROM IMAGE WHERE IS_TRASH = 0 AND (1=0 ";
        var qObjs = [];
        if (isAll) {
            qSql += " OR 1=1";
        } else {
            //get image list by leaf category
            for (var i = 0; i < leafIds.length; i++) {
                qSql += " OR CATEGORY_ID = ? ";
                qObjs.push(leafIds[i]);
            }
        }
        qSql += " ) ";
        //add search key
        if (searchKey != "") {
            qSql += " AND IMG_NAME LIKE ? "
            qObjs.push("%" + searchKey + "%");
        }

        //add sort type
        if (sortType == 0)
            qSql += " ORDER BY OPER_DATE "
        if (sortType == 1)
            qSql += " ORDER BY SIZE "
        if (sortType == 2)
            qSql += " ORDER BY IMG_NAME "

        //add order type
        if (orderType == 0)
            qSql += "";
        if (orderType == 1)
            qSql += " ASC ";
        if (orderType == 2)
            qSql += " DESC"

        logger.info(qSql, qObjs);
        connection.query(qSql, qObjs, function (err, records) {
            if (err) {
                logger.error(err);
                connection.release();
                return done(false, null);
            }

            connection.release();
            return done(true, records);
        });
    });
};

//upload image
dao.uploadImg = function (path, name, format, size, category_id, oper_user_id, done) {
    db.getConnection(function (connection) {
        connection.beginTransaction(function (err) {
            if (err) {
                logger.error(err);
                return done(false);
            }
        });

        //check if parentId belongs to leave node
        var task0 = function (callback) {
            var addImgSql = "INSERT INTO IMAGE(IMG_NAME,OPER_DATE,DESCRIPTION,CATEGORY_ID,OPER_USER_ID,CREATE_DATE,FORMAT,SIZE) VALUES(?,CURDATE(),?,?,?,CURDATE(),?,?)";
            connection.query(addImgSql, [name, "", category_id, oper_user_id, format, size], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                callback(null, result);
            });
        };

        //execution
        async.series([task0], function (err, result) {
            if (err) {
                logger.error(err);
                //roll back
                connection.rollback(function () {
                    logger.error('error,rolling back!');
                    //release resource
                    connection.release();
                    done(false);
                });
                return;
            }
            //commit
            connection.commit(function (err) {
                if (err) {
                    logger.error(err);
                    done(false);
                    return;
                }

                logger.info('commit successfully!');
                //release resource
                connection.release();
                done(true);
            });
        })
    });
};

//move images to trash
dao.moveToTrash = function (imageIds, done) {
    db.getConnection(function (connection) {
        connection.beginTransaction(function (err) {
            if (err) {
                logger.error(err);
                return done(false);
            }
        });
        //urls of images
        var task0 = function (callback) {
            var qImgSql = "SELECT CONCAT(T1.PATH,T2.IMG_NAME,T2.FORMAT) AS URL,CONCAT(T1.PATH,T2.IMG_NAME,'.thumbnail',T2.FORMAT) AS THUMBNAIL_URL FROM CATEGORY T1,IMAGE T2 WHERE T1.ID = T2.CATEGORY_ID AND ( 1 = 0 ";
            var obj = [];
            for (var i = 0; i < imageIds.length; i++) {
                qImgSql += " OR T2.ID = ? "
                obj.push(imageIds[i]);
            }
            qImgSql += " )"
            connection.query(qImgSql, obj, function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                callback(null, result);
            });
        };
        var task1 = function (callback) {
            //todo,CHANGE TO UPDATE
            var updateImgSql = "DELETE FROM IMAGE WHERE 1=0 ";
            // var updateImgSql = "UPDATE IMAGE SET IS_TRASH = 1 WHERE 1=0 ";
            var obj = [];
            for (var i = 0; i < imageIds.length; i++) {
                updateImgSql += " OR ID = ? "
                obj.push(imageIds[i]);
            }
            connection.query(updateImgSql, obj, function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                callback(null, result);
            });
        };

        //execution
        async.series([task0, task1], function (err, result) {
            if (err) {
                logger.error(err);
                //roll back
                connection.rollback(function () {
                    logger.error('error,rolling back!');
                    //release resource
                    connection.release();
                    done(false);
                });
                return;
            }
            //commit
            connection.commit(function (err) {
                if (err) {
                    logger.error(err);
                    done(false);
                    return;
                }

                logger.info('commit successfully!');
                //release resource
                connection.release();
                done(true, result[0]);
            });
        })
    });
}

//move images to path
dao.moveToPath = function (imageIds, targetId, done) {
    db.getConnection(function (connection) {
        connection.beginTransaction(function (err) {
            if (err) {
                logger.error(err);
                return done(false);
            }
        });
        //urls of images
        var task0 = function (callback) {
            var qImgSql = "SELECT " +
                "CONCAT(T1.PATH,T2.IMG_NAME,T2.FORMAT) AS C_URL," +
                "CONCAT(T1.PATH,T2.IMG_NAME,'.thumbnail',T2.FORMAT) AS C_T_URL," +
                "CONCAT(T2.IMG_NAME,T2.FORMAT) AS NAME," +
                "CONCAT(T2.IMG_NAME,'.thumbnail',T2.FORMAT) AS THUMBNAIL_NAME" +
                " FROM CATEGORY T1,IMAGE T2 WHERE T1.ID = T2.CATEGORY_ID AND ( 1 = 0 ";
            var obj = [];
            for (var i = 0; i < imageIds.length; i++) {
                qImgSql += " OR T2.ID = ? "
                obj.push(imageIds[i]);
            }
            qImgSql += " )";
            logger.debug(qImgSql, obj);
            connection.query(qImgSql, obj, function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                callback(null, result);
            });
        };
        //check before update
        var task1 = function (callback) {
            var qImgSql = "SELECT COUNT(1)" +
                " FROM CATEGORY T1,IMAGE T2 " +
                "WHERE T1.ID = T2.CATEGORY_ID AND T2.CATEGORY_ID = ? AND ( 1 = 0 ";
            var qImgSql = "SELECT COUNT(1) AS NUM FROM (SELECT IMG_NAME FROM IMAGE WHERE CATEGORY_ID = ? "
            var obj = [targetId];
            for (var i = 0; i < imageIds.length; i++) {
                qImgSql += " OR ID = ? "
                obj.push(imageIds[i]);
            }
            qImgSql += " ) T1 GROUP BY IMG_NAME HAVING NUM>1";
            logger.debug(qImgSql, obj);
            connection.query(qImgSql, obj, function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                if (result.length > 0) {
                    callback(new Error("One or more image names has been taken in the target directory."), null);
                } else {
                    callback(null, result);
                }
            });
        };
        var task2 = function (callback) {
            var updateImgSql = "UPDATE IMAGE SET CATEGORY_ID = ? WHERE 1=0 ";
            var obj = [targetId];
            for (var i = 0; i < imageIds.length; i++) {
                updateImgSql += " OR ID = ? "
                obj.push(imageIds[i]);
            }
            connection.query(updateImgSql, obj, function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                callback(null, result);
            });
        };

        //execution
        async.series([task0, task1, task2], function (err, result) {
            if (err) {
                logger.error(err);
                //roll back
                connection.rollback(function () {
                    logger.error('error,rolling back!');
                    //release resource
                    connection.release();
                    done(false,err.message);
                });
                return;
            }
            //commit
            connection.commit(function (err) {
                if (err) {
                    logger.error(err);
                    done(false,"commit error");
                    return;
                }

                logger.info('commit successfully!');
                //release resource
                connection.release();
                done(true, result[0]);
            });
        })
    });
}

//rename image
dao.renameImage = function (id, name, user_id, done) {
    db.getConnection(function (connection) {
        connection.beginTransaction(function (err) {
            if (err) {
                logger.error(err);
                return;
            }
        });

        //check if there is name existed under the same directory
        var task0 = function (callback) {
            var qSql = "SELECT COUNT(1) AS NUM FROM IMAGE WHERE CATEGORY_ID = (SELECT CATEGORY_ID FROM IMAGE WHERE IS_TRASH = 0 AND ID = ?) AND IMG_NAME = ?";
            logger.debug(qSql, [id, name]);
            connection.query(qSql, [id, name], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                var count = result[0].NUM;
                if (count > 0) {
                    callback(new Error("The name has been taken"), null);
                } else {
                    callback(null, null);
                }
            });
        }

        //urls of images
        var task1 = function (callback) {
            var qImgSql = "SELECT " +
                "CONCAT(T1.PATH,T2.IMG_NAME,T2.FORMAT) AS C_URL," +
                "CONCAT(T1.PATH,T2.IMG_NAME,'.thumbnail',T2.FORMAT) AS C_T_URL," +
                "CONCAT(T1.PATH,?,T2.FORMAT) AS N_URL," +
                "CONCAT(T1.PATH,?,'.thumbnail',T2.FORMAT) AS N_T_URL" +
                " FROM CATEGORY T1,IMAGE T2 WHERE T1.ID = T2.CATEGORY_ID AND T2.ID = ? ";
            var obj = [name, name, id];
            logger.debug(qImgSql, obj);
            connection.query(qImgSql, obj, function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                callback(null, result[0]);
            });
        };

        var task2 = function (callback) {
            var updateSql = "UPDATE IMAGE SET IMG_NAME = ?, OPER_USER_ID = ?,OPER_DATE = CURDATE() WHERE IS_TRASH = 0 AND ID = ?";
            connection.query(updateSql, [name, user_id, id], function (err, result) {
                if (err) {
                    logger.error(err);
                    callback(err, null);
                    return;
                }
                callback(null, result);
            });
        }

        //execution
        async.series([task0, task1, task2], function (err, result) {
            if (err) {
                logger.error(err);
                //roll back
                connection.rollback(function () {
                    logger.error('error,rolling back!');
                    //release resource
                    connection.release();
                    done(false, err.message);
                });
                return;
            }
            //commit
            connection.commit(function (err) {
                if (err) {
                    logger.error(err);
                    done(false, err.message);
                    return;
                }

                logger.info('commit successfully!');
                //release resource
                connection.release();
                done(true, result[1]);
            });
        })
    });
};
