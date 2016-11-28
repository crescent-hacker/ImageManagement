var connection = require("../infrastructure/database");
var logger =  require("../infrastructure/logger")('normal');

// expose this function to our app using module.exports
var dao = module.exports;

dao.test = function(done){
    var sql = "SELECT * FROM IMAGE";
    connection.query(sql,function(err,result){
        if(err){
            logger.error(err);
            return done(false);
        }
        logger.info(result[0].id);
        logger.info(result[0].name);
        return done(true);
    });
};

dao.test(function(result){logger.info(result)});