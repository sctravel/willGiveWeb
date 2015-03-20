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

            var sqlInsert = ' insert into ' + tableNames.PAYMENT_METHOD_TABLE + " ( userId, stripeCustomerId,type,cvc,address,phone,nameOnCard,expirationDate) values " +
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

            var sqlupdate = ' update ' + tableNames.PAYMENT_METHOD_TABLE + ' set stripeCustomerId = ? where userId = ? ';
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


var updateTransactionHistroy = function (confirmationCode, callback) {

    var sqlupdate = ' update ' + tableNames.TRANSACTION_TABLE + ' set status = ? where confirmationCode = ? ';
    console.dir(sqlupdate);


    dbPool.runQueryWithParams(sqlupdate, [constants.paymentStatus.PAID, confirmationCode], function (err, results) {
        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }

        callback(null,constants.services.CALLBACK_SUCCESS);
    });

}

exports.updateTransactionHistroy= updateTransactionHistroy;

    var queryExistingPledgeByConfirmationCode = function (confirmationCode, callback){

    var sql = 'select pm.stripeCustomerId, ut.amount, ut.recipientId from payment_method pm inner join user_transactions ut on pm.userId= ut.userId where ut.confirmationCode=? ';

    console.dir(sql);

    dbPool.runQueryWithParams(sql, [confirmationCode], function (err, results) {
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

        if(results[0].stripeCustomerId== null) {

            console.dir("result in DB"+results[0]);
            callback(err,results);
            return;
        }

        console.dir("final results in DB"+results);
        console.dir("final results in DB stripeCustomerId: "+results[0]);

        callback(err,results[0]);

        //callback(null,constants.services.CALLBACK_SUCCESS);
    });

}

exports.queryExistingPledgeByConfirmationCode= queryExistingPledgeByConfirmationCode;

var queryExistingStripCustomers = function(userId, callback) {

    var sql = 'select stripeCustomerId from ' + tableNames.PAYMENT_METHOD_TABLE + ' where userId=? ';

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

        if(results[0].stripeCustomerId== null) {

            console.dir("result in DB"+results[0]);
            callback(err,results);
            return;
        }

        console.dir("final results in DB"+results);
        console.dir("final results in DB stripeCustomerId: "+results[0].stripeCustomerId);

        callback(err,results[0].stripeCustomerId);

        //callback(null,constants.services.CALLBACK_SUCCESS);
    });

}

exports.queryExistingStripCustomers= queryExistingStripCustomers;

//amount,userId,recipientId,Date.now(),Date.now(),"Processing",
exports.insertTransactionHistroy = function(transactionId,amount,userId,recipientId, status,notes,stripeToken, callback) {
    var sql="insert into  " + tableNames.TRANSACTION_TABLE +
        " ( transactionId, amount,userId,recipientId,dateTime,settleTime,status,notes,stripeToken,source,confirmationCode) values " +
        "(?,                   ?,    ?,            ?,      CURDATE(), NOW(),      ?,       ?        ,?,'Web',        UUID()) ";

    console.dir(sql);

    console.dir("DB: recipientId:" + recipientId);

    dbPool.runQueryWithParams(sql,[transactionId,amount,userId,recipientId, status,notes,stripeToken],function(err,results){

        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }

        callback(null,constants.services.CALLBACK_SUCCESS);

    });

}

exports.insertUserPledge = function(userPledge, callback) {
    var sql = "insert into " + tableNames.TRANSACTION_TABLE + "( transactionId, amount, userId, recipientId, status, confirmationCode, notes ) values ( ?, ?, ?, ?, ?, UUID(), ? ) ";
    logger.info(userPledge);

    var transactionId = stringUtil.generateUniqueId(userPledge.userId);
    dbPool.runQueryWithParams(sql,[ transactionId, userPledge.amount,userPledge.userId, userPledge.recipientId,
        constants.paymentStatus.Pledge, userPledge.notes],function(err,results){

        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }

        callback(null,constants.services.CALLBACK_SUCCESS);

    });

}

exports.getTransactionHistoryBasedOnConfirmationCode = function(confirmationCode, callback) {
    var sql = 'select transactionId, amount, u.firstName, u.lastName, recipientId,dateTime,notes from ' + tableNames.TRANSACTION_TABLE + ' t ,' + tableNames.USER_TABLE + ' u' +
        ' where t.userId= u.userId and confirmationCode = ? and status= ?  order by datetime desc ';

    console.dir(sql);


    dbPool.runQueryWithParams(sql,[confirmationCode, constants.paymentStatus.PAID],function(err, results){
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null, results);
    });

}

exports.getConfirmationCode = function(transactionId, callback) {
    var sql = 'select confirmationCode from ' + tableNames.TRANSACTION_TABLE +
        ' where  transactionId = ?';

    console.dir(sql);


    dbPool.runQueryWithParams(sql, [transactionId], function (err, results) {
        if (err) {
            logger.error(err);
            callback(err, null);
            return;
        }
        callback(null, results[0].confirmationCode);
    });
}

exports.getUserSettings = function(userId, callback) {
    var sql = 'select maxAmountPerTime, maxAmountPerDay from user_settings where userId=' +  "'" + userId + "'";

    console.dir(sql);


    dbPool.runQueryWithParams(sql, function (err, results) {
        if (err) {
            logger.error(err);
            callback(err, null);
            return;
        }
        callback(null,results);
    });
}

exports.getDailyAmount = function(userId, callback) {
    var date  = new Date();
    var sql = 'select sum(amount) as dailyAmount from user_transactions where userId=' +  "'" + userId + "'" + " and datetime="
        + "'" + date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate() + "'"
         + " group by userid";

    console.dir(sql);


    dbPool.runQueryWithParams(sql, function (err, results) {
        if (err) {
            logger.error(err);
            callback(err, null);
            return;
        }
        callback(null,results);
    });
}