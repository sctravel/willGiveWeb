/**
 * Created by XiTU on 1/25/15.
 */

module.exports = function(app) {

    var fs = require('fs');

    var userLogin = require('../lib/db/userLogin');
    var constants = require('../lib/common/constants');
    var charityOps = require('../lib/db/charityOperation');

    var isLoggedIn = require('../app').isLoggedIn;
    var logger = require('../app').logger;



    app.get('/users/account', isLoggedIn, function(req,res){
        logger.debug('in /user/account');
        logger.debug(req.user);
        res.render('login/userProfile', {user: req.user});
    })
    app.get('/users/settings', isLoggedIn, function(req,res){
        res.render('login/userSettings', {user: req.user});
    })
    app.get('/users/paymentMethod', isLoggedIn, function(req,res){
        res.render('login/userPaymentMethod', {user: req.user});
    })
    app.get('/users/contribution', isLoggedIn, function(req,res){
        res.render('login/userContribution', {user: req.user});
    })
    app.get('/users/collections', isLoggedIn, function(req,res){
        res.render('login/userCollections', {user: req.user});
    })

    app.get('/users/pledge', isLoggedIn, function(req,res){
        res.render('login/userPledges', {user: req.user});
    })
	
	// Tools
    app.get('/tools/adminTools', isLoggedIn, function(req,res){
        res.render('login/adminTools', {user: req.user});
    })
    app.get('/tools/toolContactUs', isLoggedIn, function(req,res){
        res.render('login/toolContactUs', {user: req.user});
    })
    app.get('/tools/toolSQL', isLoggedIn, function(req,res){
        res.render('login/toolSQL', {user: req.user});
    })
	
    /////////////////////////////////////
    // Tool Services
    /////////////////////////////////////
    app.post('/services/tools/query', isLoggedIn, function(req,res){
        var query = req.body.query;
		var maxRecords = req.body.maxRecords;
        userLogin.toolRunQuery(query, maxRecords, function(err,results){
            if(err){
                logger.error("Route error logging:" + err);
                res.send(err.toString());
                return;
            }
            res.send(results);
        })
    })
    /////////////////////////////////////
    // User Account related Services
    /////////////////////////////////////
    app.post('/services/user/updatePassword', isLoggedIn, function(req,res){
        var updatedData = req.body.updatedData;
        userLogin.updatePasswordForUserAccount(updatedData, req.user.userId,function(err,results){
            if(err){
                logger.error("Route error logging:" + err);
                res.send(err.toString());
                return;
            }
            res.send(results);
        })
    })

    app.post('/services/user/updateEmail', isLoggedIn, function(req,res){
        var updatedData = req.body.updatedData;
        userLogin.updateEmailForUserAccount(updatedData, req.user.userId,function(err,results){
            if(err){
                logger.error("Route error logging:" + err);
                res.send(err.toString());
                return;
            } else {
                var user = req.user;
                user.email = updatedData.newEmail;

                req.logIn(user, function(error) {
                    if (error) {
                        logger.warn('after updating email info login failed');
                        res.send("Successfully updated your email. Please login again.");
                    }
                });
                res.send(constants.services.CALLBACK_SUCCESS);
            }
        })
    })
    app.post('/services/user/updateBasicInfo', isLoggedIn, function(req,res){
        var basicInfo = req.body.updatedData;
        logger.info('calling /services/user/updateBasicInfo');
        userLogin.updateBasicInfoForUserAccount(basicInfo, req.user.userId,function(err,results){
            if(err){
                res.send(constants.services.CALLBACK_FAILED);
                return;
            } else {
                var user = req.user;
                user.firstName = basicInfo.firstName;
                user.lastName = basicInfo.lastName;

                req.logIn(user, function(error) {
                    if (error) {
                        logger.warn('after updating basic info login failed');
                        res.send(constants.services.CALLBACK_FAILED);
                    }
                });
                res.send(constants.services.CALLBACK_SUCCESS);
            }
        })

    })

    app.get('/services/user/getPledgeHistory', isLoggedIn, function(req, res){
        userLogin.getUserPledgeHistory(req.user.userId, function(err, results){
            if(err){
                logger.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            logger.debug(results);
            res.send(results);
        })
    })


    app.get('/services/user/getTransactionHistory', isLoggedIn, function(req, res){
        userLogin.getUserTransactionHistory(req.user.userId, function(err, results){
            if(err){
                logger.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            logger.debug(results);
            res.send(results);
        })
    })
    app.post('/services/user/settings', isLoggedIn, function(req,res){
        var userSettings = req.body.userSettings;

        userLogin.updateAccountSettingsForUser(userSettings, req.user.userId, function(err,results){
            if(err){
                logger.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            res.send(results);
        })

    })
    app.get('/services/user/settings', isLoggedIn, function(req,res) {
        console.dir(req.session.cookie);

        userLogin.getAccountSettingInfoForUser(req.user.userId, function(err, userSettings){
            if(err){
                logger.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            res.send(userSettings);
        })
    });


    app.post('/services/login/profilePictureUpload', function(req,res) {

        var fstream;
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename) {
            var fileNameArray = filename.split('.');
            var suffix = fileNameArray[fileNameArray.length-1].toLowerCase();

            //Path where image will be uploaded
            fstream = fs.createWriteStream(__dirname + '/../public/resources/profileIcons/' + fieldname +'.'+suffix);
            file.pipe(fstream);
            fstream.on('close', function () {
                logger.info("Upload Finished of " + fieldname);
                var iconUrl = '/resources/profileIcons/' + fieldname +'.'+suffix;
                userLogin.updateUserProfileImageUrl( iconUrl, req.user.userId,function(err, results){
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
                });
                //where to go next
            });
        });

    });

    app.get('/services/user/getFavoriteCharity', isLoggedIn, function(req,res){
        logger.info('calling /user/charity/getFavoriteCharity ' + req.user.userId);
        charityOps.getFavoriteCharity(req.user.userId, function(err, results){
            if(err){
                logger.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            logger.debug(results);
            res.send(results);
        })
    })

    app.get('/services/user/setFavoriteCharity', isLoggedIn, function(req,res){
        logger.info('calling /services/user/setFavoriteCharity ' + req.user.userId + " " + req.query.rid + " " + req.query.value);
        charityOps.setFavoriteCharity(req.user.userId, req.query.rid, req.query.value, function(err, results){
            if(err){
                logger.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            res.send(results);
        })
    })


}