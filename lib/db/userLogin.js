/**
 * Created by XiTU on 4/20/14.
 */

var tableNames = require('./../common/tableNames').TABLE_NAMES;
var conn = require('./../db/createDBConnectionPool');
var stringUtil = require('./../utils/stringUtils');
var dbPool = require('../db/createDBConnectionPool');
var constants = require('./../common/constants');
var encryptionUtil = require('./../utils/encryptionUtil');

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

exports.getAccountSettingInfoForUser = function(userId, sessionId, callback) {

    verifyUser(userId, sessionId, function(err,results){

        if(err) {
            console.error(err);
            callback(err,null);
            return
        }

        if(results && results == "done") {
            var getAllAdmins = " select customer_id, username, email, first_name, last_name, phone, address, city,state, country, " +
                " post_code from " + tableNames.customerTable +" where user_id= ? and is_active=\"Y\"  ";

            dbPool.runQueryWithParams(getAllAdmins, [customerId], function(err,results) {
                if(err) {
                    console.error(err);
                    callback(err,null);
                    return;
                }
                callback(null,results);
            })
        } else {
            calback(new Error("unknown error in getAccountInfoForUser"),null);
        }

    })

}

exports.updateAccountSettingsForUser = function(updateAccountInfo, userId, sessionId, callback) {

    verifyUser(userId, sessionId, function(err,results){

        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }

        if(results && results == "done") {

            var updateAccountInfoSql = " update " + tableNames.USER_SETTING_TABLE + " set email = ?, " +
                " first_name=?, last_name=?, phone=?, address=?, city=?, state=? ,country=?, post_code=? where customer_id= ? ";
            var params = [updateAccountInfo.email,updateAccountInfo.firstName,updateAccountInfo.lastName,updateAccountInfo.phone,
                updateAccountInfo.address, updateAccountInfo.city,updateAccountInfo.state, updateAccountInfo.country, updateAccountInfo.postCode, customerId];

            dbPool.runQueryWithParams(updateAccountInfoSql,params, function(err,results) {
                if(err) {
                    console.error(err);
                    callback(err,null);
                    return;
                }
                callback(null,"done");
            })
        } else {
            calback(new Error("unknown error in updateAccountInformation with customerId-"+customerId),null);

        }

    });
}

exports.updatePasswordForUserAccount = function(updateData,customerId, randomKey, callback) {

    verifyUser(customerId, randomKey, function(err,results){

        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }

        if(updateData.password!= updateData.passwordConfirm) {
            callback(new Error("两次输入的密码不匹配."), null);
            return;
        } else if(updateData.password.length<8) {
            callback(new Error("The length of password should not less than 8."), null);
            return;
        }


        if(results && results == "done") {
            var updatePasswordSql = " update " + tableNames.customerTable + " set password = ? where customer_id= ? ";
            dbPool.runQueryWithParams(updatePasswordSql,[encryptionUtil.saltAndHash(updateData.password),customerId], function(err,results) {
                if(err) {
                    console.error(err);
                    callback(err,null);
                    return;
                }
                callback(null,"done");
            })
        } else {
            calback(new Error("unknown error in updatePasswordForUserAccount with customerId-"+customerId),null);

        }
    });
}

//user login with email and password
exports.manualLogin = function(email, pass, callback) {
    var authSql = " select user_id, first_name, last_name, email, password from " +tableNames.USER_TABLE+ " where email=? and provider = ?";

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
                    returnObj.provider = constants.login.LOGIN_PROVIDER.WILLGIVE;
                    returnObj.userId = results[0].user_id;
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

    console.dir(newData);
    console.log("Logging newData: "+newData.password+"----"+newData.passwordConf);
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
    var newAccountSql = " insert into " + tableNames.USER_TABLE + " ( email, password, first_name, last_name, display_name, provider) " +
        " values (?,?,?,?,?,?) ";

    var params = [newData.email, encryptionUtil.saltAndHash(newData.password), newData.firstName,
        newData.lastName, newData.firstName, newData.provider]

    dbPool.runQueryWithParams(newAccountSql, params, function(err,results) {
        if(err) {
            console.error(err);
            callback(new Error("This email is already in use. Please use Forgot Password from the login page to retrieve account."),null);
            return;
        }
        callback(null,results);
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
    userInfo.password="facebook:"+fbUserData.id;
    userInfo.passwordConf="facebook:"+fbUserData.id;
    userInfo.firstName = fbUserData.first_name;
    userInfo.lastName = fbUserData.last_name;
    userInfo.displayName = fbUserData.first_name; //Display firstname if login with FB
    userInfo.email=fbUserData.email;
    userInfo.provider=constants.login.LOGIN_PROVIDER.FACEBOOK;

    var returnObj={};

    var sql = " select user_id, email, display_name from "+ tableNames.USER_TABLE +" where email = ? and provider = ?";

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
                returnObj.firstName = userInfo.firstName;
                returnObj.lastName = userInfo.lastName;
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
                console.dir(results);
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
                    returnObj.firstName = userInfo.firstName;
                    returnObj.lastName = userInfo.lastName;
                    returnObj.displayName = userInfo.displayName; //userInfo
                    returnObj.sessionId = logResult.sessionId;
                    callback(null, returnObj);
                })

            })

        }
    })



}



