/**
 * Created by XiTU on 4/20/14.
 */

var tableNames = require('./../common/tableNames').TABLE_NAMES;
var conn = require('./../db/createDBConnectionPool');
var stringUtil = require('./../utils/stringUtils');
var dbPool = require('../db/createDBConnectionPool');
var constants = require('./../common/constants');
var encryptionUtil = require('./../utils/encryptionUtil');
var emailUtil = require('./../utils/emailUtil');
var logger = require('../../app').logger;

function loginUserLoginHistory(userId, callback) {
    var sessionId = stringUtil.generateRandomString(constants.login.SESSION_ID_LENGTH);
    var returnObject = {};
    returnObject.userId = userId;
    returnObject.sessionId = sessionId;
    var sql = "insert into " + tableNames.USER_LOGIN_HISTORY_TABLE + " ( userId, sessionId ) values (? , ?) ";

    dbPool.runQueryWithParams(sql,[userId, sessionId],function(err,results) {

        if(err) {
            callback(err, null);
            return;
        }

        if(results && results.affectedRows==1) {
            logger.info("userId-"+userId+" logged in.");
            callback(null, returnObject);
        } else {
            calback(new Error("loginCustomerLoginHistory error"),null);
        }
    })
}


exports.logoutUserLoginHistory = function(userId, sessionId, callback) {

    var sql = "update " + tableNames.USER_LOGIN_HISTORY_TABLE + " set logoutDatetime = now() " +
        " where userId = ? and sessionId = ? and logoutDatetime is null ";

    dbPool.runQueryWithParams(sql,[userId, sessionId],function(err,results) {

        if(err) {
            callback(err, null);
            return;
        }
        console.dir(results);
        if(results&&results.affectedRows==1) {
            callback(null, constants.services.CALLBACK_SUCCESS );
        } else {
            callback(new Error("unknown error"),null);
        }
    })
}


//user login with email and password
exports.manualLogin = function(email, pass, callback) {
    var authSql = " select userId, firstName, lastName, email, password, imageIconUrl from " +tableNames.USER_TABLE+ " where email=? and provider = ?";

    var returnObj = {};
    returnObj.isAuthenticated = false;

    //TODO hash the password
    conn.runQueryWithParams(authSql,[email, constants.login.LOGIN_PROVIDER.WILLGIVE], function(err,results) {
        if(err) {
            returnObj.errorMessage="Email or password is incorrect. Please try it again";
            callback(err,returnObj);
            return;
        }
        console.dir(results);
        if(results && results.length==1) {
            if(encryptionUtil.validatePassword(pass,results[0].password )) {
                logger.info("In ManualLogin userId-"+results[0].userId);

                loginUserLoginHistory(results[0].userId, function(err, logResult){
                    if(err) {
                        logger.err(err);
                        callback(err,returnObj);
                        return;
                    }
                    returnObj.isAuthenticated = true;
                    returnObj.email = email;
                    returnObj.provider = constants.login.LOGIN_PROVIDER.WILLGIVE;
                    returnObj.userId = results[0].userId;
                    returnObj.imageIconUrl = results[0].imageIconUrl;
                    returnObj.firstName = results[0].firstName;
                    returnObj.lastName = results[0].lastName;
                    returnObj.displayName = results[0].displayName;
                    returnObj.sessionId = logResult.sessionId;
                    callback(null, returnObj);
                })

            } else {
                returnObj.errorMessage = "The password is incorrect. Please use Forgot Password from the login page to retrieve account.";
                callback(null, returnObj);
            }
        } else {
            returnObj.errorMessage = "This email doesn't exist. Please go to signup page to sign up with the email";
            callback(null, returnObj);
        }
    });
}
function verifyUser(userId, sessionId, callback) {
    var verifySql = " select  sessionId from " + tableNames.USER_LOGIN_HISTORY_TABLE  +
        " where userId = ? and loginDatetime > now() - INTERVAL "+ constants.SESSION_HOURS + " HOUR ";

    dbPool.runQueryWithParams(verifySql, [userId], function(err, results){
        if(err) {
            callback(err,null);
            return;
        }
        if(results && results.length>=1) {
            for(var i in results) {
                if(results[i].sessionId == sessionId) {
                    logger.info("User-"+userId+" verified.");
                    callback(null,constants.services.CALLBACK_SUCCESS);
                    return;
                }
            }
            callback(new Error("no SessionId matches"),null);

        } else {
            callback(new Error("verify user error"),null);
        }
    })
}
exports.verifyUser = verifyUser;


function addNewUserAccount(newData, callback) {

    //console.log("test email: "+newData.email+"; result is " + constants.login.EMAIL_REX.test(newData.email));
    //console.log("length of last/first name is "+newData.lastName.length+"/"+newData.firstName.length);
    //Validate the input at backend
    if(newData.password.length < 8) {
        callback(new Error("The minimum length of password is 8."), null);
        return;
    } else if( !constants.login.EMAIL_REX.test(newData.email) ) {
        callback(new Error("Please enter a valid email."), null);
        return;
    } else if( newData.lastName.length==0 || newData.firstName.length==0 ) {
        callback(new Error("Please enter your first and last name."), null);
        return;
    }
    //Need to test whether the account exist or not
    var newAccountSql = " insert into " + tableNames.USER_TABLE + " ( email, password, firstName, lastName, displayName, provider, imageIconUrl) " +
        " values (?,?,?,?,?,?,?) ";

    var params = [newData.email, encryptionUtil.saltAndHash(newData.password), newData.firstName,
        newData.lastName, newData.firstName, newData.provider, newData.imageIconUrl];

    dbPool.runQueryWithParams(newAccountSql, params, function(err,results) {
        if(err) {
            logger.error(err);
            callback(new Error("This email is already in use. Please use Forgot Password from the login page to retrieve account."),null);
            return;
        }
        callback(null, results);
        // Send out Welcome emails to new registered emails.
        // No callback on sending email
        var mailOptions = {
            from: "WillGive <willgiveplatform@gmail.com>", // sender address
            to: newData.email, // list of receivers
            subject: "Welcome to WillGive", // Subject line
            html: constants.emails.welcomeEmail.replace('{FirstName}', newData.firstName) // html body
        };
        emailUtil.sendEmail(mailOptions,function(err,results){
            if(err) {
                logger.error(err);
            }
            logger.info("successfully sending emails");
            return;
        });

    })

}
exports.addNewUserAccount = addNewUserAccount;
/**
 *
 * @param fbUserData the _json member of the fbUserData returned by facebook
 * @param callback
 */
exports.loginOrCreateAccountWithFacebook = function(fbUserData,callback) {

    var userInfo={};
    userInfo.imageIconUrl = constants.login.FB_ICON_URL_TEMPLATE.replace(constants.login.FB_ICON_URL_PATTERN, fbUserData.id);;
    userInfo.password="facebook:"+fbUserData.id;
    userInfo.passwordConf="facebook:"+fbUserData.id;
    userInfo.firstName = fbUserData.first_name;
    userInfo.lastName = fbUserData.last_name;
    userInfo.displayName = fbUserData.first_name; //Display firstname if login with FB
    userInfo.email=fbUserData.email;
    userInfo.provider=constants.login.LOGIN_PROVIDER.FACEBOOK;

    var returnObj={};

    var sql = " select userId, email, firstName, lastName, imageIconUrl, displayName from "+ tableNames.USER_TABLE +" where email = ? and provider = ?";

    dbPool.runQueryWithParams(sql,[userInfo.email, userInfo.provider],function(err,results){
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        if(results && results.length==1) { //the account is already registered
            loginUserLoginHistory(results[0].userId, function(err, logResult){
                if(err) {
                    logger.error(err);
                    callback(err, returnObj);
                    return;
                }
                returnObj.isAuthenticated = true;
                returnObj.provider = constants.login.LOGIN_PROVIDER.FACEBOOK;
                returnObj.userId = logResult.userId;
                returnObj.imageIconUrl=results[0].imageIconUrl;
                returnObj.email = userInfo.email;
                returnObj.firstName = results[0].firstName;
                returnObj.lastName = results[0].lastName;
                returnObj.displayName = results[0].displayName; //facebook login displayName?
                returnObj.sessionId = logResult.sessionId;
                callback(null, returnObj);
            })
        } else { //create new account with facebook information
            addNewUserAccount(userInfo,function(err,results){
                if(err) {
                    callback(err,null);
                    return;
                }

                var userId = results.insertId;

                loginUserLoginHistory(userId, function(err, logResult){
                    if(err) {
                        logger.error(err);
                        callback(err, returnObj);
                        return;
                    }
                    returnObj.isAuthenticated = true;
                    returnObj.provider = constants.login.LOGIN_PROVIDER.FACEBOOK;
                    returnObj.userId = userId;
                    returnObj.imageIconUrl =userInfo.imageIconUrl;
                    returnObj.firstName = userInfo.firstName;
                    returnObj.lastName = userInfo.lastName;
                    returnObj.displayName = userInfo.displayName; //userInfo
                    returnObj.email = userInfo.email;
                    returnObj.sessionId = logResult.sessionId;
                    callback(null, returnObj);
                })

            })

        }
    })
}


//////////////////////////////////
//Account settings
//////////////////////////////////
//Will add date to extract part of the data later when the transactions for a user is large
exports.getUserTransactionHistory = function(userId, callback) {
    var sql = 'select ut.transactionId, ut.confirmationCode, ut.amount, ut.recipientId, r.name,  r.imageUrl, ' +
        ' r.videoUrl, date_format(ut.datetime, \'%Y-%m-%d %H:%i:%s\') as dateTime, ut.settleTime, ut.status, ut.confirmationCode from ' + tableNames.TRANSACTION_TABLE +
        ' ut inner join ' + tableNames.RECIPIENT_TABLE + ' r on ut.recipientId = r.recipientId where ' +
        ' ut.userId = ? and ut.status != \'Pledge\' order by ut.datetime desc ';

    dbPool.runQueryWithParams(sql,[userId],function(err, results){
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null, results);
    });

}


exports.getUserPledgeHistory = function(userId, callback) {
    var sql = 'select ut.transactionId, ut.confirmationCode, ut.amount, ut.recipientId, r.name,  r.imageUrl, ' +
        ' r.videoUrl, date_format(ut.datetime, \'%Y-%m-%d %H:%i:%s\') as dateTime, ut.settleTime, ut.status, ut.confirmationCode from ' + tableNames.TRANSACTION_TABLE +
        ' ut inner join ' + tableNames.RECIPIENT_TABLE + ' r on ut.recipientId = r.recipientId where ' +
        ' ut.userId = ? and ut.status = \'Pledge\' order by ut.datetime desc ';

    dbPool.runQueryWithParams(sql,[userId],function(err, results){
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null, results);
    });

}

exports.getAccountSettingInfoForUser = function(userId, callback) {
    var sql=' select maxAmountPerTime, maxAmountPerDay, defaultAmount, receiveEmail, receiveNotification, transactionPublic ' +
        ' from ' + tableNames.USER_SETTING_TABLE + ' where userId=? ';

    var userSettings={};
    logger.info("Getting settings for user-"+userId);
    dbPool.runQueryWithParams(sql,[userId],function(err,results){
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        if(results && results.length==1) {
            userSettings.maxAmountDaily = results[0].maxAmountPerDay;
            userSettings.maxAmountPerTime = results[0].maxAmountPerTime;
            userSettings.defaultAmountPerTime = results[0].defaultAmount;
            userSettings.receiveEmailUpdate = results[0].receiveEmail;
            userSettings.receiveEmailNotification = results[0].receiveNotification;
            userSettings.allowContributionPublic = results[0].transactionPublic;
            callback(null, userSettings);
        } else {
            callback(new Error("UserSetting result is invalid (not equal to 1)."), null);
        }
    });

}



exports.updateAccountSettingsForUser = function(userSettings, userId, callback) {

    var updateUserSettingsSql = ' update ' + tableNames.USER_SETTING_TABLE + ' set ' +
        ' maxAmountPerTime = ?, ' +
        ' maxAmountPerDay = ?, ' +
        ' defaultAmount = ?, ' +
        ' receiveEmail = ?, ' +
        ' receiveNotification = ?, ' +
        ' transactionPublic = ? ' +
        ' where userId = ?';
    logger.debug(params);
    var params = [ userSettings.maxAmountPerTime, userSettings.maxAmountDaily, userSettings.defaultAmountPerTime,
        userSettings.receiveEmailUpdate, userSettings.receiveEmailNotification, userSettings.allowContributionPublic, userId ] ;

    dbPool.runQueryWithParams(updateUserSettingsSql, params, function(err,results) {
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        //Need to check affectedRow==1?
        callback(null,constants.services.CALLBACK_SUCCESS);
    })

}

exports.updatePasswordForUserAccount = function(updateData, userId, callback) {

    if(updateData.newPassword != updateData.confirmPassword) {
        callback(new Error("Passwords don't match."), null);
        return;
    } else if(updateData.confirmPassword.length<8) {
        callback(new Error("The length of password should not less than 8."), null);
        return;
    }


    var checkOldPasswordSql = 'select userId, password from ' + tableNames.USER_TABLE + ' where userId=? ';
    dbPool.runQueryWithParams(checkOldPasswordSql, [userId], function(err,results) {
        if(err) {
            logger.error(err);
            callback(new Error("Updating password failed. Please try it again."),null);
            return;
        }
        console.log('old password-'+updateData.oldPassword);
        if(results && results.length==1 && encryptionUtil.validatePassword(updateData.oldPassword,results[0].password)) {
            var updatePasswordSql = ' update ' + tableNames.USER_TABLE + ' set password = ? where userId= ? ';
            dbPool.runQueryWithParams(updatePasswordSql, [encryptionUtil.saltAndHash(updateData.newPassword), userId], function(err,results) {
                if(err) {
                    logger.error(err);
                    callback(new Error("Updating password failed. Please try it again."), null);
                    return;
                }
                callback(null, constants.services.CALLBACK_SUCCESS);
            });

        } else {
            callback(new Error("Updating password failed. The old password is incorrect."), null);
        }
    });

}

exports.updateEmailForUserAccount = function(updateData, userId, callback) {
    var checkOldPasswordSql = 'select userId, password from ' + tableNames.USER_TABLE + ' where userId = ? ';
    dbPool.runQueryWithParams(checkOldPasswordSql, [userId], function(err,results) {
        if(err) {
            logger.error(err);
            callback(new Error("Updating email failed. Please try it again."),null);
            return;
        }
        console.warn(updateData.updateEmailPassword);
        if(results && results.length==1 && encryptionUtil.validatePassword(updateData.updateEmailPassword, results[0].password)) {

            var updateEmailSql = " update " + tableNames.USER_TABLE + " set email = ? where userId= ? ";
            dbPool.runQueryWithParams(updateEmailSql, [ updateData.newEmail, userId ], function(err2, results2) {
                // categorize error message? email already in use / password not correct / internal error ?
                if(err2) {
                    logger.error("err2" + err2);
                    callback(new Error("Updating email failed. The email is already in use."),null);
                    return;
                }
                callback(null, constants.services.CALLBACK_SUCCESS);
            });
        } else {
            callback(new Error("Updating email failed. The password is incorrect."), null);
        }
    });

}

exports.updateBasicInfoForUserAccount = function(updateData, userId, callback) {
    var updateBasicInfoSql = " update " + tableNames.USER_TABLE + " set firstName = ? , lastName = ? where userId= ? ";
    dbPool.runQueryWithParams(updateBasicInfoSql, [updateData.firstName, updateData.lastName, userId], function(err,results) {
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null, constants.services.CALLBACK_SUCCESS);
    });
}

exports.updateUserProfileImageUrl = function(imageUrl, userId, callback) {

    logger.info('!!!!!!!!!!!!!!!!!updateUserProfileImageUrl----imageUrl'+imageUrl+';  userId-'+userId);
    var updateImageUrlSql = 'update ' + tableNames.USER_TABLE + ' set imageIconUrl = ? where userId = ?';
    dbPool.runQueryWithParams(updateImageUrlSql, [imageUrl, userId], function(err,results) {
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null, constants.services.CALLBACK_SUCCESS);
    });
}

exports.contactUs = function(contactUsInfo, callback) {
    var sql = ' insert into ' + tableNames.USER_CONTACT_US + ' ( email, name, content ) values ( ?, ?, ? )' ;
    var params = [contactUsInfo.email, contactUsInfo.name, contactUsInfo.content];

    if(contactUsInfo.userId) {
        sql = ' insert into ' + tableNames.USER_CONTACT_US + ' ( userId, email, name, content ) values ( ?, ? , ? , ?)' ;
        params = [contactUsInfo.userId, contactUsInfo.email, contactUsInfo.name, contactUsInfo.content];
    }

    dbPool.runQueryWithParams(sql, params, function(err, results){
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null, constants.services.CALLBACK_SUCCESS);

        //disable email for contact us for now
        /*
        var mailOptions = {
            from: contactUsInfo.email, // sender address
            to: "WillGive <willgiveplatform@gmail.com>", // list of receivers
            subject: "Contact Us from "+contactUsInfo.name, // Subject line
            html: contactUsInfo.content // html body
        };
        emailUtil.sendEmail(mailOptions,function(err,results){
            if(err) {
                logger.error(err);
            }
            logger.info("successfully sending emails");
            return;
        });*/
    });
}

////////////////////////
///// Tools APIs //////
///////////////////////
exports.toolRunQuery = function(query, maxRecords, callback) {
    dbPool.runQueryWithParams(query, null, function(err, results){
        if(err) {
            callback(err,null);
            return;
        }
        callback(null, results);
   });
}
