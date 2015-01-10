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


//Actions when user forgot his email
// Generate an random number, then send user an email,
//user need to follow the link to update password within half an hour
var validateEmailLink = function(email,randomString,callback){
    var validateSql = "select * from "+tableNames.USER_FIND_PASSWORD + " where email = ? and random_string = ? and is_active='Y' and " +
        " request_datetime >  now() - INTERVAL " + constants.login.FIND_PASSWORD_VALID_MINUTES +" MINUTE ";

    dbPool.runQueryWithParams(validateSql,[email,randomString],function(err,results){
        if(err){
            console.error(err);
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
    var markSql = "update "+tableNames.findPassword + " set is_active='N' where email= ? and random_string = ? and is_active='Y' ";
    dbPool.runQueryWithParams(markSql,[email,randomString],function(err,results){
        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }
        callback(null,results);
    })
}
exports.validateEmailLink=validateEmailLink;
exports.forgotPassword = function(email,callback){
    var randomString = stringUtil.generateRandomString(15);
    var findPasswordUrl = constants.url+"/findPassword"+"?email="+email+'&randomString='+randomString;

    var checkEmailSql = "select * from "+tableNames.customerTable + " where email=? and provider='sctravel' ";

    dbPool.runQueryWithParams(checkEmailSql,[email],function(err,results){

        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }

        if(results && results.length==1) {
            var sql = "insert into "+tableNames.findPassword + " (email,random_string) values (?,?) ";

            dbPool.runQueryWithParams(sql,[email,randomString],function(err,results){
                if(err) {
                    console.error(err);
                    callback(err,results);
                    return;
                }

                if(results && results.affectedRows==1) {
                    // setup e-mail data with unicode symbols
                    var mailOptions = {
                        from: "SCTravel <sctravel5757@gmail.com>", // sender address
                        to: email, // list of receivers
                        subject: "Find your password back", // Subject line
                        html: "<b>Please click the following link <a href=\""+findPasswordUrl+"\">find password</a> to update your password.</b></br>" +
                            "<b>The link will be valid for only 30 minutes</b>"  // html body
                    }
                    emailUtil.sendEmail(mailOptions,function(err,results){
                        if(!err) {
                            callback(null,constants.CALLBACK_SUCCESS);
                        } else {
                            console.error(err);
                        }
                    })
                } else {
                    callback(new Error("unknown error"),null);
                }

            })
        } else {
            callback(null,"none");
        }
    })


}

exports.findPasswordByEmail = function(email,randomString, newPassword, callback) {


    validateEmailLink(email,randomString,function(err,results){

        if(err){
            console.error(err);
            callback(err,null);
            return;
        }
        console.warn("new password is -"+newPassword);
        if(results==constants.CALLBACK_SUCCESS) {
            var updatePasswordSql = "update " + tableNames.customerTable + " set password = ? where email=? and provider='sctravel' ";
            dbPool.runQueryWithParams(updatePasswordSql,[encryptionUtil.saltAndHash(newPassword),email],function(err,results){
                if(err){
                    console.error(err);
                    callback(err,null);
                    return;
                }
                console.dir(results);
                if(results && results.affectedRows==1) {

                    callback(null,constants.CALLBACK_SUCCESS);
                    markLinkInActive(email,randomString,function(err,results){//do nothing
                                           });  //If it fails, doesn't affect anything
                }else {
                    callback(new Error("unknown error"),null);
                }
            })
        } else {
            callback(null,results);
        }

    })


}