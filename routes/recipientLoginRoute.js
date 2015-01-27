/**
 * Created by XiTU on 1/26/15.
 */
    ///////////////////////////
module.exports = function(app) {
    this.name = 'userLoginRoute';
    var fs = require('fs');

    var userLogin = require('../lib/db/userLogin');
    var forgotPassword = require('../lib/db/forgotPassword');
    var constants = require('../lib/common/constants');
    var isLoggedInAsRecipient = require('../app').isLoggedInAsRecipient;
    var passport = require('passport');
    var LocalStrategy = require('passport-local').Strategy;
    var logger = require('../app').logger;
    var recipient = require('../lib/db/recipientOperation');

    passport.use('recipient', new LocalStrategy(
        function (username, password, done) {
            console.error('provider-'+username);
            recipient.recipientLogin(username, password, function(error,results){
                logger.debug(results);
                if(error) {
                    return done(null, false, { message: 'Login Error. Please try again' });
                }
                if(results.isAuthenticated == true ) {
                    logger.debug(results);
                    return done(null, {provider : results.provider, email:results.email, userId : results.userId, sessionId: '',
                        firstName: results.firstName, lastName: '', imageIconUrl: results.imageIconUrl} );
                } else {
                    return done(null, false, { message: results.errorMessage });
                }
            });
        }
    ));
    app.get('/recipient/signup', function(req, res) {
        res.render('recipientLogin/recipientSignUp');
    });
    app.get('/recipient/login', function(req, res) {
        res.render('recipientLogin/recipientLogin',{error: req.flash('error'), success: req.flash('success'), message:req.flash('message') });
    });
    app.get('/recipient/designPage', isLoggedInAsRecipient, function(req, res) {
        res.render('recipientLogin/recipientSignUp2_upload', {user: req.user});
    });

    app.get('/recipient/logout', isLoggedInAsRecipient, function (req, res) {
        req.flash('success','Logged out!');
        req.logout();
        res.redirect("/recipient/login");
    });
    app.post('/services/recipient/login',
        passport.authenticate('recipient',
            { failureRedirect: '/recipient/login', failureFlash: true }
        ),
        function(req,res){
            logger.debug(req.body);
            logger.debug(req.session);
            var profilePicturePath = __dirname+'/../public/resources/recipients/'+req.user.userId+'/profilePicture'

            fs.exists(profilePicturePath, function(exists) {
                if (exists) {
                    console.log('profile picture at '+profilePicturePath+' for recipient-'+req.user.userId+' exists');
                    if(req.session.lastPage) {
                        res.redirect(req.session.lastPage);
                    } else {
                        res.redirect("/");
                    }
                } else {
                    console.warn('!!!profile picture '+profilePicturePath+' for recipient-'+req.user.userId+' doesnot exists!!!');
                    res.redirect("/recipient/designPage")
                }
            });

        }
    );
    app.post('/services/recipient/signup', function(req, res) {
        //should auto login after signup
        var signUpFrom = req.body.recipientSignUpForm;
        logger.debug(signUpFrom);
        var user={};
        recipient.createNewRecipient(signUpFrom, function(err, results) {
            if(err) {
                logger.error(err);
                res.send(err.toString());
                return;
            }
            user.user_id = results;
            user.firstName = signUpFrom.organizationName;
            user.lastName = '';
            user.provider = constants.login.LOGIN_PROVIDER.RECIPIENT;
            user.email = signUpFrom.email;
            req.logIn(user, function(error) {
                if (error) {
                    logger.error('after recipient signup, login failed');
                    res.send(constants.services.CALLBACK_FAILED);
                }
            });
            res.send(constants.services.CALLBACK_SUCCESS);
        });
    });

    app.post('/services/recipient/profilePictureUpload', isLoggedInAsRecipient, function(req,res) {

        var fstream;
        var recipientId = req.user.userId;
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename) {

            //Path where image will be uploaded
            fstream = fs.createWriteStream(__dirname + '/../public/resources/recipients/' + recipientId+'/profilePicture' );
            file.pipe(fstream);
            fstream.on('close', function () {
                logger.info("Upload Finished of " + fieldname);
                var imageUrl = '/resources/recipient/' + recipientId+'/profilePicture';
                //we don't need the imageUrl actually, we are using convention to find the profile picture
                res.redirect('/charity?id='+recipientId);

                /*
                userLogin.updateUserProfileImageUrl( imageUrl, req.user.userId,function(err, results){
                    if(!err) {
                        var user = req.user;
                        user.imageIconUrl = iconUrl;
                        req.logIn(user, function(error) {
                            if (error) {
                                logger.warn('after updating basic info login failed');
                                res.send(constants.services.CALLBACK_FAILED);
                            }
                            res.redirect('/users/account');
                        });
                    }
                });*/
                //where to go next
            });
        });

    });
}