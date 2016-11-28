var log4js = require("log4js");
//log4js setting
log4js.configure({
    appenders: [
        {type: 'console'},
        {
            type: 'dateFile',
            absolute: true,
            filename:  __dirname +'/logs/system-name',
            maxLogSize: 1024*1024,
            pattern: "-yyyy-MM-dd.log",
            alwaysIncludePattern: true,
            category: 'normal'
        }
    ],
    replaceConsole: true
});

module.exports = function (name) {
    var logger = log4js.getLogger(name);
    logger.setLevel('DEBUG');
    return logger;
}