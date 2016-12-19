/************************ global var **********************/
var glyph_opts = {
    map: {
        // doc: "glyphicon glyphicon-file",
        // docOpen: "glyphicon glyphicon-file",
        doc: "glyphicon glyphicon-folder-close",
        docOpen: "glyphicon glyphicon-folder-open",
        checkbox: "glyphicon glyphicon-unchecked",
        checkboxSelected: "glyphicon glyphicon-check",
        checkboxUnknown: "glyphicon glyphicon-share",
        dragHelper: "glyphicon glyphicon-play",
        dropMarker: "glyphicon glyphicon-arrow-right",
        error: "glyphicon glyphicon-warning-sign",
        expanderClosed: "glyphicon glyphicon-menu-right",
        expanderLazy: "glyphicon glyphicon-menu-right",  // glyphicon-plus-sign
        expanderOpen: "glyphicon glyphicon-menu-down",  // glyphicon-collapse-down
        folder: "glyphicon glyphicon-folder-close",
        folderOpen: "glyphicon glyphicon-folder-open",
        loading: "glyphicon glyphicon-refresh glyphicon-spin"
    }
};

var im_var = {
    CLIPBOARD: null,
    tree: null,
    active_path_id: null,
    target_path_id: null,
    sidebar_tree_name: "tree",
    moveto_tree_name: "simple-tree"
}

/************************ initialize **********************/
$(function () {
    //init directory tree
    im_var.tree = simpleTreeInit(im_var.sidebar_tree_name, true, false);
    // im_var.tree = complexTreeInit(sidebar_tree_name);
    var sidebar = $(".side-nav");
    var wrapper = $(".wrapper");
    //set action to resize event of sidebar
    $("#resize-nav-bar").resizable({
        resize: function (event, ui) {
            var width = ui.size.width;
            var min_width = parseInt(sidebar.css("min-width").replace("px", ""));
            var max_width = parseInt(sidebar.css("max-width").replace("px", ""));
            if (width > max_width)
                width = max_width;
            if (width < min_width)
                width = min_width;
            wrapper.css("padding-left", width);
            sidebar.css("left", sidebar.css("width"));
            sidebar.css("margin-left", "-" + sidebar.css("width"));
        },
        handles: 'e, w'
    });
    //resize-nav-bar height setting
    if ($(window).width() < 742) {
        $("#resize-nav-bar").css("z-index", 9999);
        $("#resize-nav-bar").css("height", $(window).height());
    }
    //set sidebar height
    var sidebar_height = $("#resize-nav-bar").height() - $("#tree-header").height() - parseInt($("#" + im_var.sidebar_tree_name).css("margin-top").replace("px", ""));
    $(".fancytree-container").height(sidebar_height);

    //initilise photo-gallery plugin
    $(document).on('click', '[data-toggle="lightbox"]', function (event) {
        event.preventDefault();
        $(this).ekkoLightbox({
            onShown: function () {
                console.log('Checking our the events huh?');
            },
            onNavigate: function (direction, itemIndex) {
                console.log('Navigating ' + direction + '. Current item: ' + itemIndex);
            }
        });
    });

    /***************** button bindings ******************/
    //check-all button binding
    $("#check-all-button").on("click", function () {
        var check_div = $(".image-check");
        var checked_div = $(".glyphicon-check");
        if (check_div.length > checked_div.length - 1) {
            check_div.attr("status", "1");
            check_div.removeClass("glyphicon-unchecked");
            check_div.addClass("glyphicon-check");
        }
        if (check_div.length == checked_div.length - 1) {
            check_div.attr("status", "0");
            check_div.removeClass("glyphicon-check");
            check_div.addClass("glyphicon-unchecked");
        }
    })

    //clear upload history
    $("#clear-upload-history").on("click", function () {
        $(".zone").removeClass("dz-started");
        $(".dz-complete").remove();
        $(".dz-image-preview").remove();
    });

    //moveto button binding
    $("#move-to-button").on("click", function () {
        var chekcedImage = $(".glyphicon-check");
        $("#selected-images-amount").html(chekcedImage.length - 1 + " images");
        simpleTreeInit(im_var.moveto_tree_name, false, true);
    });

    // $("#close-moveto-button").on("click", loadImageList);

    $("#move-trash-button").on("click", moveToTrash);

    $("#expand-all-button").on("click", function () {
        nodeExpandOperation(im_var.sidebar_tree_name, true);
    });
    $("#collapse-all-button").on("click", function () {
        nodeExpandOperation(im_var.sidebar_tree_name, false);
    });
    $("#expand-all-simple-tree-button").on("click", function () {
        nodeExpandOperation(im_var.moveto_tree_name, true);
    });
    $("#collapse-all-simple-tree-button").on("click", function () {
        nodeExpandOperation(im_var.moveto_tree_name, false);
    });
    $("#refresh-button").on("click", function () {
        refresh();
    });
    $("#edit-tree-button").on("click", function () {
        treeEditModeSwitcher(im_var.sidebar_tree_name, true);
        $("#view-tree-button").removeClass("hidden");
        $("#edit-tree-button").addClass("hidden");
    });
    $("#view-tree-button").on("click", function () {
        treeEditModeSwitcher(im_var.sidebar_tree_name, false);
        $("#view-tree-button").addClass("hidden");
        $("#edit-tree-button").removeClass("hidden");
    });

    $("#upload-button").on("click", function () {
        var fail = function () {
            popAlert({
                title: "<span style='color: #a94442;'>Upload failed</span>",
                content: "Please select a bottom directory before upload.",
                needConfirm: false
            })
        };

        var path_id = im_var.active_path_id;
        if (!path_id)
            fail();
        checkLeave(path_id, function () {
            $("#upload-modal").modal();
        }, fail);
    })

    $("#download-button").on("click", function () {
        download();
    })

    $("#confirm-moveto-button").on("click", function () {
        moveToPath();
    });

    //sort related button binding
    var sortButtonFunc = function () {
        //get current order type
        var orderType = $(this).data("order-type");
        //clear other sort type data
        $("button[name='sort-button']").find("span").attr("class", "");
        $("button[name='sort-button']").data("order-type", 0);
        $("button[name='sort-button']").removeClass("active");
        //set this button's style
        if (orderType != 2)
            $(this).addClass("active");
        //set the next sort type of the button
        var nextType = (orderType + 1) % 3;
        $(this).data("order-type", nextType);
        var cssClass = common_var.order_type[nextType].class;
        $(this).find("span").attr("class", cssClass);
        //call load image
        loadImageList();
    };
    $("#date-sort-button").on("click", sortButtonFunc);
    $("#name-sort-button").on("click", sortButtonFunc);
    $("#size-sort-button").on("click", sortButtonFunc);

    /************ search related *********/
    $("#search-button").on("click", loadImageList);
    //complete search
    var searchKey = $.getUrlParam('search_key');
    if (!!searchKey && searchKey != "") {
        $("#search-input").val(searchKey);
        $("#search-button").click();
    }
    //bind enter in search input
    $("#search-input").on("keyup", function (event) {
        if (event.key == "Enter")
            $("#search-button").click();
    });

    /*********** run loading ****************/
    //load images
    setTimeout(loadImageList, 0);

    /************ dropzone config ************/
    $("#dropzone").dropzone({
        url: "upload",
        addRemoveLinks: true,
        autoProcessQueue: false,
        dictRemoveFile: "Remove",
        dictCancelUpload: "Cancel",
        maxFiles: 1000,
        maxFilesize: 5,
        parallelUploads: 1000,
        acceptedFiles: ".jpg,.png,.bmp,.jpeg",
        init: function () {
            this.on("success", function (file) {
                console.log("File " + file.name + " uploaded")
            });
            this.on("removedfile", function (file) {
                console.log("File " + file.name + " removed");
            });
            var myDropZone = this;
            $("#confirm-upload").on("click", function () {
                myDropZone.processQueue();
                $(".dz-remove").remove();
            });
            myDropZone.on("queuecomplete", function () {
                refresh(null, loadImageList);
            });
        }
    });
});

/************************ image related operations **********************/
//load image list
function loadImageList() {
    //compatible to diff window size
    var winWidth = $(window).width();
    var titleLimit = 10;
    var titleWidth = "col-lg-9";
    var checkboxWidth = "col-lg-3";
    if (winWidth <= 1300 && winWidth > 768) {
        titleLimit = 8;
    }
    if (winWidth > 1600) {
        titleWidth = "col-lg-10";
        checkboxWidth = "col-lg-2";
        titleLimit = 16;
    }
    //post req
    $.ajax({
        type: "post",
        url: "get-image-list.json",
        dataType: "json",
        data: {
            dirId: im_var.active_path_id,
            sortType: common_var.sort_type[$("button[name='sort-button'].active").data("sort-type")],
            orderType: $("button[name='sort-button'].active").data("order-type"),
            searchKey: $("#search-input").val()
        },
        success: function (data) {
            if (data.success) {
                //show image list
                var imageList = data.list;
                $("#image-list").html("");
                $.each(imageList, function (idx, elem) {
                    var name = elem.img_name;
                    if (name.length > titleLimit) {
                        name = name.substring(0, titleLimit + 1) + "...";
                    }
                    var tooltip = "<p align='left'><br>title:&nbsp;&nbsp;<span class='tooltip-field-title'>"+elem.img_name+"</span><br>"+
                            "path:&nbsp;&nbsp;<span class='tooltip-field-title'>"+elem.path.substring(0,elem.path.length-1)+"</span><br>"+
                            "modified date:&nbsp;&nbsp;<span class='tooltip-field-title'>"+elem.oper_date.substring(0,10)+"</span><br>"+
                            "type:&nbsp;&nbsp;<span class='tooltip-field-title'>"+elem.format.substring(1)+"</span><br>"+
                            "size:&nbsp;&nbsp;<span class='tooltip-field-title'>"+elem.size+" MB</span></p>";
                    var html = '<li class="col-lg-2 col-md-3" style="list-style: none"><div class="card"><div class="card-image"><img class="img-responsive lazy" onerror="this.src=placeholder.getData({color:\'#fff\',text: \'Image 404\',size:\'555x300\'})" data-original="' + elem.url + '" data-original-thumbnail="' + elem.thumbnail_url + '" alt="' + elem.img_name + '"></a></div><div class="card-content row"><div class="col-lg-12 col-md-12"><div class="card-title-wrapper ' + titleWidth + ' col-md-8 col-xs-10"><span class="card-title" data-html="true" id=' + elem.id + ' data-toggle="tooltip" data-title="'+elem.img_name+'" title="'+tooltip+'">' + name + '</span></div><div class="' + checkboxWidth + ' col-md-4 col-md-2 no-padding"><span class="image-check glyphicon glyphicon-unchecked" aria-hidden="true" id=' + elem.id + ' status="0"></span></div></div></div></div></li>';
                    // var html =
                    //     '<li class="col-lg-2 col-md-3" style="list-style: none"><div class="card"><div class="card-image">' +
                    //     '<img class="img-responsive lazy" onerror="this.src=placeholder.getData({color:\'#fff\',text: \'Image 404\',size:\'555x300\'})" data-original="' + elem.url + '" data-original-thumbnail="' + elem.thumbnail_url + '" alt="' + elem.img_name + '"></a> ' +
                    //     '</div>' +
                    //     '<div class="card-content row">' +
                    //     '<div class="col-lg-12 col-md-12">' +
                    //     '<div class="' + titleWidth + ' col-md-8 col-xs-10">' +
                    //     '<span class="card-title" data-html="true" id=' + elem.id + ' data-toggle="tooltip" data-title="'+elem.img_name+'" title="'+tooltip+'">' + name + '</span>' +
                    //     '</div>' +
                    //     '<div class="' + checkboxWidth + ' col-md-4 col-md-2 no-padding">' +
                    //     '<span class="image-check glyphicon glyphicon-unchecked" aria-hidden="true" id=' + elem.id + ' status="0"></span>' +
                    //     '</div>' +
                    //     '</div>' +
                    //     '</div>' +
                    //     '</div>' +
                    //     ' </li>';
                    $("#image-list").append(html);
                });
                viewer_init();
                $("img.lazy").lazyload({
                    effect: "fadeIn",
                    threshold : 200
                });
                //edit name binding
                $(".card-title-wrapper").on("dblclick", function () {
                    renameImg($(this).find(".card-title"));
                });
                //checkbox binding
                $(".image-check").on("click", function () {
                    var check_div = $(this);
                    var checkStatus = check_div.attr("status");
                    if (!checkStatus || checkStatus == "0") { //not checked
                        check_div.attr("status", "1");
                        check_div.removeClass("glyphicon-unchecked");
                        check_div.addClass("glyphicon-check");
                    } else {
                        check_div.attr("status", "0");
                        check_div.removeClass("glyphicon-check");
                        check_div.addClass("glyphicon-unchecked");
                    }
                });
                //title tips
                $('[data-toggle="tooltip"]').tooltip();
            }
        },
        error: function (err) {
            console.error("get image list error!!!" + err);
        }
    });
}

//move images to trash
function moveToTrash() {
    var checkedImage = $(".glyphicon-check");
    //verification
    if (checkedImage.length == 1) {
        popAlert({
            title: "<span style='color: #a94442;'>Move to trash failed</span>",
            content: "There is no image has been selected.",
            needConfirm: false
        })
        return;
    }

    //delete confirmation
    popAlert({
        title: "<span style='color: #dc4154;'>Confirmation of deletion </span>",
        content: "Are you sure you want to delete the selected " + (checkedImage.length - 1) + " images?",
        needConfirm: true,
        needFooter: true,
        callback: function () {
            var imageIds = "";
            $.each(checkedImage, function (idx, data) {
                if ($(data).attr("status") == "1") {
                    imageIds += $(data).parent().parent().find(".card-title").attr("id") + "|";
                }
            });
            if (imageIds != "")
                imageIds = imageIds.substring(0, imageIds.length - 1);
            //post req
            $.ajax({
                type: "post",
                url: "moveToTrash",
                data: {
                    imageIds: imageIds
                },
                dataType: "json",
                success: function (data) {
                    if (data.success) {
                        refresh(null, loadImageList);
                    } else {
                        popAlert({
                            title: "<span style='color: #a94442;'>Move to trash failed</span>",
                            content: "Delete error.",
                            needConfirm: false
                        })
                    }
                },
                error: function (err) {
                    console.error("moveToTrasht error!!!" + err);
                }
            });
        }
    });
}

//move selected image to path
function moveToPath() {
    var checkedImage = $(".glyphicon-check");
    //verification
    if (checkedImage.length == 1) {
        popAlert({
            title: "<span style='color: #a94442;'>Move to path failed</span>",
            content: "There is no image has been selected.",
            needConfirm: false
        })
        return;
    }
    if (im_var.target_path_id == im_var.active_path_id) {
        popAlert({
            title: "<span style='color: #a94442;'>Move to path failed</span>",
            content: "Please select a target category different from current category.",
            needConfirm: false
        })
        return;
    }
    //get image ids
    var imageIds = "";
    $.each(checkedImage, function (idx, data) {
        if ($(data).attr("status") == "1") {
            imageIds += $(data).parent().parent().find(".card-title").attr("id") + "|";
        }
    });
    if (imageIds != "")
        imageIds = imageIds.substring(0, imageIds.length - 1);

    //post req
    $.ajax({
        type: "post",
        url: "moveToPath",
        data: {
            imageIds: imageIds,
            targetId: im_var.target_path_id
        },
        dataType: "json",
        success: function (data) {
            if (data.success) {
                refresh(im_var.target_path_id, loadImageList);
            } else {
                popAlert({
                    title: "<span style='color: #a94442;'>Move to path failed</span>",
                    content: data.err_msg,
                    needConfirm: false
                })
            }
        },
        error: function (err) {
            console.error("moveToTrash error!!!" + err);
        }
    });
}

function renameImg(targetDiv) {
    //tool method
    function editImgName(div, oldName) {
        var newName = $("#edit-title").val();
        div.html(oldName);
        if (newName == oldName) {
            return;
        }
        $.ajax({
            type: "post",
            url: "renameImage",
            data: {id: div.attr("id"), name: newName},
            dataType: "json",
            success: function (data) {
                if (data.success) {
                    loadImageList();
                } else {
                    console.error("rename error, the image name exists already under same dir!!!");
                    popAlert({
                        title: "<span style='color: #a94442;'>Rename image failed</span>",
                        content: "The name has already been take under this category.",
                        needConfirm: false
                    });
                    div.html(oldName);
                }
            },
            error: function (err) {
                console.error("renameImg error!!!", err);
            }
        });
    }

    //concat edit-title html
    var oldName = targetDiv.attr("data-title");
    var html = "<input type='text' id='edit-title' class='edit-title-input form-control' value='" + oldName + "'/>"
    targetDiv.html(html);
    $("#edit-title").focus();
    $("#edit-title").on("blur", function () {
        editImgName(targetDiv, oldName)
    });
    $("#edit-title").on("dblclick", function () {
        return false;
    });
    $("#edit-title").on("keyup", function (e) {
        if (e.keyCode == '13') {
            editImgName(targetDiv, oldName);
        }
        return false;
    });
}


/************************ tree related operations **********************/

//simple tree initializer
function simpleTreeInit(id, isActivateLoadImage, isMoveToTargetPath) {
    $("#" + id).fancytree({
            extensions: ["dnd", "glyph"],
            checkbox: false,
            dnd: {
                focusOnClick: true,
                dragStart: function (node, data) {
                    return true;
                },
                dragEnter: function (node, data) {
                    return false;
                },
                dragDrop: function (node, data) {
                    // data.otherNode.copyTo(node, data.hitMode);
                }
            },
            glyph: glyph_opts,
            selectMode: 2,
            source: {url: "getDirTree.json?isEdit=0"},
            toggleEffect: {effect: "drop", options: {direction: "right"}, duration: 400},
            activate: function (event, data) {
                var node = data.node;
                var oNodeKey = node.key; //original node key
                //trace full path of node
                var fullPath = "";
                while (node.parent != null) {
                    fullPath = node.title.substr(0, node.title.indexOf("&nbsp;&nbsp;")) + "/" + fullPath;
                    node = node.parent;
                }
                fullPath = "/" + fullPath.substr(0, fullPath.length - 1);

                //action according to config
                if (isMoveToTargetPath) {
                    $("#moveto-target-path-filling").html(fullPath);
                    im_var.target_path_id = oNodeKey;
                } else {
                    im_var.active_path_id = oNodeKey;
                    $("#upload-path-id").val(oNodeKey);
                    $("#current-path-showcase").html(fullPath);
                    $("#moveto-current-path-filling").html(fullPath);
                    $("#upload-path-filling").html(fullPath);
                    $("#upload-path").val(fullPath);
                }

                //clear search key and sort before loading image list under a path
                if (isActivateLoadImage) {
                    $("#search-input").val("");
                    var activeSortButton = $("button[name='sort-button'].active");
                    activeSortButton.find("span").attr("class", "");
                    activeSortButton.removeClass("active");
                    loadImageList();
                }
            },
            icon: function (event, data) {
                if (!data.node.isFolder()) {
                    return "glyphicon glyphicon-briefcase";
                }
            }
        }
    )
    ;
    return $("#" + id).fancytree("getTree");
}

//complex tree init
function complexTreeInit(id) {
    //Complex fancytree
    $("#" + id).fancytree({
        autoScroll: true, // Automatically scroll nodes into visible area
        checkbox: false,
        titlesTabbable: true,     // Add all node titles to TAB chain
        keyPathSeparator: "/",
        generateIds: true, // Generate id attributes like <span id='fancytree-id-KEY'>
        idPrefix: "fd-", // Used to generate node id´s like <span id='fancytree-id-<key>'>
        quicksearch: true,        // Jump to nodes when pressing first character
        // source: SOURCE,
        source: {url: "getDirTree.json?isEdit=1"},
        // toggleEffect: {effect: "drop", options: {direction: "right"}, duration: 400},
        extensions: ["edit", "dnd", "glyph"],

        dnd: {
            preventVoidMoves: true,
            preventRecursiveMoves: true,
            autoExpandMS: 400,
            dragStart: function (node, data) {
                return true;
            },
            dragEnter: function (node, data) {
                // return ["before", "after"];
                return true;
            },
            dragDrop: function (node, data) {
                // console.log(data.otherNode.title)
                // console.log(data.node.title)
                moveDir(data.node, data.otherNode, function () {
                    data.otherNode.moveTo(node, data.hitMode);
                });
            }
        },
        glyph: glyph_opts,
        edit: {
            triggerStart: ["f2", "shift+click", "mac+enter"],
            adjustWidthOfs: 20,
            beforeEdit: function (event, data) {
                console.log("test");
            },
            beforeClose: function (event, data) {
                console.log("test");
            },
            save: function (event, data) {
                var tree = $("#" + id).fancytree("getTree");

                // Save data.input.val() or return false to keep editor open
                console.log("save...", this, data);
                // Simulate to start a slow ajax request...
                setTimeout(function () {
                    // console.log(tree.getActiveNode().title);
                    // console.log(data.node.title);
                    // console.log(data.node.parent == tree.getActiveNode().parent);
                    if (data.isNew) {
                        if (data.node.parent == im_var.tree.getActiveNode().parent) {
                            //1.addSibDir
                            addSibDir(data.node);
                        }
                        else {
                            //2.addChildDir
                            addChildDir(im_var.tree.getActiveNode().key, data.node);
                        }
                    } else {
                        //3.editDirName
                        editDirName(data.node);
                    }
                }, 0);
                // We return true, so ext-edit will set the current user input
                // as title
                return true;
            },
            edit: function (event, data) {
                // Editor was opened (available as data.input)
                // console.log(data.input);
            }
        },
        activate: function (event, data) {
            // var node = data.node;
            // var fullPath = "";
            // while (node.parent != null) {
            //     fullPath = node.title + "/" + fullPath;
            //     node = node.parent;
            // }
            // fullPath = "/" + fullPath.substring(0, fullPath.length - 1);
            //
            // $("#current-path-showcase").html(fullPath);
            // $("#moveto-current-path-filling").html(fullPath);
            // $("#upload-path-filling").html(fullPath);
            // $("#upload-path").html(fullPath);
        },
        lazyLoad: function (event, data) {
            data.result = {url: "ajax-sub2.json"};
        },
        createNode: function (event, data) {
        },
        icon: function (event, data) {
            if (!data.node.isFolder()) {
                return "glyphicon glyphicon-briefcase";
            }
        }
    }).on("nodeCommand", function (event, data) {
        // Custom event handler that is triggered by keydown-handler and
        // context menu:
        var refNode, moveMode,
            tree = $(this).fancytree("getTree"),
            node = tree.getActiveNode();
        switch (data.cmd) {
            case "moveUp":
                refNode = node.getPrevSibling();
                if (refNode) {
                    node.moveTo(refNode, "before");
                    node.setActive();
                }
                break;
            case "moveDown":
                refNode = node.getNextSibling();
                if (refNode) {
                    node.moveTo(refNode, "after");
                    node.setActive();
                }
                break;
            case "indent":
                refNode = node.getPrevSibling();
                if (refNode) {
                    node.moveTo(refNode, "child");
                    refNode.setExpanded();
                    node.setActive();
                }
                break;
            case "outdent":
                if (!node.isTopLevel()) {
                    node.moveTo(node.getParent(), "after");
                    node.setActive();
                }
                break;
            case "rename":
                node.editStart();
                break;
            case "remove":
                delDir(node
                    //     , function(){
                    //     refNode = node.getNextSibling() || node.getPrevSibling() || node.getParent();
                    //     node.remove();
                    //     if (refNode) {
                    //         refNode.setActive();
                    //     }
                    // }
                );
                break;
            case "addChild":
                node.editCreateNode("child", "");
                break;
            case "addSibling":
                node.editCreateNode("after", "");
                break;
            case "cut":
                im_var.CLIPBOARD = {mode: data.cmd, data: node};
                break;
            // case "copy":
            //     im_var.CLIPBOARD = {
            //         mode: data.cmd,
            //         data: node.toDict(function (n) {
            //             delete n.key;
            //         })
            //     };
            //     break;
            case "clear":
                im_var.CLIPBOARD = null;
                break;
            case "paste":
                if (im_var.CLIPBOARD.mode === "cut") {
                    // refNode = node.getPrevSibling();
                    moveDir(node, im_var.CLIPBOARD.data, function () {
                        im_var.CLIPBOARD.data.moveTo(node, "child");
                        im_var.CLIPBOARD.data.setActive();
                    });

                }
                // else if (im_var.CLIPBOARD.mode === "copy") {
                //     copyDir(node,im_var.CLIPBOARD.data,function(){
                //         node.addChildren(im_var.CLIPBOARD.data).setActive();
                //     });
                // }
                break;
            default:
                alert("Unhandled command: " + data.cmd);
                return;
        }

        // }).on("click dblclick", function(e){
        //   console.log( e, $.ui.fancytree.eventToString(e) );

    }).on("keydown", function (e) {
        var cmd = null;

        // console.log(e.type, $.ui.fancytree.eventToString(e));
        switch ($.ui.fancytree.eventToString(e)) {
            case "ctrl+shift+n":
            case "meta+shift+n": // mac: cmd+shift+n
                cmd = "addChild";
                break;
            case "ctrl+c":
            case "meta+c": // mac
                cmd = "copy";
                break;
            case "ctrl+v":
            case "meta+v": // mac
                cmd = "paste";
                break;
            case "ctrl+x":
            case "meta+x": // mac
                cmd = "cut";
                break;
            case "ctrl+n":
            case "meta+n": // mac
                cmd = "addSibling";
                break;
            case "del":
            case "meta+backspace": // mac
                cmd = "remove";
                break;
            case "f2":  // already triggered by ext-edit pluging
                cmd = "rename";
                break;
            case "ctrl+up":
                cmd = "moveUp";
                break;
            case "ctrl+down":
                cmd = "moveDown";
                break;
            case "ctrl+right":
            case "ctrl+shift+right": // mac
                cmd = "indent";
                break;
            case "ctrl+left":
            case "ctrl+shift+left": // mac
                cmd = "outdent";
        }
        if (cmd) {
            $(this).trigger("nodeCommand", {cmd: cmd});
            // e.preventDefault();
            // e.stopPropagation();
            return false;
        }
    });

    /*
     * Tooltips
     */
    // $("#tree").tooltip({
    //   content: function () {
    //     return $(this).attr("title");
    //   }
    // });

    /*
     * Context menu (https://github.com/mar10/jquery-ui-contextmenu)
     */
    $("#" + id).contextmenu({
        delegate: "span.fancytree-node",
        menu: [
            {title: "Edit <kbd>[F2]</kbd>", cmd: "rename", uiIcon: "ui-icon-pencil"},
            {title: "Delete <kbd>[Del]</kbd>", cmd: "remove", uiIcon: "ui-icon-trash"},
            {title: "----"},
            {title: "New sibling <kbd>[Ctrl+N]</kbd>", cmd: "addSibling", uiIcon: "ui-icon-plus"},
            {title: "New child <kbd>[Ctrl+Shift+N]</kbd>", cmd: "addChild", uiIcon: "ui-icon-arrowreturn-1-e"},
            {title: "----"},
            {title: "Cut <kbd>Ctrl+X</kbd>", cmd: "cut", uiIcon: "ui-icon-scissors"},
            // {title: "Copy <kbd>Ctrl-C</kbd>", cmd: "copy", uiIcon: "ui-icon-copy"},
            {title: "Paste as child<kbd>Ctrl+V</kbd>", cmd: "paste", uiIcon: "ui-icon-clipboard", disabled: true}
        ],
        beforeOpen: function (event, ui) {
            var node = $.ui.fancytree.getNode(ui.target);
            $("#" + id).contextmenu("enableEntry", "paste", !!im_var.CLIPBOARD);
            node.setActive();
        },
        select: function (event, ui) {
            var that = this;
            // delay the event, so the menu can close and the click event does
            // not interfere with the edit control
            setTimeout(function () {
                $(that).trigger("nodeCommand", {cmd: ui.cmd});
            }, 100);
        }
    });

    return $("#" + id).fancytree("getTree");
}

/**
 * expand operation switcher
 * @param id - tree id
 * @param mode - true~expand all; false~collpase all
 */
function nodeExpandOperation(id, mode) {
    $("#" + id).fancytree("getRootNode").visit(function (node) {
        node.setExpanded(mode);
    });
}

/**
 * tree editing switcher
 * @param mode - true~edit mode; false~view mode
 */
function treeEditModeSwitcher(id, mode) {
    $("#" + id).fancytree("destroy");

    var title = "";
    if (mode) {
        title = $(".tree-title").html().replace("[View]", "[Edit]");
        im_var.tree = complexTreeInit(id);
        $(".container-fluid").block({
            message: "",
            overlayCSS: {
                opacity: 0.3,
                cursor: "no-drop"
            }
        });
    } else {
        $("#" + id).contextmenu('destroy');
        title = $(".tree-title").html().replace("[Edit]", "[View]");
        im_var.tree = simpleTreeInit(id, true, false);
        $(".container-fluid").unblock();
    }
    $(".tree-title").html(title);

}

/************************** directory management ajax (related to tree operation)******/
function addSibDir(node) {
    console.log("addSibDir");
    if (node.title.length <= 0)
        return false;
    var prevNode = im_var.tree.getActiveNode();
    $.ajax({
        type: "post",
        url: "addDir",
        data: {
            parentId: node.parent.key,
            title: node.title.trim()
        },
        dataType: "json",
        success: function (data) {
            if (data.success) {
                //reload the im_var.tree and expand the previous node
                im_var.tree.reload().then(function () {
                    var node = im_var.tree.getNodeByKey('' + data.insertId);
                    node.setActive(true);
                    while (node.parent != null) {
                        node.setExpanded(true);
                        node = node.parent;
                    }
                });
            } else {
                console.error("addSibDir failed!!!");
                popAlert({
                    title: "<span style='color: #a94442;'>Add sibling directory failed</span>",
                    content: "The sibling with the same name has already existed.",
                    needConfirm: false
                });
                im_var.tree.reload().then(function () {
                    var node = im_var.tree.getNodeByKey('' + prevNode.key);
                    node.setActive(true);
                    while (node.parent != null) {
                        node.setExpanded(true);
                        node = node.parent;
                    }
                });
            }
        },
        error: function (err) {
            console.error("addSibDir error!!!", err);
        }
    });
}
function addChildDir(parentKey, node) {
    console.log("addChildDir");
    $.ajax({
        type: "post",
        url: "addDir",
        data: {
            parentId: parentKey,
            title: node.title.trim()
        },
        dataType: "json",
        success: function (data) {
            if (data.success) {
                //reload the im_var.tree and expand the previous node
                im_var.tree.reload().then(function () {
                    var node = im_var.tree.getNodeByKey('' + data.insertId);
                    node.setActive(true);
                    while (node.parent != null) {
                        node.setExpanded(true);
                        node = node.parent;
                    }
                });
            } else {
                console.error("addChildDir failed!!!");
                popAlert({
                    title: "<span style='color: #a94442;'>Add child directory failed</span>",
                    content: "There are images under the selected directory; or the name has already been taken.",
                    needConfirm: false
                });
                im_var.tree.reload().then(function () {
                    var node = im_var.tree.getNodeByKey('' + parentKey);
                    node.setActive(true);
                    while (node.parent != null) {
                        node.setExpanded(true);
                        node = node.parent;
                    }
                });
            }
        },
        error: function (err) {
            console.error("addChildDir error!!!", err);
        }
    });
}
function editDirName(node) {
    console.log("editDirName");
    var key = '' + node.key;
    $.ajax({
        type: "post",
        url: "editDirName",
        data: {
            id: node.key,
            title: node.title.trim()
        },
        dataType: "json",
        success: function (data) {
            if (data.success) {
                //reload the im_var.tree and expand the previous node
                im_var.tree.reload().then(function () {
                    var node = im_var.tree.getNodeByKey(key);
                    node.setActive(true);
                    while (node.parent != null) {
                        node.setExpanded(true);
                        node = node.parent;
                    }
                });
            } else {
                console.error("editDirName failed!!!");
                popAlert({
                    title: "<span style='color: #a94442;'>Edit name failed</span>",
                    content: "The name has been taken under the current directory.",
                    needConfirm: false
                });
                im_var.tree.reload().then(function () {
                    var node = im_var.tree.getNodeByKey('' + key);
                    node.setActive(true);
                    while (node.parent != null) {
                        node.setExpanded(true);
                        node = node.parent;
                    }
                });
            }
        },
        error: function (err) {
            console.error("editDirName error!!!", err);
        }
    });
}
function moveDir(parentNode, curNode) {
    $.ajax({
        type: "post",
        url: "moveDir",
        data: {
            parentId: parentNode.key,
            id: curNode.key,
            title: curNode.title
        },
        dataType: "json",
        success: function (data) {
            if (data.success) {
                //reload the im_var.tree and expand the previous node
                im_var.tree.reload().then(function () {
                    var node = im_var.tree.getNodeByKey('' + curNode.key);
                    node.setActive(true);
                    while (node.parent != null) {
                        node.setExpanded(true);
                        node = node.parent;
                    }
                });
            } else {
                console.error("moveDir failed!!!");
                popAlert({
                    title: "<span style='color: #a94442;'>Move directory failed</span>",
                    content: "There are images under the target directory. You can only move the current directory to a directory without images in it.",
                    needConfirm: false
                });
                im_var.tree.reload().then(function () {
                    var node = im_var.tree.getNodeByKey('' + curNode.key);
                    node.setActive(true);
                    while (node.parent != null) {
                        node.setExpanded(true);
                        node = node.parent;
                    }
                });
            }
        },
        error: function (err) {
            console.error("moveDir error!!!", err);
        }
    });
}
function delDir(node, done) {
    var prevNode = node;
    $.ajax({
        type: "post",
        url: "delDir",
        data: {
            id: node.key
        },
        dataType: "json",
        success: function (data) {
            if (data.success) {
                //reload the im_var.tree and expand the previous node
                im_var.tree.reload().then(function () {
                    var node = im_var.tree.getNodeByKey('' + prevNode.parent.key);
                    node.setActive(true);
                    while (node.parent != null) {
                        node.setExpanded(true);
                        node = node.parent;
                    }
                });
            } else {
                console.error("delDir failed!!!");
                popAlert({
                    title: "<span style='color: #a94442;'>Delete directory failed</span>",
                    content: "There are images under this directory.",
                    needConfirm: false
                });
            }
        },
        error: function (err) {
            console.error("delDir error!!!", err);
        }
    });
}
function getDirTree() {
    $.ajax({
        type: "get",
        url: "getDirTree",
        data: {},
        dataType: "json",
        success: function (data) {
            if (data.success) {
                //reload the im_var.tree and expand the previous node
                console.log(data.dir_tree);
            } else {
                console.error("getDirTree failed!!!");
            }
        },
        error: function (err) {
            console.error("getDirTree error!!!", err);
        }
    });
}
function refresh(id, callback) {
    $.ajax({
        type: "get",
        url: "refresh",
        data: {},
        dataType: "json",
        success: function (data) {
            if (data.success) {
                var key;
                if (!!im_var.tree.getActiveNode()) {
                    key = im_var.tree.getActiveNode().key;
                }
                if (!!id) {
                    key = id;
                }
                im_var.tree.reload().then(function () {
                    if (!!key) {
                        var node = im_var.tree.getNodeByKey('' + key);
                        node.setActive(true);
                        while (node.parent != null) {
                            node.setExpanded(true);
                            node = node.parent;
                        }
                    }
                    if (!!callback)
                        callback();
                });
            } else {
                console.error("refresh failed!!!");
            }
        },
        error: function (err) {
            console.error("refresh error!!!", err);
        }
    });
}
function checkLeave(id, done, fail) {
    $.ajax({
        type: "post",
        url: "checkLeave",
        data: {id: id},
        dataType: "json",
        success: function (data) {
            if (data.success) {
                done();
            } else {
                console.error("Id " + id + " is not a leave, open upload modal failed!!!");
                fail();
            }
        },
        error: function (err) {
            console.error("checkLeave error!!!", err);
        }
    });
}
function download() {
    if (!im_var.active_path_id) {
        popAlert({
            title: "<span style='color: #a94442;'>Download failed</span>",
            content: "Please select a directory before download.",
            needConfirm: false
        });
    } else {
        window.open("/download?id=" + im_var.active_path_id);
    }
}

/*********************** image view plugin init ************************/
function viewer_init() {

    'use strict';

    var console = window.console || {
            log: function () {
            }
        };
    var $images = $('#image-list');
    $images.viewer('destroy');
    var options = {
        // inline: true,
        url: 'data-original',
        build: function (e) {
            console.log(e.type);
        },
        built: function (e) {
            console.log(e.type);
        },
        show: function (e) {
            console.log(e.type);
        },
        shown: function (e) {
            console.log(e.type);
        },
        hide: function (e) {
            console.log(e.type);
        },
        hidden: function (e) {
            console.log(e.type);
        },
        view: function (e) {
            console.log(e.type);
        },
        viewed: function (e) {
            console.log(e.type);
        }
    };

    $images.on({
        'build.viewer': function (e) {
            console.log(e.type);
        },
        'built.viewer': function (e) {
            console.log(e.type);
        },
        'show.viewer': function (e) {
            console.log(e.type);
        },
        'shown.viewer': function (e) {
            console.log(e.type);
        },
        'hide.viewer': function (e) {
            console.log(e.type);
        },
        'hidden.viewer': function (e) {
            console.log(e.type);
        },
        'view.viewer': function (e) {
            console.log(e.type);
        },
        'viewed.viewer': function (e) {
            console.log(e.type);
        }
    }).viewer(options);


};

