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

function loginUserLoginHistory(userId, callback) {
    var sessionId = stringUtil.generateRandomString(constants.login.SESSION_ID_LENGTH);
    var returnObject = {};
    returnObject.userId = userId;
    returnObject.sessionId = sessionId;
    console.log("userId-"+userId);
    var sql = "insert into " + tableNames.USER_LOGIN_HISTORY_TABLE + " ( user_id, session_id ) values (? , ?) ";

    dbPool.runQueryWithParams(sql,[userId, sessionId],function(err,results) {

        if(err) {
            callback(err, null);
            return;
        }

        if(results && results.affectedRows==1) {
            console.log("userId-"+userId+" logged in.");
            callback(null, returnObject);
        } else {
            calback(new Error("loginCustomerLoginHistory error"),null);
        }
    })
}


exports.logoutUserLoginHistory = function(userId, sessionId, callback) {

    var sql = "update " + tableNames.USER_LOGIN_HISTORY_TABLE + " set logout_datetime = now() " +
        " where user_id = ? and session_id = ? and logout_datetime is null ";

    dbPool.runQueryWithParams(sql,[userId, sessionId],function(err,results) {

        if(err) {
            callback(err, null);
            return;
        }
        console.dir(results);
        if(results&&results.affectedRows==1) {
            console.log("userId-"+userId+" logged out.");
            callback(null, constants.services.CALLBACK_SUCCESS );
        } else {
            callback(new Error("unknown error"),null);
        }
    })
}


//user login with email and password
exports.manualLogin = function(email, pass, callback) {
    var authSql = " select user_id, first_name, last_name, email, password, image_icon_url from " +tableNames.USER_TABLE+ " where email=? and provider = ?";

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
                console.dir(results[0]);
                console.log("In ManualLogin userId-"+results[0].user_id);

                loginUserLoginHistory(results[0].user_id, function(err, logResult){
                    if(err) {
                        console.err(err);
                        callback(err,returnObj);
                        return;
                    }
                    returnObj.isAuthenticated = true;
                    returnObj.email = email;
                    returnObj.provider = constants.login.LOGIN_PROVIDER.WILLGIVE;
                    returnObj.userId = results[0].user_id;
                    returnObj.imageIconUrl = results[0].image_icon_url;
                    returnObj.firstName = results[0].first_name;
                    returnObj.lastName = results[0].last_name;
                    returnObj.displayName = results[0].display_name;
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
    var verifySql = " select  session_id from " + tableNames.USER_LOGIN_HISTORY_TABLE  +
        " where user_id = ? and login_datetime > now() - INTERVAL "+ constants.SESSION_HOURS + " HOUR ";

    dbPool.runQueryWithParams(verifySql, [userId], function(err, results){
        if(err) {
            callback(err,null);
            return;
        }
        if(results && results.length>=1) {
            for(var i in results) {
                if(results[i].session_id == sessionId) {
                    console.info("User-"+userId+" verified.");
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
    }else if(newData.password != newData.passwordConf) {
        callback(new Error("Password doesn't match."), null);
        return;
    } else if( !constants.login.EMAIL_REX.test(newData.email) ) {
        callback(new Error("Please enter a valid email."), null);
        return;
    } else if( newData.lastName.length==0 || newData.firstName.length==0 ) {
        callback(new Error("Please enter your first and last name."), null);
        return;
    }
    //Need to test whether the account exist or not
    var newAccountSql = " insert into " + tableNames.USER_TABLE + " ( email, password, first_name, last_name, display_name, provider, image_icon_url) " +
        " values (?,?,?,?,?,?,?) ";

    var params = [newData.email, encryptionUtil.saltAndHash(newData.password), newData.firstName,
        newData.lastName, newData.firstName, newData.provider, newData.imageIconUrl];

    dbPool.runQueryWithParams(newAccountSql, params, function(err,results) {
        if(err) {
            console.error(err);
            callback(new Error("This email is already in use. Please use Forgot Password from the login page to retrieve account."),null);
            return;
        }
        callback(null,results);
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
                console.error(err);
            }
            console.log("successfully sending emails");
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

    var sql = " select user_id, email, first_name, last_name, image_icon_url, display_name from "+ tableNames.USER_TABLE +" where email = ? and provider = ?";

    dbPool.runQueryWithParams(sql,[userInfo.email, userInfo.provider],function(err,results){
        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }
        if(results && results.length==1) { //the account is already registered
            loginUserLoginHistory(results[0].user_id, function(err, logResult){
                if(err) {
                    console.err(err);
                    callback(err, returnObj);
                    return;
                }
                returnObj.isAuthenticated = true;
                returnObj.provider = constants.login.LOGIN_PROVIDER.FACEBOOK;
                returnObj.userId = logResult.userId;
                returnObj.imageIconUrl=results[0].image_icon_url;
                returnObj.email = userInfo.email;
                returnObj.firstName = results[0].first_name;
                returnObj.lastName = results[0].last_name;
                returnObj.displayName = results[0].display_name; //facebook login displayName?
                returnObj.sessionId = logResult.sessionId;
                callback(null, returnObj);
            })
        } else { //create new account with facebook information
            addNewUserAccount(userInfo,function(err,results){
                if(err) {
                    callback(err,null);
                    return;
                }
                console.log("!!!!!!!!!!!!!!!!")
                console.dir(results);
                console.log("!!!!!!!!!!!!!!!!")

                var userId = results.insertId;

                loginUserLoginHistory(userId, function(err, logResult){
                    if(err) {
                        console.error(err);
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

exports.getAccountSettingInfoForUser = function(userId, callback) {
    var sql=' select max_amount_per_time, max_amount_per_day, default_amount, receive_email, receive_notification, transaction_public ' +
        ' from ' + tableNames.USER_SETTING_TABLE + ' where user_id=? ';

    var userSettings={};
    console.log("Getting settings for user-"+userId);
    dbPool.runQueryWithParams(sql,[userId],function(err,results){
        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }
        if(results && results.length==1) {
            userSettings.maxAmountDaily = results[0].max_amount_per_day;
            userSettings.maxAmountPerTime = results[0].max_amount_per_time;
            userSettings.defaultAmountPerTime = results[0].default_amount;
            userSettings.receiveEmailUpdate = results[0].receive_email;
            userSettings.receiveEmailNotification = results[0].receive_notification;
            userSettings.allowContributionPublic = results[0].transaction_public;
            callback(null, userSettings);
        } else {
            callback(new Error("UserSetting result is invalid (not equal to 1)."), null);
        }
    });

}



exports.updateAccountSettingsForUser = function(userSettings, userId, callback) {

    var updateUserSettingsSql = ' update ' + tableNames.USER_SETTING_TABLE + ' set ' +
        ' max_amount_per_time = ?, ' +
        ' max_amount_per_day = ?, ' +
        ' default_amount = ?, ' +
        ' receive_email = ?, ' +
        ' receive_notification = ?, ' +
        ' transaction_public = ? ' +
        ' where user_id = ?';
    console.dir(params);
    var params = [ userSettings.maxAmountPerTime, userSettings.maxAmountDaily, userSettings.defaultAmountPerTime,
        userSettings.receiveEmailUpdate, userSettings.receiveEmailNotification, userSettings.allowContributionPublic, userId ] ;

    dbPool.runQueryWithParams(updateUserSettingsSql, params, function(err,results) {
        if(err) {
            console.error(err);
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


    var checkOldPasswordSql = 'select user_id, password from ' + tableNames.USER_TABLE + ' where user_id=? ';
    dbPool.runQueryWithParams(checkOldPasswordSql, [userId], function(err,results) {
        if(err) {
            console.error(err);
            callback(new Error("Updating password failed. Please try it again."),null);
            return;
        }
        console.log('old password-'+updateData.oldPassword);
        if(results && results.length==1 && encryptionUtil.validatePassword(updateData.oldPassword,results[0].password)) {
            var updatePasswordSql = ' update ' + tableNames.USER_TABLE + ' set password = ? where user_id= ? ';
            dbPool.runQueryWithParams(updatePasswordSql, [encryptionUtil.saltAndHash(updateData.newPassword), userId], function(err,results) {
                if(err) {
                    console.error(err);
                    callback(new Error("Updating password failed. Please try it again."), null);
                    return;
                }
                callback(null, constants.services.CALLBACK_SUCCESS);
            });

        } else {
            callback("Updating password failed. The old password is incorrect.", null);
        }
    });

}

exports.updateBasicInfoForUserAccount = function(updateData, userId, callback) {
    var updateBasicInfoSql = " update " + tableNames.USER_TABLE + " set first_name = ? , last_name = ? where user_id= ? ";
    dbPool.runQueryWithParams(updateBasicInfoSql, [updateData.firstName, updateData.lastName, userId], function(err,results) {
        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }
        callback(null, constants.services.CALLBACK_SUCCESS);
    });
}

exports.updateUserProfileImageUrl = function(imageUrl, userId, callback) {

    console.error('!!!!!!!!!!!!!!!!!updateUserProfileImageUrl----imageUrl'+imageUrl+';  userId-'+userId);
    var updateImageUrlSql = 'update ' + tableNames.USER_TABLE + ' set image_icon_url = ? where user_id = ?';
    dbPool.runQueryWithParams(updateImageUrlSql, [imageUrl, userId], function(err,results) {
        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }
        console.error('!!!!!!!!!!!!!!!!!updateUserProfileImageUrl @@@@@@@@@@@@@');

        callback(null, constants.services.CALLBACK_SUCCESS);
    });
}




