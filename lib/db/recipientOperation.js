/**
 * Created by XiTU on 1/23/15.
 */

var tableNames = require('./../common/tableNames').TABLE_NAMES;
var conn = require('./../db/createDBConnectionPool');
var stringUtils = require('./../utils/stringUtils');
var dbPool = require('../db/createDBConnectionPool');
var constants = require('./../common/constants');
var encryptionUtil = require('./../utils/encryptionUtil');
var emailUtil = require('./../utils/emailUtil');
var qrCode = require('../utils/qrCodeGenerator');

exports.createNewRecipient = function(recipient, callback) {

    //get all field names of the json
    var columnNames = recipient.columnNames; //an array of names
    var columnValues = recipient.columnValues; // an array of values
    if(columnNames.length != columnValues.length) {
        console.error('The length of columnNames and columnValues do not match');
        callback(new Error("Internal Error. Please try it again"), null);
    }
    columnNames.push('status');
    columnValues.push('Authenticating');

    var insertSql = 'Insert into ' + tableNames.RECIPIENT_TABLE +
        ' ( ' + stringUtils.getDelimitedStringFromArray(columnNames,',') +' ) VALUES ( ' +
        stringUtils.getDelimitedRepeatString('?',',',columnNames.length) + ' ) ' ;

    dbPool.runQueryWithParams(sql,[recipientId],function(err,results){
        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }
        //successfully created a new recipient
        //create QR code for the recipient;
        var recipientId = results.insertId;
        var qrMessage = recipientId; //add more information to the qrcode
        qrCode.generateQRCode(qrMessage, constants.paths.QR_CODE_FOLDER+'/QR_'+recipientId+'.png');
        callback(null, constants.services.CALLBACK_SUCCESS);
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
                    console.error(err);
                }
                console.log("successfully sending emails");
                return;
            });
        }
    });


}

exports.recipientLogin = function(recipientLoginInfo, callback) {
    recipientLoginInfo.email;
    recipientLoginInfo.password;

}

exports.getRecipientAccountInfo = function(recipientId, callback) {
    var sql = 'select * from ' + tableNames.RECIPIENT_TABLE + ' where recipient_id = ? ';

    console.log("Getting recipient data for recipientId-"+recipientId);
    dbPool.runQueryWithParams(sql,[recipientId],function(err,results){
        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }
        if(results && results.length==1) {
            //the fields of result is the same of column name of RECIPIENT_TABLE
            callback(null, results);
        } else {
            console.error('The length of result is not equal to 1');
            callback(new Error("Internal Error. Please try it again."), null);
        }
    });
}