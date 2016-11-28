var mysql = require('mysql');

// config/database.js
var dbconfig = {
    'connection': {
        'host': 'database host',
        'user': 'username',
        'password': 'password'
    },
    'database': 'image_management'
};
var connection = mysql.createConnection(dbconfig.connection);
connection.query('USE ' + dbconfig.database);

module.exports = connection;
