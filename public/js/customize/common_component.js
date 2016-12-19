function popAlert(config) {
    var title;
    var content;
    var needConfirm;
    var callback;
    var needFooter;
    if (!!config) {
        //init params from config
        title = config.title || "";
        content = config.content || "";
        needFooter = config.needFooter || false;
        needConfirm = config.needConfirm || false;
        callback = config.callback || undefined;

        //put config into html
        $("#alert-title").html(title);
        $("#alert-content").html(content);
        var alertButton = $("#alert-confirm-button");
        var footer = $("#alert-modal").find(".modal-footer");
        if (needFooter) {
            if (needConfirm) {
                alertButton.on("click", function () {
                    $("#alert-modal").modal('hide');
                    callback();
                });
                alertButton.show();
            } else {
                alertButton.hide();
            }
            footer.show();
        }else{
            footer.hide();
        }
        $('#alert-modal').modal();
    }
}