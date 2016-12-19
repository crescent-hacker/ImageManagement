var express = require('express');
var fs = require('fs');
var path = require('path');
var formidable = require('formidable');
var util = require('util');
var easyimg = require('easyimage');
var im_dao = require('../dao/image_management_dao');
var common = require('../infrastructure/common_var');
var tool = require('../infrastructure/tool');
var logger = require('../infrastructure/logger')('normal');
var archiver = require('archiver');

// export inteferce
var router = {};
module.exports = router;

/* tools */
//tool method - walk through the file list
function walk(path, fileList, prefix) {
    var dirList = fs.readdirSync(path);
    dirList.forEach(function (item) {
        // if(fs.statSync(path + '/' + item).isDirectory()){
        //     walk(path + '/' + item,fileList,prefix);
        // }else{
        var fileExt = item.substring(item.lastIndexOf('.'));
        if (('.jpg.jpeg.png.gif').indexOf(fileExt.toLowerCase()) != -1) {
            fileList.push(prefix + item);
        }
    });
}
//tool method - generate tree from records
function genTree(data, leafIds) {
    var compare = function (a, b) {
        return a.level - b.level;
    }

    //1.records to tree array
    var tree = [];
    for (var i = 0; i < data.length; i++) {
        data[i].folder = false;
        data[i].level = tool.countChar(data[i].path, '/');
        data[i].image_num = 0;
        data[i].is_leaf = false;
        data[i].leaf_descendant = [];
        data[i].children = [];
        tree.push(data[i]);
    }
    tree.sort(compare);

    //2.scan to form the map
    var map = {};
    for (i = 0; i < tree.length; i++) {
        map[tree[i].id] = i;
    }

    //3.leafIds
    for (i = 0; i < leafIds.length; i++) {
        tree[map[leafIds[i].ID]].image_num = leafIds[i].NUM;
        tree[map[leafIds[i].ID]].is_leaf = true;
    }

    //4.insert from the tail to head in tree
    for (i = tree.length - 1; i >= 0; i--) {
        var p_idx = map[tree[i].parent_id];
        if (tree[i].parent_id == -1)
            continue;

        tree[p_idx]['children'].push(tree[i]);
        tree[p_idx]['image_num'] += tree[i].image_num;
        if (tree[i].is_leaf) {
            tree[p_idx]['leaf_descendant'].push(tree[i].id);
        } else {
            for (var j = 0; j < tree[i]['leaf_descendant'].length; j++) {
                tree[p_idx]['leaf_descendant'].push(tree[i]['leaf_descendant'][j]);
            }
        }
        tree[p_idx].folder = true;
        tree.pop();
    }
    return tree;
}

router.init = function (app, session, passport, login_validator) {
    /* page routers */
    app.get('/', login_validator.ensureLoggedIn(),
        function (req, res, next) {
            res.render('index', {title: 'Express'});
        });
    app.get('/image_management', login_validator.ensureLoggedIn(),
        function (req, res, next) {
            res.render('image_management', {title: 'Express'});
        });
    app.get('/image_trash', login_validator.ensureLoggedIn(),
        function (req, res, next) {
            res.render('trash', {title: 'Express'});
        });

    /* json query routers */
    app.get('/ajax-tree-taxonomy.json', login_validator.ensureLoggedIn(),
        function (req, res, next) {
            fs.realpath('resource', function (err, resolvedPath) {
                if (err) {
                    throw err;
                }
                fs.readFile(resolvedPath + "/json/test.json", function (err, data) {//读取同目录下的book.json文件
                    if (err) {
                        throw err;
                    }
                    var jsonObj = JSON.parse(data);//获取json文件对象
                    res.json(jsonObj);
                });
            });
        });
    app.get('/ajax-tree-trash.json', login_validator.ensureLoggedIn(),
        function (req, res, next) {
            fs.realpath('resource', function (err, resolvedPath) {
                if (err) {
                    throw err;
                }
                fs.readFile(resolvedPath + "/json/test-trash.json", function (err, data) {//读取同目录下的book.json文件
                    if (err) {
                        throw err;
                    }
                    var jsonObj = JSON.parse(data);//获取json文件对象
                    res.json(jsonObj);
                });
            });
        });
    app.get('/ajax-sub2.json', login_validator.ensureLoggedIn(),
        function (req, res, next) {
            fs.realpath('resource', function (err, resolvedPath) {
                if (err) {
                    throw err;
                }
                fs.readFile(resolvedPath + "/json/test-sub.json", function (err, data) {
                    if (err) {
                        throw err;
                    }
                    var jsonObj = JSON.parse(data);//获取json文件对象
                    res.json(jsonObj);
                });
            });
        });
    app.get('/get-trash-image-list.json', login_validator.ensureLoggedIn(),
        function (req, res, next) {
            var jsonObj = {};
            var thumbnailList = [];
            var imageList = [];
            var imageNames = [];
            fs.realpath('resource', function (err, resolvedPath) {
                if (err) {
                    throw err;
                }
                //get list json
                walk(resolvedPath + "/trash-images", imageList, "/trash-images/");
                walk(resolvedPath + "/trash-images/thumbnail", thumbnailList, "/trash-images/thumbnail/");
                for (var i = 0; i < imageList.length; i++) {//get names
                    var path = imageList[i];
                    var name = path.substring(path.lastIndexOf("/") + 1, path.lastIndexOf("."));
                    imageNames.push(name);
                }
                //return json
                jsonObj.imageList = imageList;
                jsonObj.thumbnailList = thumbnailList;
                jsonObj.imageNames = imageNames;
                jsonObj.success = true;
                res.json(jsonObj);
            });
        });
    app.post('/get-image-list.json', login_validator.ensureLoggedIn(),
        function (req, res, next) {
            var dirId = req.body.dirId;
            var isAll = (!dirId);
            var sortType = req.body.sortType;
            if (!sortType) sortType = "";
            var orderType = req.body.orderType;
            if (!orderType) orderType = 0;
            var searchKey = req.body.searchKey;

            //get related dir record in cache
            var records, record, nodes;
            //get leaf nodes
            nodes = [];
            records = req.session[common.session_key.dir_tree_records];
            if (!isAll) {
                record = records[dirId];
                if (!!record) {
                    if (record.is_leaf) {
                        nodes.push(record.id);
                    } else {
                        nodes = record.leaf_descendant;
                    }
                }
            }

            //get image root dir path
            im_dao.getImageList(nodes, isAll, sortType, orderType, searchKey, function (result, imageList) {
                for (var i = 0; i < imageList.length; i++) {
                    imageList[i].url = "/images" + records[imageList[i].category_id].path + imageList[i].img_name + imageList[i].format;
                    imageList[i].thumbnail_url = "/images" + records[imageList[i].category_id].path + imageList[i].img_name + ".thumbnail" + imageList[i].format;
                    imageList[i].path = records[imageList[i].category_id].path;
                }

                res.json({success: result, list: imageList});
            });

        });

    /* operation routers */
    app.post('/upload', login_validator.ensureLoggedIn(),
        function (req, res, next) {
            var form = new formidable.IncomingForm();
            form.uploadDir = '/tmp';   //文件保存在系统临时目录
            form.maxFieldsSize = 10 * 1024 * 1024;  //上传文件大小限制为最大10M
            form.keepExtensions = true;        //使用文件的原扩展名

            var targetDir = path.join(__dirname, '../resource/images');
            // 检查目标目录，不存在则创建
            fs.access(targetDir, function (err) {
                if (err) {
                    fs.mkdirSync(targetDir);
                }
                _fileParse();
            });

            // 文件解析与保存
            function _fileParse() {
                form.parse(req, function (err, fields, files) {
                    if (err) throw err;
                    var relativePath = fields.upload_path + "/";
                    var parentDirKey = fields.upload_path_id;
                    if (parentDirKey == -1) {
                        res.status(500);
                        res.json({error: "Cannot upload to root."});
                        return;

                    }
                    var filesUrl = [];
                    var errCount = 0;
                    var keys = Object.keys(files);
                    keys.forEach(function (key) {
                        var filePath = files[key].path;
                        var fileExt = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
                        var imageName = files[key].name.substring(0, files[key].name.lastIndexOf('.'));
                        imageName = tool.escapeHtml(imageName);
                        if (('.jpg.jpeg.png.bmp').indexOf(fileExt) === -1) {
                            errCount += 1;
                        } else {
                            //以当前时间戳对上传文件进行重命名
                            // var fileName = new Date().getTime() + fileExt;
                            var fileName = relativePath + imageName + fileExt;
                            var targetFile = path.join(targetDir, fileName);
                            fs.access(targetFile, function (err) {
                                if (err) {
                                    //移动文件
                                    fs.renameSync(filePath, targetFile);
                                    // 文件的Url（相对路径）
                                    filesUrl.push(fileName);
                                    easyimg.info(targetFile).then(
                                        function (info) {
                                            //generate thumbnail
                                            var thumbnailFile = path.join(targetDir, relativePath + imageName + ".thumbnail" + fileExt);
                                            easyimg.rescrop({
                                                src: targetFile, dst: thumbnailFile,
                                                width: 550, height: 300,
                                                cropwidth: 550, cropheight: 300,
                                                gravity: "Center", fill: true

                                            }).then(
                                                function (image) {
                                                    console.log(fileName + ' resized success');
                                                    im_dao.uploadImg(relativePath + imageName, imageName, fileExt, (info.size / 1048576), parentDirKey, req.user.id, function (result) {
                                                        if (result) {
                                                            logger.info("Upload Img " + relativePath + imageName + " successfully!")
                                                            req.session[common.session_key.dir_tree] = undefined;
                                                            req.session[common.session_key.dir_tree_records] = undefined;
                                                        } else {
                                                            logger.info("Upload Img " + relativePath + imageName + " fail!");
                                                        }
                                                        res.json({
                                                            filesUrl: filesUrl,
                                                            success: keys.length - errCount,
                                                            error: errCount,
                                                            dbSuccess: result
                                                        });
                                                    });
                                                },
                                                function (err) {
                                                    logger.error(err);
                                                }
                                            );
                                        },
                                        function (err) {
                                            logger.error(err);
                                        }
                                    );
                                } else {
                                    var err_msg = "Image '" + fileName + "' is already existed.";
                                    logger.error(err_msg);
                                    // res.json({filesUrl: filesUrl, success: false, error: err_msg}
                                    res.status(500);
                                    res.json({"error": err_msg});
                                    return;
                                }
                            });
                        }
                    });
                });
            }
        });
    app.post('/moveToTrash', login_validator.ensureLoggedIn(),
        function (req, res, next) {
            var jsonObj = {};
            var imageIds = req.body.imageIds.split("|");
            if (imageIds.length == 0) {
                jsonObj.success = false;
                jsonObj.err_msg = "no image id selected.";
            }
            //get root dir
            var rootDir = path.join(__dirname, '../resource/images');

            //delete real file
            im_dao.moveToTrash(imageIds, function (success, imgUrls) {
                //respond
                if (success) {
                    for (var idx in imgUrls) {
                        var url = rootDir + imgUrls[idx].URL;
                        var thumbnail_url = rootDir + imgUrls[idx].THUMBNAIL_URL;
                        fs.unlinkSync(url);
                        fs.unlinkSync(thumbnail_url);
                    }
                    req.session[common.session_key.dir_tree] = undefined;
                    req.session[common.session_key.dir_tree_records] = undefined;
                    jsonObj.success = success;
                    res.json(jsonObj);
                } else {
                    res.json(jsonObj);
                }
            });
        });
    // app.post('/putBack', login_validator.ensureLoggedIn(),
    //     function (req, res, next) {
    //         var jsonObj = {};
    //         var imageNames = req.body.imageIds.split("|");
    //         if (imageNames.length == 0) {
    //             jsonObj.success = false;
    //             jsonObj.err_msg = "no image id selected.";
    //         }
    //         //move to trash
    //         fs.realpath('resource', function (err, resolvedPath) {
    //             if (err) {
    //                 throw err;
    //             }
    //             var images = resolvedPath + "/images/";
    //             var trash_images = resolvedPath + "/trash-images/";
    //
    //             for (var i = 0; i < imageNames.length; i++) {
    //                 fs.renameSync(trash_images + imageNames[i] + ".jpg", images + imageNames[i] + ".jpg");
    //                 fs.renameSync(trash_images + "thumbnail/" + imageNames[i] + "_thumbnail.jpg", images + "thumbnail/" + imageNames[i] + "_thumbnail.jpg");
    //             }
    //         });
    //         req.session[common.session_key.dir_tree] = undefined;
    //         req.session[common.session_key.dir_tree_records] = undefined;
    //         //respond
    //         jsonObj.success = true;
    //         res.json(jsonObj);
    //     });
    // app.post('/destroyImages', login_validator.ensureLoggedIn(),
    //     function (req, res, next) {
    //         var jsonObj = {};
    //         var imageNames = req.body.imageIds.split("|");
    //         if (imageNames.length == 0) {
    //             jsonObj.success = false;
    //             jsonObj.err_msg = "no image id selected.";
    //         }
    //         //move to trash
    //         fs.realpath('resource', function (err, resolvedPath) {
    //             if (err) {
    //                 throw err;
    //             }
    //             var trash_images = resolvedPath + "/trash-images/";
    //
    //             for (var i = 0; i < imageNames.length; i++) {
    //                 fs.unlinkSync(trash_images + imageNames[i] + ".jpg");
    //                 fs.unlinkSync(trash_images + "thumbnail/" + imageNames[i] + "_thumbnail.jpg");
    //             }
    //         });
    //         //respond
    //         req.session[common.session_key.dir_tree] = undefined;
    //         req.session[common.session_key.dir_tree_records] = undefined;
    //         jsonObj.success = true;
    //         res.json(jsonObj);
    //     });
    app.get('/download', login_validator.ensureLoggedIn(),
        function (req, res) {
            //download path id
            var dirId = req.query.id;
            //get cache records
            var records = req.session[common.session_key.dir_tree_records];
            var record = records[dirId];
            if (!record) {
                res.send("<script>window.close();</script>");
                return;
            }
            var fullPath = path.resolve('resource/images') + record.path;
            logger.debug("download filename: " + fullPath);
            //zip it to tmp
            var zipFileName = path.resolve('resource/tmp') + "/" + record.edit_title + "-" + new Date().getTime() + ".zip";
            var output = fs.createWriteStream(zipFileName);
            var archive = archiver('zip', {
                store: true // Sets the compression method to STORE.
            });
            // listen for all archive data to be written
            output.on('close', function () {
                console.log(archive.pointer() + ' total bytes');
                console.log('archiver has been finalized and the output file descriptor has closed.');
                res.download(zipFileName, function () {
                    fs.unlink(zipFileName, function () {
                        console.log(zipFileName + " deleted successfully after downloaded.")
                    })
                });
            });
            archive.on('error', function (err) {
                throw err;
            });
            archive.pipe(output);
            archive.bulk([
                {
                    src: ['**'],
                    cwd: fullPath,
                    dest: record.path,
                    expand: true
                }
            ]);
            archive.finalize();
        });
    app.post('/moveToPath', login_validator.ensureLoggedIn(),
        function (req, res) {
            var jsonObj = {};
            //params
            var targetId = req.body.targetId;
            var imageIds = req.body.imageIds.split("|");

            //check if images has been selected
            if (imageIds.length == 0) {
                jsonObj.success = false;
                jsonObj.err_msg = "No image id selected.";
                res.json(jsonObj);
                return;
            }
            //check if the selected dir is leaf
            var records = req.session[common.session_key.dir_tree_records];
            var record = records[targetId];
            if (!record) {
                jsonObj.success = false;
                jsonObj.err_msg = "The target directory does not exist.";
                res.json(jsonObj);
                return;
            }
            // if (!!record.children && record.children.length > 0) {

            if (!record.is_leaf && record.children.length > 0) {
                jsonObj.success = false;
                jsonObj.err_msg = "The target directory is not a bottom directory.";
                res.json(jsonObj);
                return;
            }

            //get root dir
            var rootDir = path.join(__dirname, '../resource/images');
            var targetPath = record.path;

            //delete real file
            im_dao.moveToPath(imageIds, targetId, function (success, obj) {
                //respond
                if (success) {
                    try {
                        for (var idx in obj) {
                            var current_url = rootDir + obj[idx].C_URL;
                            var current_th_url = rootDir + obj[idx].C_T_URL;
                            var target_url = rootDir + targetPath + obj[idx].NAME;
                            var target_th_url = rootDir + targetPath + obj[idx].THUMBNAIL_NAME;
                            fs.renameSync(current_url, target_url);
                            fs.renameSync(current_th_url, target_th_url);
                            logger.debug("moving '" + current_url + "' to '" + current_th_url + "' successfully.");
                        }
                    } catch (ex) {
                        logger.error(ex);
                        res.json(jsonObj);
                        return;
                    }
                    req.session[common.session_key.dir_tree] = undefined;
                    req.session[common.session_key.dir_tree_records] = undefined;
                    jsonObj.success = success;
                    res.json(jsonObj);
                } else {
                    jsonObj.err_msg = obj;
                    res.json(jsonObj);
                }
            });
        });
    app.post('/renameImage', login_validator.ensureLoggedIn(), function (req, res) {
        var jsonObj = {success: false, err_msg: ""}
        var name = req.body.name;
        name = tool.escapeHtml(name);
        var id = req.body.id;
        //check params
        if (!id || !name) {
            jsonObj.err_msg = "Name cannot be empty";
            return res.json(jsonObj);
        }
        im_dao.renameImage(id,name,req.user.id,function(result,obj){
            jsonObj.success = result;
            if(result){
                var rootDir = path.join(__dirname, '../resource/images');
                var current_url = rootDir + obj.C_URL;
                var current_th_url = rootDir + obj.C_T_URL;
                var target_url = rootDir + obj.N_URL;
                var target_th_url = rootDir + obj.N_T_URL;
                fs.renameSync(current_url, target_url);
                fs.renameSync(current_th_url, target_th_url);
                logger.debug("moving '" + current_url + "' to '" + current_th_url + "' successfully.");
            }else{
                jsonObj.err_msg = obj;
            }
            res.json(jsonObj);
        });
    });

    /* directory management */
    app.get('/getDirTree.json', login_validator.ensureLoggedIn(),
        function (req, res, next) {
            console.log("calling getDirTree!")
            var isEdit = req.query.isEdit;
            var tree = req.session[common.session_key.dir_tree];
            if (!tree) {
                im_dao.getDirTree(function (success, records, leafIds) {
                    //put tree in session
                    tree = genTree(records, leafIds);
                    var map = {};
                    for (var i = 0; i < records.length; i++) {
                        map[records[i].id] = records[i];
                        records[i].view_title = records[i].title + '&nbsp;&nbsp;<span class="badge" style="margin-top:-2px;">' + records[i].image_num + '</span>';
                        records[i].edit_title = records[i].title;
                        if (isEdit == 0) {
                            records[i].title = records[i].view_title;
                        }
                        records[i].children.sort(tool.compareByName);
                    }
                    req.session[common.session_key.dir_tree] = tree;
                    req.session[common.session_key.dir_tree_records] = map;
                    res.json(tree);
                });
            } else {
                tool.visitTree(tree, function (node) {
                    if (isEdit == 0)
                        node.title = node.view_title;
                    else
                        node.title = node.edit_title;
                }, function (tree) {
                    req.session[common.session_key.dir_tree] = tree;
                    res.json(tree);
                });
            }
        });

    app.post('/addDir', login_validator.ensureLoggedIn(),
        function (req, res, next) {
            var parentId = req.body.parentId;
            if (parentId.substring(0, 4) == "root") parentId = -1;

            var title = req.body.title;
            title = tool.escapeHtml(title);
            //check if parentId is a leave with images
            var record = req.session[common.session_key.dir_tree_records][parentId];
            if (!!record&&record.is_leaf) {
                res.json({success: false});
                return;
            }
            // add directory to file system
            var fullPath = (!record ? "/" : record.path) + title + "/";
            var targetDir = path.join(__dirname, '../resource/images' + fullPath);
            logger.info("Creating " + targetDir);
            fs.access(targetDir, function (err) {
                if (err) {
                    //start make dir
                    fs.mkdir(targetDir, function (err) {
                        if (err) {
                            logger.error(err);
                        }
                        logger.info("Create \"" + targetDir + "\" successfually!");
                        //mkdir success
                        im_dao.addDir(parentId, title, function (result, insertId) {
                            if (result) {
                                req.session[common.session_key.dir_tree] = undefined;
                                req.session[common.session_key.dir_tree_records] = undefined;
                                //return json
                                res.json({success: result, insertId: insertId});
                            } else {
                                res.json({success: result});
                            }
                        });
                    });
                } else {
                    logger.error("The directory already existed!");
                    res.json({success: false});
                }
            });
        });
    app.post('/moveDir',
        login_validator.ensureLoggedIn(),
        function (req, res, next) {
            var jsonObj = {success: false};
            var parentId = req.body.parentId;
            var id = req.body.id;
            var title = req.body.title;
            var records = req.session[common.session_key.dir_tree_records];
            // add directory to file system
            var p_record = records[parentId];
            var record = records[id];

            //check if id is a leave with images
            if (p_record.is_leaf) {
                res.json(jsonObj);
                return;
            }

            var currentDir = path.join(__dirname, '../resource/images' + record.path);
            var targetDir = path.join(__dirname, '../resource/images' + p_record.path + record.edit_title + "/");
            logger.info("Move from '" + currentDir + "' to '" + targetDir + "'");
            fs.tr
            fs.access(currentDir, function (err) {
                if (err) {
                    logger.error("Move directory error, the path doesn't exist!")
                    res.json(jsonObj);
                    return;
                }
                //start make dir
                fs.rename(currentDir, targetDir, function (err) {
                    if (err) {
                        logger.error("Move directory error,", err);
                        res.json(jsonObj);
                        return;
                    }
                    logger.info("Move from '" + currentDir + "' to '" + targetDir + "' successfully!");

                    im_dao.moveDir(parentId, id, title, function (result) {
                        req.session[common.session_key.dir_tree] = undefined;
                        req.session[common.session_key.dir_tree_records] = undefined;
                        res.json({success: result});
                    });
                });
            });
        });
    app.post('/delDir', login_validator.ensureLoggedIn(),
        function (req, res, next) {
            var jsonObj = {success: false}
            var id = req.body.id;
            // add directory to file system
            var record = req.session[common.session_key.dir_tree_records][id];
            if (!record) {
                res.json(jsonObj);
                return;
            }
            if (record.is_leaf) {
                res.json(jsonObj);
                return;
            }
            var targetDir = path.join(__dirname, '../resource/images' + record.path);
            logger.info("Deleting " + targetDir);
            fs.access(targetDir, function (err) {
                if (err) {
                    logger.error("Delete directory error, the path doesn't exist!")
                    res.json(jsonObj);
                    return;
                }
                //start make dir
                fs.rmdir(targetDir, function (err) {
                    if (err) {
                        logger.error("Delete directory error,", err);
                        res.json(jsonObj);
                        return;
                    }
                    logger.info("Delete \"" + targetDir + "\" successfully!");
                    im_dao.delDir(id, function (result) {
                        req.session[common.session_key.dir_tree] = undefined;
                        req.session[common.session_key.dir_tree_records] = undefined;
                        jsonObj.success = result;
                        res.json(jsonObj);
                    });
                });
            });
        });
    app.post('/editDirName', login_validator.ensureLoggedIn(),
        function (req, res, next) {
            var jsonObj = {success: false};
            var id = req.body.id;
            var title = req.body.title;
            title = tool.escapeHtml(title);

            // add directory to file system
            var record = req.session[common.session_key.dir_tree_records][id];
            if (!record) {
                res.json(jsonObj);
                return;
            }
            var oldTitle = record.edit_title;
            var currentDir = path.join(__dirname, '../resource/images' + record.path);
            var targetDir = path.join(__dirname, '../resource/images' + record.path.substring(0, record.path.length - oldTitle.length - 1) + title + "/");
            logger.info("Rename from '" + currentDir + "' to '" + targetDir + "'");
            fs.access(currentDir, function (err) {
                if (err) {
                    logger.error("Rename directory error, the path doesn't exist!")
                    res.json(jsonObj);
                    return;
                }
                //start make dir
                fs.rename(currentDir, targetDir, function (err) {
                    if (err) {
                        logger.error("Rename directory error,", err);
                        res.json(jsonObj);
                        return;
                    }
                    logger.info("Rename from '" + currentDir + "' to '" + targetDir + "' successfully!");
                    im_dao.editDirName(id, title, function (result) {
                        req.session[common.session_key.dir_tree] = undefined;
                        req.session[common.session_key.dir_tree_records] = undefined;
                        res.json({success: result});
                    });
                });
            });


        });

    app.get('/refresh', login_validator.ensureLoggedIn(),
        function (req, res, next) {
            req.session[common.session_key.dir_tree] = undefined;
            req.session[common.session_key.dir_tree_records] = undefined;

            res.json({success: true});
        });

    app.post('/checkLeave', login_validator.ensureLoggedIn(), function (req, res, next) {
        //only check if there is children folder under the dir
        var id = req.body.id;
        var record = req.session[common.session_key.dir_tree_records][id];
        var result = true;
        if (!!record.children && record.children.length > 0) {
            result = false;
        }
        if (id == -1) {
            result = false;
        }
        res.json({success: result});
    });

}


