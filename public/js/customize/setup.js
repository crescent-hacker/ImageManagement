/**
 * Created by Chendf on 2014/9/17.
 */
$.ajaxSetup({
    dataFilter: function (data, type) {
        var dataJson;
        try {//JSON解释错误转到错误页面
            dataJson = eval('(' + data + ')');
        } catch (e) {
            console.log("json parse error!");
        }
        if (!dataJson) {//正常返回
            window.location.href = "/login";
            return "{success:false}";
        }
        else {//code存在，登陆超时或权限错误
            return data;
        }
    }
})