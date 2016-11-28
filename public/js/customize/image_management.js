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
var CLIPBOARD = null;

//init
$(function () {
    //init directory tree
    complexTreeInit("tree");

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
    //resize-nav-bar height setting
    if($(window).width()<742){
        $("#resize-nav-bar").css("z-index",9999);
        $("#resize-nav-bar").css("height",$(window).height());

    }
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

    //clear upload history
    $("#clear-upload-history").on("click", function () {
        $(".dropzone").removeClass("dz-started");
        $(".dz-complete").remove();
    });

    //upload button onclick binding
    $("#upload-button").on("click", function () {
        var upload_path = $(".fancytree-active").find(".fancytree-title").html();
        $("#upload-path-filling").html(upload_path);
    });
    $("#upload-modal").on("blur",loadImageList);

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
    loadImageList();

    //load image list when resize window
    $(window).resize(function () {
        loadImageList();
    });
    $("#close-moveto-button").on("click", loadImageList);

    //move to trash button
    $("#move-trash-button").on("click", moveToTrash);

    //complete search
    var searchKey = $.getUrlParam('search_key');
    $("#search-input").val(searchKey);
    $("#search-button").click();
});


//load image list
function loadImageList() {
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
        url: "get-image-list.json",
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
                //edit name binding
                $(".card-title").on("dblclick", function () {
                    //tool method
                    function editName(titleLimit, div) {
                        var edit_html = $("#edit-title").val();
                        div.attr("data-original-title", edit_html);
                        if (edit_html.length > titleLimit)
                            div.html(edit_html.substring(0, titleLimit + 1) + "...");
                        else
                            div.html(edit_html);
                    }

                    //concat edit-title html
                    var html = "<input type='text' id='edit-title' class='edit-title-input form-control' value='" + $(this).attr("data-original-title") + "'/>"
                    var div = $(this);
                    div.html(html);
                    $("#edit-title").focus();
                    $("#edit-title").on("blur", function () {
                        editName(titleLimit, div)
                    });
                    $("#edit-title").on("dblclick", function () {
                        return false;
                    });
                    $("#edit-title").on("keyup", function (e) {
                        if (e.keyCode == '13') {
                            editName(titleLimit, div);
                        }
                        return false;
                    });
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
        url: "moveToTrash",
        data:{
            imageIds:imageIds
        },
        dataType: "json",
        success: function (data) {
            if(data.success)
                loadImageList()
        },
        error: function (err) {
            console.error("moveToTrasht error!!!" + err);
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

            $("#moveto-target-path-filling").html(fullPath);

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


//complex tree init
function complexTreeInit(id) {
    //Complex fancytree
    $("#" + id).fancytree({
        checkbox: false,
        titlesTabbable: true,     // Add all node titles to TAB chain
        quicksearch: true,        // Jump to nodes when pressing first character
        // source: SOURCE,
        source: {url: "ajax-tree-taxonomy.json"},

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
                data.otherNode.moveTo(node, data.hitMode);
            }
        },
        glyph: glyph_opts,
        edit: {
            triggerStart: ["f2", "shift+click", "mac+enter"],
            close: function (event, data) {
                if (data.save && data.isNew) {
                    // Quick-enter: add new nodes until we hit [enter] on an empty title
                    $("#" + id).trigger("nodeCommand", {cmd: "addSibling"});
                }
            }
        },
        activate: function (event, data) {
            var node = data.node;
            var fullPath = "";
            while (node.parent != null) {
                fullPath = node.title + "/" + fullPath;
                node = node.parent;
            }
            fullPath = "/" + fullPath.substring(0, fullPath.length - 1);

            $("#current-path-showcase").html(fullPath);
            $("#moveto-current-path-filling").html(fullPath);

        },
        lazyLoad: function (event, data) {
            data.result = {url: "ajax-sub2.json"};
        },
        createNode: function (event, data) {
            var node = data.node,
                $tdList = $(node.tr).find(">td");

            // Span the remaining columns if it's a folder.
            // We can do this in createNode instead of renderColumns, because
            // the `isFolder` status is unlikely to change later
            if (node.isFolder()) {
                $tdList.eq(2)
                    .prop("colspan", 6)
                    .nextAll().remove();
            }
        },
        renderColumns: function (event, data) {
            var node = data.node,
                $tdList = $(node.tr).find(">td");

            // (Index #0 is rendered by fancytree by adding the checkbox)
            // Set column #1 info from node data:
            $tdList.eq(1).text(node.getIndexHier());
            // (Index #2 is rendered by fancytree)
            // Set column #3 info from node data:
            $tdList.eq(3).find("input").val(node.key);
            $tdList.eq(4).find("input").val(node.data.foo);

            // Static markup (more efficiently defined as html row template):
            // $tdList.eq(3).html("<input type='input' value='" + "" + "'>");
            // ...
        },
        icon:function(event,data){
            if (!data.node.isFolder()) {
                return "glyphicon glyphicon-picture";
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
                refNode = node.getNextSibling() || node.getPrevSibling() || node.getParent();
                node.remove();
                if (refNode) {
                    refNode.setActive();
                }
                break;
            case "addChild":
                node.editCreateNode("child", "");
                break;
            case "addSibling":
                node.editCreateNode("after", "");
                break;
            case "cut":
                CLIPBOARD = {mode: data.cmd, data: node};
                break;
            case "copy":
                CLIPBOARD = {
                    mode: data.cmd,
                    data: node.toDict(function (n) {
                        delete n.key;
                    })
                };
                break;
            case "clear":
                CLIPBOARD = null;
                break;
            case "paste":
                if (CLIPBOARD.mode === "cut") {
                    // refNode = node.getPrevSibling();
                    CLIPBOARD.data.moveTo(node, "child");
                    CLIPBOARD.data.setActive();
                } else if (CLIPBOARD.mode === "copy") {
                    node.addChildren(CLIPBOARD.data).setActive();
                }
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
            // case "f2":  // already triggered by ext-edit pluging
            //   cmd = "rename";
            //   break;
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
            {title: "Copy <kbd>Ctrl-C</kbd>", cmd: "copy", uiIcon: "ui-icon-copy"},
            {title: "Paste as child<kbd>Ctrl+V</kbd>", cmd: "paste", uiIcon: "ui-icon-clipboard", disabled: true}
        ],
        beforeOpen: function (event, ui) {
            var node = $.ui.fancytree.getNode(ui.target);
            $("#" + id).contextmenu("enableEntry", "paste", !!CLIPBOARD);
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
}