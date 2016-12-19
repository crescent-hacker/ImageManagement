var records = [
    { id: 1, username: 'test', password: 'test', displayName: 'Tester', emails: [ { value: 'test@test.edu.au' } ] }
];

//exposed public interface
var dao = {};
module.exports = dao;

dao.findById = function(id, cb) {
    process.nextTick(function() {
        //todo,数据库查询id
        var idx = id - 1;
        if (records[idx]) {
            cb(null, records[idx]);
        } else {
            cb(new Error('User ' + id + ' does not exist'));
        }
    });
}

dao.findByUsername = function(username, cb) {
    process.nextTick(function() {
        //todo,数据库查询name数据
        for (var i = 0, len = records.length; i < len; i++) {
            var record = records[i];
            if (record.username === username) {
                return cb(null, record);
            }
        }
        return cb(null, null);
    });
}