var fs = require('fs');

//define variables
var common_variables = {
    'image_root_path': '',
    'thumbnail_root_path': '',
    'trash_root_path': '',
    'trash_thumbnail_root_path': '',
    'session_key':{
        'dir_tree':'dir_tree',
        'dir_tree_records':'dir_tree_records'
    }
};

fs.realpath('resource', function (err, resolvedPath) {
    if (err) {
        throw err;
    }
    common_variables.image_root_path = resolvedPath+"/images/";
    common_variables.thumbnail_root_path = resolvedPath+"/images/thumbnail/";
    common_variables.trash_root_path = resolvedPath+"/trash-images/";
    common_variables.trash_thumbnail_root_path = resolvedPath+"/trash-images/thumbnail/";
});


module.exports = common_variables;
