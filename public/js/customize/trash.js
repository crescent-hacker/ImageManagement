<!-- Add code to initialize the tree when the document is loaded: -->
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

//init
$(function () {
    //init directory tree
    simpleTreeInit("tree");

    //set action to resize event of sidebar
    $("#resize-nav-bar").resizable({
        resize: function (event, ui) {
            var width = ui.size.width;
            var min_width = parseInt($(".side-nav").css("min-width").replace("px", ""));
            var max_width = parseInt($(".side-nav").css("max-width").replace("px", ""));
            if (width > max_width)
                width = max_width;
            if (width < min_width)
                width = min_width;
            $("#wrapper").css("padding-left", width);
        },
        handles: 'e, w'
    });

    //set sidebar height
    var sidebar_height = $("#resize-nav-bar").height() - $("#tree-header").height() - parseInt($("#tree").css("margin-top").replace("px", ""));
    $(".fancytree-container").height(sidebar_height);

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

    //moveto button binding
    $("#move-to-button").on("click", function () {
        simpleTreeInit("simple-tree");
    });

    //load images
    loadTrashList();

    //load image list when resize window
    $(window).resize(function () {
        loadTrashList();
    });

    //put back button
    $("#put-back-button").on("click", putBack);

    //destroy button
    $("#destroy-button").on("click",destroyImages);
});


//load image list
function loadTrashList() {
    var winWidth = $(window).width();
    var titleLimit = 10;
    var titleWidth = "col-lg-9";
    var checkboxWidth = "col-lg-3";
    if (winWidth <= 1300 && winWidth > 768) {
        titleLimit = 8;
    }
    if (winWidth > 1600) {
        var titleWidth = "col-lg-10";
        var checkboxWidth = "col-lg-2";
        titleLimit = 16;
    }
    $.ajax({
        type: "get",
        url: "get-trash-image-list.json",
        dataType: "json",
        success: function (data) {
            if (data.success) {
                //show image list
                var thumbnailList = data.thumbnailList;
                var imageList = data.imageList;
                var imageNames = data.imageNames;
                $("#image-list").html("");
                $.each(thumbnailList, function (idx, elem) {
                    var name = imageNames[idx];
                    if (imageNames[idx].length > titleLimit) {
                        name = imageNames[idx].substring(0, titleLimit + 1) + "...";
                    }
                    var html = '<div class="col-lg-2 col-md-3"><div class="card"><div class="card-image"><a href="' + imageList[idx] + '" data-toggle="lightbox"><img class="img-responsive" src="' + thumbnailList[idx] + '"></a> </div>             ' +
                        '<div class="card-content row"><div class="col-lg-12 col-md-12"><div class="' + titleWidth + ' col-md-8 col-xs-10"><span class="card-title" data-toggle="tooltip" title="' + imageNames[idx] + '">' + name + '</span></div><div class="' + checkboxWidth + ' col-md-4 col-md-2 no-padding"><span class="image-check glyphicon glyphicon-unchecked" aria-hidden="true" status="0"></span></div></div></div>'
                    '</div> </div>';
                    $("#image-list").append(html);
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

//put back
function putBack() {
    var chekcedImage = $(".glyphicon-check");
    var imageIds = "";
    $.each(chekcedImage, function (idx, data) {
        if ($(data).attr("status") == "1") {
            imageIds+=$(data).parent().parent().find(".card-title").attr("data-original-title")+"|";
        }
    });
    if(imageIds!="")
        imageIds = imageIds.substring(0,imageIds.length-1);
    //post req
    $.ajax({
        type: "post",
        url: "putBack",
        data:{
            imageIds:imageIds
        },
        dataType: "json",
        success: function (data) {
            if(data.success)
                loadTrashList()
        },
        error: function (err) {
            console.error("putBack error!!!" + err);
        }
    })
}

//destroy
function destroyImages() {
    var chekcedImage = $(".glyphicon-check");
    var imageIds = "";
    $.each(chekcedImage, function (idx, data) {
        if ($(data).attr("status") == "1") {
            imageIds+=$(data).parent().parent().find(".card-title").attr("data-original-title")+"|";
        }
    });
    if(imageIds!="")
        imageIds = imageIds.substring(0,imageIds.length-1);
    //post req
    $.ajax({
        type: "post",
        url: "destroyImages",
        data:{
            imageIds:imageIds
        },
        dataType: "json",
        success: function (data) {
            if(data.success)
                loadTrashList()
        },
        error: function (err) {
            console.error("destroyImages error!!!" + err);
        }
    })
}

//simple tree initializer
function simpleTreeInit(id) {
    $("#" + id).fancytree({
        extensions: ["dnd", "edit", "glyph", "wide"],
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
                data.otherNode.copyTo(node, data.hitMode);
            }
        },
        glyph: glyph_opts,
        selectMode: 2,
        source: {url: "ajax-tree-taxonomy.json", debugDelay: 1000},
        toggleEffect: {effect: "drop", options: {direction: "left"}, duration: 400},
        wide: {
            iconWidth: "1em",     // Adjust this if @fancy-icon-width != "16px"
            iconSpacing: "0.5em", // Adjust this if @fancy-icon-spacing != "3px"
            levelOfs: "1.5em"     // Adjust this if ul padding != "16px"
        },
        activate: function (event, data) {
            var node = data.node;
            var fullPath = "";
            while (node.parent != null) {
                fullPath = node.title + "/" + fullPath;
                node = node.parent;
            }
            fullPath = "/" + fullPath.substring(0, fullPath.length - 1);
            if (id == "tree") {
                $("#current-path-showcase").html(fullPath);
                $("#moveto-current-path-filling").html(fullPath);
            }else{
                $("#moveto-target-path-filling").html(fullPath);
            }

        },
        icon: function (event, data) {
            if (!data.node.isFolder()) {
                return "glyphicon glyphicon-picture";
            }
        },
        lazyLoad: function (event, data) {
            data.result = {url: "ajax-sub2.json", debugDelay: 1000};
        }
    });
}
