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
    var sql=' update  ' + tableNames.PAYMENT_METHOD_TABLE+ ' set stripe_customerId = ? where user_id=? ';


    dbPool.runQueryWithParams(sql,[stripe_customer_id],[userId],function(err,results){
        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }
        if(results && results.length==1) {


        } else {
            callback(new Error("failed to update stripe token in payment method table."), null);
        }
    });

}


exports.insertTransactionHistroy = function(userId,stripe_customer_id, callback) {
    var sql=' update  ' + tableNames.PAYMENT_METHOD_TABLE+ ' set stripe_customerId = ? where user_id=? ';


    dbPool.runQueryWithParams(sql,[stripe_customer_id],[userId],function(err,results){
        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }
        if(results && results.length==1) {


        } else {
            callback(new Error("failed to update stripe token in payment method table."), null);
        }
    });

}
