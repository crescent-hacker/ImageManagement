var mysql = require('mysql');

var db    = {};
var mysql = require('mysql');
var pool  = mysql.createPool({
    connectionLimit : 400,
    host            : 'localhost',
    database        : 'image_management',
    user            : 'input your username',
    password        : 'input your password'
});

//get connection from the pool
db.getConnection = function(callback){
    pool.getConnection(function(err, connection) {
        if (err) {
            callback(null);
            return;
        }
        callback(connection);
    });
};

module.exports = db;
