/**
 * Created by XiTU on 1/23/15.
 */

var tableNames = require('./../common/tableNames').TABLE_NAMES;
var stringUtils = require('./../utils/stringUtils');
var dbPool = require('../db/createDBConnectionPool');
var constants = require('./../common/constants');
var encryptionUtil = require('./../utils/encryptionUtil');
var emailUtil = require('./../utils/emailUtil');
var qrCode = require('../utils/qrCodeGenerator');

exports.createNewRecipient = function(recipient, callback) {
    var logger = require('../../app').logger;
    logger.debug('just for test');
    var insertSql = 'Insert into ' + tableNames.RECIPIENT_TABLE +
        ' (email, password, name, ein, status, category, address, city, state, zipCode, country, phone, fax, ' +
        '   contactPersonName, contactPersonTitle, mission, website, facebookUrl ) VALUES (' +
        '   ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ' +
        '   ?, ?, ?, ?, ?  ) ' ;
    var params = [recipient.email.trim(), encryptionUtil.saltAndHash(recipient.password), recipient.name.trim(),
        recipient.ein.trim(), 'Checking', recipient.category, recipient.address, recipient.city, recipient.state, recipient.zipCode,
        recipient.country, recipient.phone, recipient.fax, recipient.contactPersonName, recipient.contactPersonTitle,
        recipient.mission.trim(), recipient.website, recipient.facebookPage];

    dbPool.runQueryWithParams(insertSql,params,function(err,results){
        if(err) {
            logger.error(err);
            callback(new Error("This email is already in use. Please use Forgot Password from the login page to retrieve account."),null);
            return;
        }
        //successfully created a new recipient
        //create QR code for the recipient;
        var recipientId = results.insertId;
        recipient.recipientId = recipientId;
        qrCode.generateQRCode(recipient, __dirname + '/../../'+constants.paths.RECIPIENT_FOLDER+'/QR_'+recipientId+'.png');
        callback(null, recipientId);
        // Send out Welcome emails to new registered recipient.
        // No callback on sending email
        if(recipient.email) {
            var mailOptions = {
                from: "WillGive <willgiveplatform@gmail.com>", // sender address
                to: recipient.email, // list of receivers
                subject: "Welcome to WillGive", // Subject line
                html: constants.emails.welcomeEmail.replace('{FirstName}', recipient.organizationName) // html body
            };
            emailUtil.sendEmail(mailOptions,function(err,results){
                if(err) {
                    logger.error(err);
                    return;
                }
                logger.info("successfully sending emails");
            });
        }
    });


}

exports.recipientLogin = function(username, password, callback) {
    var logger = require('../../app').logger;

    var authSql = " select recipientId, name, email, password, imageUrl from " +tableNames.RECIPIENT_TABLE+ " where email=?";

    var returnObj = {};
    returnObj.isAuthenticated = false;

    dbPool.runQueryWithParams(authSql,[username], function(err, results) {
        if(err) {
            returnObj.errorMessage="Email or password is incorrect. Please try it again";
            callback(err,returnObj);
            return;
        }
        console.dir(results);
        if(results && results.length==1) {
            if(encryptionUtil.validatePassword(password, results[0].password )) {
                logger.info("In RecipientLogin recipient-"+results[0].recipientId);


                returnObj.isAuthenticated = true;
                returnObj.email = username;
                returnObj.provider = constants.login.LOGIN_PROVIDER.RECIPIENT;
                returnObj.userId = results[0].recipientId;
                returnObj.imageIconUrl = results[0].imageUrl;
                returnObj.firstName = results[0].name;
                returnObj.lastName = '';
                returnObj.displayName = results[0].name;
                returnObj.sessionId = '';
                callback(null, returnObj);

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

//Not used, the same as getCharityById
exports.getRecipientAccountInfo = function(recipientId, callback) {

    var logger = require('../../app').logger;

    var sql = 'select recipientId, name, ein, status, category, address, city, state, zipCode, country, phone, fax, ' +
        ' contactPersonName, contactPersonTitle, ' +
        ' CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, website, ' +
        ' facebookUrl, "" as imagePath, rating from ' + tableNames.RECIPIENT_TABLE + ' where recipientId = ? ';

    logger.info("Getting recipient data for recipientId-"+recipientId);
    dbPool.runQueryWithParams(sql,[recipientId],function(err,results){
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        if(results && results.length==1) {

            callback(null, results[0]);
        } else {
            logger.error('The length of result is not equal to 1');
            callback(new Error("Internal Error. Please try it again."), null);
        }
    });
}
