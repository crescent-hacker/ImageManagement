$(document).ready(function(){
    var search_input = $("#search-input");
    var search_button = $("#search-input-button");
    //init search input
    var height = $(window).height();
    search_input.css("margin-top",height/2-50);
    search_button.css("margin-top",height/2-50);
    search_input.show();
    search_button.show();
    //focus
    search_input.focus();
    //enter binding
    search_input.on("keyup",function(event){
        if(event.keyCode == 13){
            window.location.href="image_management?search_key="+search_input.val();
        }
    });
    search_button.on("click",function () {
        window.location.href="image_management?search_key="+search_input.val();
    });

});