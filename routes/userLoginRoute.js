/**
 * Created by XiTU on 1/25/15.
 */


module.exports = function(app) {
    this.name = 'userLoginRoute';

    var userLogin = require('../lib/db/userLogin');
    var forgotPassword = require('../lib/db/forgotPassword');
    var constants = require('../lib/common/constants');
    var isLoggedIn = require('../app').isLoggedIn;
    var passport = require('passport');
    var fpass = require('passport-facebook').Strategy;
    var LocalStrategy = require('passport-local').Strategy;
    var logger = require('../app').logger;
    var recipient = require('../lib/db/recipientOperation');
    var config = require('config');


    var facebookCredentials = config.get('facebookCredentials');

    if( app.get('env') == 'production') {
        facebookCredentials = {
            "clientID" : "420297851460293",
            "clientSecret" : "dd643be55187ac4e76e6487ccd61e7a0",
            "callbackURL" : "/auth/facebook/callback"
        }
    }
    logger.info("#########app env: "+app.get('env')+". ##############");
    logger.info(facebookCredentials);
    ///////////////////////////////////////////////////////////////////////
    // Passport - Login methods setup
    ///////////////////////////////////////////////////////////////////////
    passport.use('user', new LocalStrategy(
        function ( username, password, done) {

                userLogin.manualLogin(username, password, function(error,results){
                    logger.debug(results);
                    if(error) {
                        return done(null, false, { message: 'Login Error. Please try again' });
                    }
                    if(results.isAuthenticated == true ) {
                        logger.debug(results);
                        return done(null, {provider : results.provider, email:results.email, userId : results.userId, sessionId: results.sessionId,
                            firstName: results.firstName, lastName: results.lastName, imageIconUrl: results.imageIconUrl} );
                    } else {
                        return done(null, false, { message: results.errorMessage });
                    }
                });

        }
    ));


    passport.use(new fpass(facebookCredentials,
        function(accessToken, refreshToken, fbUserData, done){
            console.dir(fbUserData);
            userLogin.loginOrCreateAccountWithFacebook(fbUserData._json,function(err,results){
                logger.debug(results);
                if(err) {
                    return done(null, false, { message: 'Facebook Login Error.' });
                }
                if(results.isAuthenticated == true ) {
                    logger.debug(results);
                    return done(null,{provider:results.provider, email: results.email, userId :results.userId, sessionId: results.sessionId,
                        firstName: results.firstName, lastName: results.lastName, imageIconUrl: results.imageIconUrl});
                } else {
                    return done(null, false, { message: results.errorMessage });
                }
            })

        }
    ));

    passport.serializeUser(function (user, done) {//保存user对象
        done(null, {provider:user.provider, email:user.email, userId:user.userId, sessionId:user.sessionId,
            firstName: user.firstName, lastName: user.lastName, imageIconUrl: user.imageIconUrl});//可以通过数据库方式操作
    });

    passport.deserializeUser(function (user, done) {//删除user对象
        done(null, {provider:user.provider, email:user.email, userId:user.userId, sessionId:user.sessionId,
            firstName: user.firstName, lastName: user.lastName, imageIconUrl: user.imageIconUrl} );//可以通过数据库方式操作
    });

// GET /auth/facebook
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Facebook authentication will involve
//   redirecting the user to facebook.com.  After authorization, Facebook will
//   redirect the user back to this application at /auth/facebook/callback
    app.get('/auth/facebook',
        passport.authenticate('facebook',{ scope: ['user_about_me', 'email', 'public_profile'] }),
        function(req, res){
            // The request will be redirected to Facebook for authentication, so this
            // function will not be called.
        });

// GET /auth/facebook/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', {
            failureRedirect: '/login/signin' })
        ,
        function(req,res){
            logger.debug(req.session);
            if(req.session.lastPage) {
                res.redirect(req.session.lastPage);
            } else {
                res.redirect("/");
            }

        }
    );



    ///////////////////////////////////////////////////////////////////////
    // User Login - Login Page Rendering
    ///////////////////////////////////////////////////////////////////////
    app.get('/login/signin', function (req,res){
        res.render('login/signin',{error: req.flash('error'), success: req.flash('success'), message:req.flash('message') });
    });
    app.get('/login/signup', function (req,res){
        res.render('login/signup', {user: req.user});
    });

    app.get('/login/forgotPassword', function (req,res){
        res.render('login/forgotPassword', {user: req.user});
    });

    app.get('/login/resetPassword',function(req,res){
        var email = req.query.email;
        var randomString = req.query.randomString;

        logger.warn("Reset Password for email:"+email+"; randomString:"+randomString);
        res.render('login/resetPassword', {email:email,randomString:randomString});
    });

    app.get('/login/logout', isLoggedIn, function (req, res) {
        userLogin.logoutUserLoginHistory(req.user.userId, req.user.sessionId, function(err, results){
            ;//write logout history success
        })
        req.flash('success','Logged out!');
        req.logout();
        res.redirect("/");
    });


    app.post('/services/login/signin',
        passport.authenticate('user',
            { failureRedirect: '/login/signin', failureFlash: true }
        ),
        function(req,res){
            logger.debug(req.body);
            logger.debug(req.session);
            if(req.session.lastPage) {
                res.redirect(req.session.lastPage);
            } else {
                res.redirect("/");
            }

        }
    );
    app.post('/services/login/mobileSignin',
        passport.authenticate('user',
            { failureRedirect: '/login/signin', failureFlash: true }
        ),
        function(req,res){
            logger.debug(req.body);
            logger.debug(req.session);
            if(req.session.lastPage) {
                res.redirect(req.session.lastPage);
            } else {
                res.redirect("/");
            }

        }
    );

    /////////////////////////////////////////////////////////
    //find back password
    //////////////////////////////////////////////////////////
    app.post('/services/login/resetPassword',function(req,res){
        var email = req.body.email;
        var randomString = req.body.randomString;
        var password = req.body.password;

        forgotPassword.updatePasswordByEmail(email,randomString,password,function(err,results){
            if(err) {
                logger.error(err);
                res.send(err.toString());
                return;
            }
            res.send(results);

        })

    });

    //Data Services for account
    app.post('/services/login/signup', function(req,res) {
        var newAccountInfo = req.body.newAccountInfo;
        newAccountInfo.imageIconUrl = constants.paths.BLANK_ICON_PATH;

        userLogin.addNewUserAccount(newAccountInfo, function(err,results){
            if(err) {
                logger.error(err);
                res.send(err.toString());
            } else {
                logger.debug(results);
                res.send(constants.services.CALLBACK_SUCCESS);
            }
        });
    });


    app.post('/services/login/forgotPassword',function(req,res){
        console.log("post to forgot password");
        var email = req.body.email;

        forgotPassword.forgotPassword(email,function(err,results){
            if(err) {
                logger.error(err);
                logger.info("Email exists? Error!");

                res.send(err.toString());
                return;
            }
            logger.info("Email exists? "+results);
            res.send(results);
        })
    });


    app.post('/services/login/validateEmailLink',function(req,res){
        var email = req.body.email;
        var randomString = req.body.randomString;

        forgotPassword.validateEmailLink(email,randomString,function(err,results){
            if(err){
                logger.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            res.send(results);
        })

    });
};