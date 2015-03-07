/**
 * Created by XiTU on 7/2/14.
 */

var tableNames = require('./../common/tableNames').TABLE_NAMES;
var conn = require('./../db/createDBConnectionPool');
var stringUtil = require('./../utils/stringUtils');
var dbPool = require('./../db/createDBConnectionPool');
var constants = require('./../common/constants');
var emailUtil = require('./../utils/emailUtil');
var encryptionUtil = require('./../utils/encryptionUtil');
var logger = require('../../app').logger;


//Actions when user forgot his email
// Generate an random number, then send user an email,
//user need to follow the link to update password within half an hour
var validateEmailLink = function(email,randomString,callback){
    var validateSql = "select * from "+tableNames.USER_FIND_PASSWORD + " where email = ? and randomString = ? and isActive='Y' and " +
        " requestDatetime >  now() - INTERVAL " + constants.login.FIND_PASSWORD_VALID_MINUTES +" MINUTE ";

    dbPool.runQueryWithParams(validateSql,[email, randomString],function(err,results){
        if(err){
            logger.error(err);
            callback(err,null);
            return;
        }

        if(results && results.length>0) {
            callback(null,constants.services.CALLBACK_SUCCESS);
        } else {
            callback(null,constants.services.CALLBACK_FAILED);
        }

    });
}

var markLinkInActive = function(email,randomString, callback) {
    var markSql = "update "+tableNames.USER_FIND_PASSWORD + " set isActive='N' where email= ? and randomString = ? and isActive='Y' ";
    dbPool.runQueryWithParams(markSql,[email,randomString],function(err,results){
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null,results);
    })
}

exports.validateEmailLink=validateEmailLink;

exports.forgotPassword = function(email,callback){
    var randomString = stringUtil.generateRandomString(15);
    var findPasswordUrl = constants.SITE_URL+"/login/resetPassword"+"?email="+email+'&randomString='+randomString;

    var checkEmailSql = "select * from "+tableNames.USER_TABLE
        + " where email=? and provider='"+constants.login.LOGIN_PROVIDER.WILLGIVE+"' ";

    dbPool.runQueryWithParams(checkEmailSql,[email],function(err,results){

        if(err) {
            logger.error(err);
            callback(new Error("Internal Error. Please try it again."),null);
            return;
        }

        if(results && results.length==1) {
            var sql = "insert into "+tableNames.USER_FIND_PASSWORD + " (email,randomString) values (?,?) ";

            dbPool.runQueryWithParams(sql,[email, randomString],function(err,results){
                if(err) {
                    logger.error(err);
                    callback(new Error("Internal Error. Please try it again."),results);
                    return;
                }

                if(results && results.affectedRows==1) {
                    // setup e-mail data with unicode symbols
                    var mailOptions = {
                        from: "WillGive <willgiveplatform@gmail.com>", // sender address
                        to: email, // list of receivers
                        subject: "Find your password back", // Subject line
                        html: "Please click the following link <a href=\""+findPasswordUrl+"\">find password</a> to update your password.</br>" +
                            "<b>The link will be valid for only 30 minutes</b>"  // html body
                    }
                    emailUtil.sendEmail(mailOptions,function(err,results){
                        if(!err) {
                            callback(null,constants.services.CALLBACK_SUCCESS);
                        } else {
                            logger.error(err);
                            callback(new Error("Send email failed. Please try it again."),null);
                        }
                        return;
                    })
                } else {
                    callback(new Error("Internal Error. Please try it again."),null);
                }

            })
        } else {
            callback(new Error("This email doesn't exist. Please sign up first."),null);
        }
    })


}

exports.updatePasswordByEmail = function(email, randomString, newPassword, callback) {

    //console.log("!!!!!password-"+newPassword);
    validateEmailLink(email,randomString,function(err,results){

        if(err){
            logger.error(err);
            callback(new Error("This link is no longer valid."), null);
            return;
        }
        if(results==constants.services.CALLBACK_SUCCESS) {
            var updatePasswordSql = "update " + tableNames.USER_TABLE + " set password = ? " +
                " where email=? and provider='"+constants.login.LOGIN_PROVIDER.WILLGIVE+"' ";
            dbPool.runQueryWithParams(updatePasswordSql,[encryptionUtil.saltAndHash(newPassword),email],function(err,results){
                if(err){
                    logger.error(err);
                    callback("Internal Error. Please try it again.",null);
                    return;
                }
                logger.debug(results);
                if(results && results.affectedRows==1) {

                    callback(null,constants.services.CALLBACK_SUCCESS);
                    markLinkInActive(email,randomString,function(err,results){//do nothing
                    });  //If it fails, doesn't affect anything
                } else {
                    callback(new Error("Internal Error. Please try it again."),null);
                }
            })
        } else {
            callback(new Error("This link is no longer valid."), null);
        }

    })


}