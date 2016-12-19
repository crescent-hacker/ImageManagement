var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session')({ secret: 'image management stefan ', resave: false, saveUninitialized: false,cookie: { maxAge: 60 * 10000 } });
var login_validator = require('connect-ensure-login');
var helmet = require('helmet');

//user modules
var user_dao = require('./dao/user_management_dao');
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
passport.use(new Strategy(
    function(username, password, cb) {
        user_dao.findByUsername(username, function(err, user) {
        if (err) { return cb(err); }
        if (!user) { return cb(null, false); }
        if (user.password != password) { return cb(null, false); }
        return cb(null, user);
      });
    }));
passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});
passport.deserializeUser(function(id, cb) {
    user_dao.findById(id, function (err, user) {
    if (err) { return cb(err); }
    cb(null, user);
  });
});

//express
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'resource')));
app.use(express.static(path.join(__dirname, 'bower_components')));
app.use(session);
app.use(passport.initialize());
app.use(passport.session());
app.use(helmet());

//routers
var page_router = require('./routes/router');
var users_router = require('./routes/users');
page_router.init(app,session,passport,login_validator);
users_router.init(app,session,passport,login_validator);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
