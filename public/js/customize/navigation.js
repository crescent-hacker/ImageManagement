$(document).ready(function(){
    //top nav active
    var page_id = $("body").attr("page");
    $("#"+page_id).addClass("active");

    //toggle sidebar
    $("#sidebar-toggle-button").on("click",function(){
        var left = $("#resize-nav-bar").css("left");
        if(left != "0px"){
            $("#resize-nav-bar").css("left","0px");
            $("#wrapper").css("padding-left", 0);
        }else{
            $("#resize-nav-bar").css("left","225px");
            $("#wrapper").css("padding-left", $("#resize-nav-bar").width());
        }
    })
});