var tool = {};
module.exports = tool;

//tool method - count char
tool.countChar = function(str, ch) {
    var count = 0;
    for (var i = 0; i < str.length; i++) {
        if (str.charAt(i) == ch)
            count++;
    }
    return count;
}

tool.visitTree = function(tree,action,done){
    function visit(tree,callback) {
        if (tree.length == 0)
            return;
        for (var i = 0; i < tree.length; i++) {
            callback(tree[i]);
            visit(tree[i].children, callback);
        }
    }
    visit(tree,action);
    done(tree);
}

tool.compareByName = function (a, b) {
    return a.title > b.title;
};


var matchHtmlRegExp = /["'&/\\<>]/;


tool.escapeHtml = function(string){
    var str = '' + string;
    var match = matchHtmlRegExp.exec(str);

    if (!match) {
        return str;
    }

    var escape;
    var html = '';
    var index = 0;
    var lastIndex = 0;

    for (index = match.index; index < str.length; index++) {
        switch (str.charCodeAt(index)) {
            case 34: // "
                escape = '';
                break;
            case 38: // &
                escape = '';
                break;
            case 39: // '
                escape = '';
                break;
            case 47: // /
                escape = '';
                break;
            case 60: // <
                escape = '';
                break;
            case 62: // >
                escape = '';
                break;
            case 92: // >
                escape = '';
                break;
            default:
                continue;
        }

        if (lastIndex !== index) {
            html += str.substring(lastIndex, index);
        }

        lastIndex = index + 1;
        html += escape;
    }

    return lastIndex !== index
        ? html + str.substring(lastIndex, index)
        : html;
}
