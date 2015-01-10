/**
 * Created by XiTU on 4/20/14.
 */

var tableNames = require('./../common/tableNames').TABLE_NAMES;
var conn = require('./../dbOperation/createDBConnectionPool');
var stringUtil = require('./../utilities/stringUtils');
var dbPool = require('./../dbOperation/createDBConnectionPool');
var constants = require('./../common/constants');
var encryptionUtil = require('./../utilities/encryptionUtil');

function loginCustomerLoginHistory(userId, callback) {
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


exports.logoutCustomerLoginHistory = function(userId, sessionId, callback) {

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

exports.manualLogin = function(username, pass, callback) {
    var authSql = " select customer_id, first_name, last_name, username, password from " +tableNames.customerTable+ " where username=? ";

    var returnObj = {};
    returnObj.isAuthenticated = false;

    //TODO hash the password
    conn.runQueryWithParams(authSql,[username], function(err,results) {
        if(err) {
            returnObj.errorMessage="Internal error, please try again";
            callback(err,returnObj);
            return;
        }
        console.dir(results);
        if(results && results.length==1) {
            if(encryptionUtil.validatePassword(pass,results[0].password )) {
                console.dir(results[0]);
                console.log("In ManualLogin customerId-"+results[0].customer_id);

                loginCustomerLoginHistory(results[0].customer_id, function(err, logResult){
                    if(err) {
                        console.err(err);
                        callback(err,returnObj);
                        return;
                    }
                    returnObj.isAuthenticated = true;
                    returnObj.provider = constants.login.LOGIN_PROVIDER.WILLGIVE;
                    returnObj.customerId = results[0].customer_id;
                    returnObj.firstName = results[0].first_name;
                    returnObj.lastName = results[0].last_name;
                    returnObj.sessionId = logResult.sessionId;
                    callback(null, returnObj);
                })

            } else {
                returnObj.errorMessage = " Password is incorrect. ";
                callback(null, returnObj);
            }
        } else {
            returnObj.errorMessage = " This user doesn't exist. ";
            callback(null, returnObj);
        }
    });
}
function verifyUser(customerId, randomKey, callback) {
    var verifySql = " select  random_key from " + tableNames.customerLoginHistoryTable  +
        " where customer_id = ? and login_datetime > now() - INTERVAL "+ constants.SESSION_HOURS + " HOUR ";

    dbPool.runQueryWithParams(verifySql, [customerId], function(err, results){
        if(err) {
            callback(err,null);
            return;
        }
        if(results && results.length>=1) {
            for(var i in results) {
                if(results[i].random_key == randomKey) {
                    console.info("customerId-"+customerId+" verified.");
                    callback(null,constants.CALLBACK_SUCCESS);
                    return;
                }
            }
            callback(new Error("no randomKey matches"),null);

        } else {
            callback(new Error("unknown error"),null);
        }
    })
}
exports.verifyUser = verifyUser;


function addNewUserAccount(newData, callback) {

    if(newData.password!= newData.passwordConf) {
        callback(new Error("Password doesn't match with password confirmation."), null);
        return;
    }

    var newAccountSql = " insert into " + tableNames.USER_TABLE + " ( email, password, first_name, last_name, display_name, provider) " +
        " values (?,?,?,?,?,?) ";

    var params = [newData.email, encryptionUtil.saltAndHash(newData.password), newData.firstName,
        newData.lastName, newData.displayName, newData.provider]

    dbPool.runQueryWithParams(newAccountSql, params, function(err,results) {
        if(err) {
            console.error(err);
            callback(err,null);
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
    userInfo.email=fbUserData.email;
    userInfo.provider=constants.login.LOGIN_PROVIDER.FACEBOOK;

    var returnObj={};

    var sql = " select customer_id, email from "+ tableNames.customerTable +" where username = ? ";

    dbPool.runQueryWithParams(sql,[userInfo.username],function(err,results){
        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }
        if(results && results.length==1) { //the account is already registered
            loginCustomerLoginHistory(results[0].customer_id, function(err, logResult){
                if(err) {
                    console.err(err);
                    callback(err,returnObj);
                    return;
                }
                returnObj.isAuthenticated = true;
                returnObj.provider = constants.LOGIN_PROVIDER.FACEBOOK;
                returnObj.customerId = results[0].customer_id;
                returnObj.firstName = userInfo.firstName;
                returnObj.lastName = userInfo.lastName;
                returnObj.randomKey = logResult.randomKey;
                callback(null, returnObj);
            })
        } else { //create new account with facebook information
            addNewCustomerAccount(userInfo,function(err,results){
                if(err) {
                    callback(err,null);
                    return;
                }
                console.dir(results);
                var customerId = results.insertId;

                loginCustomerLoginHistory(customerId, function(err, logResult){
                    if(err) {
                        console.error(err);
                        callback(err,returnObj);
                        return;
                    }
                    returnObj.isAuthenticated = true;
                    returnObj.provider = constants.LOGIN_PROVIDER.FACEBOOK;
                    returnObj.customerId = customerId;
                    returnObj.firstName = userInfo.firstName;
                    returnObj.lastName = userInfo.lastName;
                    returnObj.randomKey = logResult.randomKey;
                    callback(null, returnObj);
                })

            })

        }
    })



}



