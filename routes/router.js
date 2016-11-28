var express = require('express');
var fs = require('fs');
var path = require('path');
var formidable = require('formidable');
var util = require('util');
var easyimg = require('easyimage');

var router = express.Router();

/* tools */
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

/* page routers */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});
router.get('/image_management', function (req, res, next) {
    res.render('image_management', {title: 'Express'});
});
router.get('/image_trash', function (req, res, next) {
    res.render('trash', {title: 'Express'});
});

/* json query routers */
router.get('/ajax-tree-taxonomy.json', function (req, res, next) {
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
router.get('/ajax-tree-trash.json', function (req, res, next) {
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
router.get('/ajax-sub2.json', function (req, res, next) {
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
router.get('/get-image-list.json', function (req, res, next) {
    var jsonObj = {};
    var thumbnailList = [];
    var imageList = [];
    var imageNames = [];
    fs.realpath('resource', function (err, resolvedPath) {
        if (err) {
            throw err;
        }
        //get list json
        walk(resolvedPath + "/images", imageList, "/images/");
        walk(resolvedPath + "/images/thumbnail", thumbnailList, "/images/thumbnail/");
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
router.get('/get-trash-image-list.json', function (req, res, next) {
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

/* operation routers */
router.post('/upload', function (req, res, next) {
    var form = new formidable.IncomingForm();
    form.uploadDir = '/tmp';   //文件保存在系统临时目录
    form.maxFieldsSize = 10 * 1024 * 1024;  //上传文件大小限制为最大1M
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
            var filesUrl = [];
            var errCount = 0;
            var keys = Object.keys(files);
            keys.forEach(function (key) {
                var filePath = files[key].path;
                var fileExt = filePath.substring(filePath.lastIndexOf('.'));
                var imageName = files[key].name.substring(0, files[key].name.lastIndexOf('.'));
                if (('.jpg.jpeg.png.gif').indexOf(fileExt.toLowerCase()) === -1) {
                    errCount += 1;
                } else {
                    //以当前时间戳对上传文件进行重命名
                    // var fileName = new Date().getTime() + fileExt;
                    var fileName = imageName + fileExt;
                    var targetFile = path.join(targetDir, fileName);
                    //移动文件
                    fs.renameSync(filePath, targetFile);
                    // 文件的Url（相对路径）
                    filesUrl.push(fileName);
                    //generate thumbnail
                    var thumbnailFile = path.join(targetDir + "/thumbnail/", imageName + "_thumbnail" + fileExt);
                    easyimg.rescrop({
                        src: targetFile, dst: thumbnailFile,
                        width: 550, height: 300,
                        cropwidth: 550, cropheight: 300,
                        gravity:"Center",fill:true

                    }).then(
                        function (image) {
                            console.log(fileName+' resized success');
                        },
                        function (err) {
                            console.log(err);
                        }
                    );
                }
            });

            // 返回上传信息
            res.json({filesUrl: filesUrl, success: keys.length - errCount, error: errCount});
        });
    }
});
router.post('/moveToTrash', function (req, res, next) {
    var jsonObj = {};
    var imageNames = req.body.imageIds.split("|");
    if (imageNames.length == 0) {
        jsonObj.success = false;
        jsonObj.err_msg = "no image id selected.";
    }
    //move to trash
    fs.realpath('resource', function (err, resolvedPath) {
        if (err) {
            throw err;
        }
        var images = resolvedPath + "/images/";
        var trash_images = resolvedPath + "/trash-images/";

        for (var i = 0; i < imageNames.length; i++) {
            if(imageNames[i].lenght==0)
                continue;
            fs.rename(images + imageNames[i] + ".jpg", trash_images + imageNames[i] + ".jpg");
            fs.rename(images + "thumbnail/" + imageNames[i] + "_thumbnail.jpg", trash_images + "thumbnail/" + imageNames[i] + "_thumbnail.jpg");
        }
    });
    //respond
    jsonObj.success = true;
    res.json(jsonObj);
});
router.post('/putBack', function (req, res, next) {
    var jsonObj = {};
    var imageNames = req.body.imageIds.split("|");
    if (imageNames.length == 0) {
        jsonObj.success = false;
        jsonObj.err_msg = "no image id selected.";
    }
    //move to trash
    fs.realpath('resource', function (err, resolvedPath) {
        if (err) {
            throw err;
        }
        var images = resolvedPath + "/images/";
        var trash_images = resolvedPath + "/trash-images/";

        for (var i = 0; i < imageNames.length; i++) {
            fs.renameSync(trash_images + imageNames[i] + ".jpg", images + imageNames[i] + ".jpg");
            fs.renameSync(trash_images + "thumbnail/" + imageNames[i] + "_thumbnail.jpg", images + "thumbnail/" + imageNames[i] + "_thumbnail.jpg");
        }
    });
    //respond
    jsonObj.success = true;
    res.json(jsonObj);
});
router.post('/destroyImages', function (req, res, next) {
    var jsonObj = {};
    var imageNames = req.body.imageIds.split("|");
    if (imageNames.length == 0) {
        jsonObj.success = false;
        jsonObj.err_msg = "no image id selected.";
    }
    //move to trash
    fs.realpath('resource', function (err, resolvedPath) {
        if (err) {
            throw err;
        }
        var trash_images = resolvedPath + "/trash-images/";

        for (var i = 0; i < imageNames.length; i++) {
            fs.unlinkSync(trash_images + imageNames[i] + ".jpg");
            fs.unlinkSync(trash_images + "thumbnail/" + imageNames[i] + "_thumbnail.jpg");
        }
    });
    //respond
    jsonObj.success = true;
    res.json(jsonObj);
});

/*  */
















// export inteferce
module.exports = router;
