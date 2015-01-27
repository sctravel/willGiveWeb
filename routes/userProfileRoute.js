/**
 * Created by XiTU on 1/25/15.
 */

module.exports = function(app) {

    var userLogin = require('../lib/db/userLogin');
    var constants = require('../lib/common/constants');
    var isLoggedIn = require('../app').isLoggedIn;



    app.get('/users/account', isLoggedIn, function(req,res){
        console.log('in /user/account');
        console.dir(req.user);
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
    /////////////////////////////////////
    // User Account related Services
    /////////////////////////////////////
    app.post('/services/user/updatePassword', isLoggedIn, function(req,res){
        var updatedData = req.body.updatedData;
        userLogin.updatePasswordForUserAccount(updatedData, req.user.userId,function(err,results){
            if(err){
                console.error(err);
                res.send(err.toString());
                return;
            }
            res.send(results);
        })

    })

    app.post('/services/user/updateBasicInfo', isLoggedIn, function(req,res){
        var basicInfo = req.body.updatedData;
        console.log('calling /services/user/updateBasicInfo');
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
                        console.warn('after updating basic info login failed');
                        res.send(constants.services.CALLBACK_FAILED);
                    }
                });
                res.send(constants.services.CALLBACK_SUCCESS);
            }
        })

    })


    app.get('/services/user/getTransactionHistory', isLoggedIn, function(req, res){
        userLogin.getUserTransactionHistory(req.user.userId, function(err, results){
            if(err){
                console.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            console.dir(results);
            res.send(results);
        })
    })
    app.post('/services/user/settings', isLoggedIn, function(req,res){
        var userSettings = req.body.userSettings;

        userLogin.updateAccountSettingsForUser(userSettings, req.user.userId, function(err,results){
            if(err){
                console.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            res.send(results);
        })

    })
    app.get('/services/user/settings', isLoggedIn, function(req,res) {
        userLogin.getAccountSettingInfoForUser(req.user.userId, function(err, userSettings){
            if(err){
                console.error(err);
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
            fstream = fs.createWriteStream(__dirname + '/public/resources/profileIcons/' + fieldname +'.'+suffix);
            file.pipe(fstream);
            fstream.on('close', function () {
                console.log("Upload Finished of " + fieldname);
                var iconUrl = '/resources/profileIcons/' + fieldname +'.'+suffix;
                userLogin.updateUserProfileImageUrl( iconUrl, req.user.userId,function(err, results){
                    if(!err) {
                        var user = req.user;
                        user.imageIconUrl = iconUrl;
                        req.logIn(user, function(error) {
                            if (error) {
                                console.warn('after updating basic info login failed');
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




}