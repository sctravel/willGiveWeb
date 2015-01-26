/**
 * Created by Yichuan on 1/25/2015.
 */


var tableNames = require('./../common/tableNames').TABLE_NAMES;
var conn = require('./../db/createDBConnectionPool');
var stringUtil = require('./../utils/stringUtils');
var dbPool = require('../db/createDBConnectionPool');
var constants = require('./../common/constants');
var encryptionUtil = require('./../utils/encryptionUtil');
var emailUtil = require('./../utils/emailUtil');


exports.updatePaymentMethodStripeId = function(userId,stripe_customer_id, callback) {
    var sql = ' update ' + tableNames.PAYMENT_METHOD_TABLE + ' set stripe_customerId = ? where user_id=? ';

    dbPool.runQueryWithParams(sql, [stripe_customer_id, userId], function (err, results) {
        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }

        callback(null,constants.services.CALLBACK_SUCCESS);
    });

}

//amount,user_id,recipient_id,Date.now(),Date.now(),"Processing",
exports.insertTransactionHistroy = function(transaction_id,amount,user_id,recipient_id,dataTime,settleTime,status,stripeToken, callback) {
    var sql="insert into  " + tableNames.TRANSACTION_TABLE + " ( transaction_id, amount,user_id,recipient_id,dateTime,settleTime,status,stripeToken) values (?,?,?,?,NOW(),NOW(),?,?) ";

    console.dir("sql");

    dbPool.runQueryWithParams(sql,[transaction_id,amount,user_id,recipient_id,dataTime,settleTime,status,stripeToken],function(err,results){

        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }

        callback(null,constants.services.CALLBACK_SUCCESS);


    });

}
