var express = require('express');
var user_router = {};

module.exports = user_router;

user_router.init = function (app, session, passport,login_validator) {
    app.get('/login',
        function (req, res) {
            res.render('login');
        });

    app.post('/login',
        passport.authenticate('local', {failureRedirect: '/login'}),
        function (req, res) {
            res.redirect('/');
        });

    app.get('/logout',
        function (req, res) {
            req.logout();
            res.redirect('/login');
        });

    app.get('/profile',
        login_validator.ensureLoggedIn(),
        function (req, res) {
            res.render('profile', {user: req.user});
        });
}