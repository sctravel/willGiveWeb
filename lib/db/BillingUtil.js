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
var logger = require('../../app').logger;


exports.updatePaymentMethodStripeId = function(userId,stripe_customer_id, callback) {

    logger.debug("start updating payment method");
    queryExistingStripCustomers(userId,function(err,results){

        logger.debug("start queryExistingStripCustomers");

    /*
        if(err){
            console.error(err);
            res.send(constants.services.CALLBACK_FAILED);
            return;
        }*/
        logger.debug(results);
        if(results[0] == undefined){

            var sqlInsert = ' insert into ' + tableNames.PAYMENT_METHOD_TABLE + " ( user_id, stripe_customerId,type,cvc,address,phone,nameOnCard,expirationDate) values " +
                                                                                  "(?,?,null,null,null,null,null,null) ";

            console.dir(sqlInsert);

            console.dir("userId:"+ userId);

            console.dir("stripe_customer_id:"+ stripe_customer_id);

            dbPool.runQueryWithParams(sqlInsert, [userId,stripe_customer_id], function (err, results) {
                if(err) {
                    console.error(err);
                    callback(err,null);
                    return;
                }

                callback(null,constants.services.CALLBACK_SUCCESS);
            });

        }
        else{

            var sqlupdate = ' update ' + tableNames.PAYMENT_METHOD_TABLE + ' set stripe_customerId = ? where user_id = ? ';
            console.dir(sqlupdate);


            dbPool.runQueryWithParams(sqlupdate, [stripe_customer_id, userId], function (err, results) {
                if(err) {
                    console.error(err);
                    callback(err,null);
                    return;
                }

                callback(null,constants.services.CALLBACK_SUCCESS);
            });
        }

    });



}


var queryExistingStripCustomers = function(userId, callback) {

    var sql = 'select stripe_customerId from ' + tableNames.PAYMENT_METHOD_TABLE + ' where user_id=? ';

    console.dir(sql);

    dbPool.runQueryWithParams(sql, [userId], function (err, results) {
        if(err) {
            console.error(err);
            callback(err,results);
            return;
        }

        if(results[0] == null) {

            console.dir("result is null in database ");
            callback(err,results);
            return;
        }

        if(results[0].stripe_customerId== null) {

            console.dir("result in DB"+results[0]);
            callback(err,results);
            return;
        }

        console.dir("final results in DB"+results);
        console.dir("final results in DB stripe_customerId: "+results[0].stripe_customerId);

        callback(err,results[0].stripe_customerId);

        //callback(null,constants.services.CALLBACK_SUCCESS);
    });

}

exports.queryExistingStripCustomers= queryExistingStripCustomers;

//amount,user_id,recipient_id,Date.now(),Date.now(),"Processing",
exports.insertTransactionHistroy = function(transaction_id,amount,user_id,recipient_id, status,notes,stripeToken, callback) {
    var sql="insert into  " + tableNames.TRANSACTION_TABLE +
        " ( transaction_id, amount,user_id,recipient_id,dateTime,settleTime,status,notes,stripeToken,source,confirmationCode) values " +
        "(?,                   ?,    ?,            ?,      NOW(), NOW(),      ?,       ?        ,?,'Web',        UUID()) ";

    console.dir(sql);

    console.dir("DB: recipient_id:" + recipient_id);

    dbPool.runQueryWithParams(sql,[transaction_id,amount,user_id,recipient_id, status,notes,stripeToken],function(err,results){

        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }

        callback(null,constants.services.CALLBACK_SUCCESS);

    });

}

exports.insertUserPledge = function(userPledge, callback) {
    var sql = "insert into " + tableNames.TRANSACTION_TABLE + "( transaction_id, amount, user_id, recipient_id, status ) values ( ?, ?, ?, ?, ? ) ";
    logger.info(userPledge);

    var transactionId = stringUtil.generateUniqueId(userPledge.userId);
    dbPool.runQueryWithParams(sql,[ transactionId, userPledge.amount,userPledge.userId, userPledge.recipientId, constants.paymentStatus.Pledge],function(err,results){

        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }

        callback(null,constants.services.CALLBACK_SUCCESS);

    });

}

exports.getTransactionHistoryBasedOnConfirmationCode = function(confirmationCode, callback) {
    var sql = 'select transaction_id, amount, user_id, recipient_id,dateTime,notes from ' + tableNames.TRANSACTION_TABLE +
        ' where  confirmationCode = ? and status= \'Processed\' order by datetime desc ';

    console.dir(sql);


    dbPool.runQueryWithParams(sql,[confirmationCode],function(err, results){
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null, results);
    });

}

exports.getConfirmationCode = function(transaction_id, callback) {
    var sql = 'select confirmationCode from ' + tableNames.TRANSACTION_TABLE +
        ' where  transaction_id = ?';

    console.dir(sql);


    dbPool.runQueryWithParams(sql, [transaction_id], function (err, results) {
        if (err) {
            logger.error(err);
            callback(err, null);
            return;
        }
        callback(null, results[0].confirmationCode);
    });
}

