$(document).ready(function(){
    //top nav active
    var page_id = $("body").attr("page");
    $("#"+page_id).addClass("active");

    //toggle sidebar
    $("#sidebar-toggle-button").on("click",function(){
        var left = $("#resize-nav-bar").css("left");
        if(left.substring(0,left.length-2) > 0){
            $("#resize-nav-bar").css("left",-$("#resize-nav-bar").width()+"px");
            $(".wrapper").css("padding-left", 0);
        }else{
            $("#resize-nav-bar").css("left",$("#resize-nav-bar").width()+"px");
            $(".wrapper").css("padding-left", $("#resize-nav-bar").width());
        }
    })
});