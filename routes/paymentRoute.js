/**
 * Created by Yichuan on 2/12/2015.
 */
//query if it's known customer

module.exports = function(app) {
    var billingUtil = require('../lib/db/BillingUtil');

    var userLogin = require('../lib/db/userLogin');
    var constants = require('../lib/common/constants');
    var charityOps = require('../lib/db/charityOperation');
    var emailUtil = require('../lib/utils/emailUtil');
    var config = require('config');

    var isLoggedIn = require('../app').isLoggedIn;
    var logger = require('../app').logger;

    this.name = 'paymentRoute';

    var stripeKey = config.get('stripeKey');

    app.get('/services/user/getTransactionHistory/:confirmationCode', function(req, res){

        var confirmationCode = req.params.confirmationCode;

        console.dir("confirmationCode: "+confirmationCode);

        billingUtil.getTransactionHistoryBasedOnConfirmationCode(confirmationCode,function(err, results){
            if(err){
                logger.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            logger.debug(results);
            res.send(results);
        })
    })


    app.get('/services/payment/stripePayment/queryUser/', function (req, res) {

        var userId = req.query.userId;

        console.dir("start calling feed: /services/payment/stripePayment/queryUser/ userId:" + userId);
        billingUtil.queryExistingStripCustomers(userId, function (err, customerToken) {
            if (err) {
                console.error("end calling feed: /services/payment/stripePayment/queryUser/"+err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            console.dir("end calling feed: /services/payment/stripePayment/queryUser/ userId:query results: " + customerToken);
            res.send(customerToken);
        });

    });

    //TODO: why we have it here? we already have it in userProfiles, remove this one
    app.get('/services/payment/userSettings/:userId', function(req, res) {

            var userId =req.params.userId;

            billingUtil.getUserSettings(userId, function(err, results){

                       a = results;
                if(err) {
                    console.error(err);
                    res.send(constants.services.CALLBACK_FAILED);
                    return;
                }
                res.send(results);
            })
    });

    app.get('/services/payment/dailyAmount/:userId', function(req, res) {

        var userId =req.params.userId;

        billingUtil.getDailyAmount(userId, function(err, results){

            a = results;
            if(err) {
                console.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            res.send(results);
        })
    });


    app.post('/services/payment/pledge', isLoggedIn, function(req, res) {
        var userPledge = {};
        userPledge.amount = req.body.amount;
        userPledge.userId = req.user.userId;
        userPledge.recipientId = req.body.recipientId;
        userPledge.notes = req.body.notes ? req.body.notes : '';

        billingUtil.insertUserPledge(userPledge, function(err, results){
            if(err) {
                console.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            res.send(constants.services.CALLBACK_SUCCESS);
        })
    });

    app.get('/services/payment/stripePayment/queryPledge/', function (req, res) {

        var confirmationCode = req.query.confirmationCode;

        billingUtil.queryExistingPledgeByConfirmationCode(confirmationCode, function (err, PledgeInfo) {
            if (err) {
                console.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            console.dir("queryPledge results: " + PledgeInfo);
            res.send(PledgeInfo);
        });

    });

    app.post('/services/payment/stripePayment', isLoggedIn, function (req, res) {
        var stripe = require("stripe")(stripeKey);

        // (Assuming you're using express - expressjs.com)
        // Get the credit card details submitted by the form
        var stripeToken = req.body.stripeToken;
        var amount = req.body.amount;
        var recipientId = req.body.recipientId;
        var notes =req.body.notes;
        var rememberMe = req.body.rememberMe;
        var stripeCustomerId = req.body.stripeCustomerId;
        var confirmationCode  = req.body.confirmationCode;
        var isPledge = req.body.isPledge;

        var url = req.url;
        var userId = req.user.userId;

        console.dir("/services/payment/stripePayment amount:" + amount);
        //save transaction history into database
        console.dir("/services/payment/stripePayment confirmationCode:" + confirmationCode);
        console.dir("/services/payment/stripePayment isPledge:" + req.body.isPledge);
        //logic for customers already has StripeCustomerIDs
        console.dir("/services/payment/stripePayment stripeCustomerId in app.js:" + stripeCustomerId);

        //If the customer has binding payment information
        if (stripeCustomerId && stripeCustomerId.length > 10) { //stripeCustomerId is always more than 10 letters
            stripe.charges.create({
                amount: amount * 100, // amount in cents, again
                currency: "usd",
                customer: stripeCustomerId
            },function(err, charge) {
                if(err) {
                    logger.error(err);
                    res.send(constants.services.CALLBACK_SUCCESS);
                    return;
                }
                // asynchronously called
                //need to store in transaction history table as well
                //exports.insertTransactionHistroy = function(transactionId,amount,userId,recipientId, status,notes,stripeToken, callback)
                //TODO: use constant here for "Stripe_RecurrentPayment"
                var newTransactionId="Stripe_RecurrentPayment" + new Date().getTime() ;

                console.dir('@@@@@@@isPledge--'+isPledge);
                //Actual payment happening here
                if(isPledge == undefined || isPledge== null || !isPledge) {
                    billingUtil.insertTransactionHistroy(newTransactionId, amount, userId, recipientId, constants.paymentStatus.PAID, notes, stripeToken, function (err, results) {
                        if (err) {
                            console.error(" error"+ err);
                            //TODO why we need to refund in the logic, fix it
                            //create refund in case of DB error
                            stripe.charges.createRefund(
                                charge,
                                { },
                                function(err, refund) {
                                    // asynchronously called
                                }
                            );
                            res.send(constants.services.CALLBACK_SUCCESS);

                            return;
                        }

                        //TODO: ?? Why we need the confirmation code here ??????
                        // we can get it when we do the db insert
                        billingUtil.getConfirmationCode(newTransactionId, function (err, results) {

                            console.dir("Confirmation Code: " + results);

                            var mailOptions = {
                                from: "WillGive <willgiveplatform@gmail.com>", // sender address
                                to: req.user.email, // list of receivers
                                subject: "Thanks for the donation for WillGive", // Subject line
                                html: constants.emails.donationEmail.replace('{FirstName}', req.user.firstName).replace('{ConfirmationCode}', results) // html body
                            };
                            emailUtil.sendEmail(mailOptions, function (err, results) {
                                if (err) {
                                    logger.error(err);
                                }
                                logger.info("successfully sending emails");

                            });

                            console.log("done");
                            res.send(constants.services.CALLBACK_SUCCESS);
                            return;
                        });
                    });
                }
                //pledge is happening here
                else {
                    console.info("start updating transaction history for pledge");
                    billingUtil.updateTransactionHistroy(confirmationCode, function (err, results) {
                        if (err) {
                            console.error(err);
                            res.send(constants.services.CALLBACK_FAILED);
                            //We don't send email when payment fails
                            return;
                        }
                        var mailOptions = {
                            from: "WillGive <willgiveplatform@gmail.com>", // sender address
                            to: req.user.email, // list of receivers
                            subject: "Thanks for the donation for WillGive", // Subject line
                            html: constants.emails.donationEmail.replace('{FirstName}', req.user.firstName).replace('{ConfirmationCode}', confirmationCode) // html body
                        };
                        emailUtil.sendEmail(mailOptions, function (err, results) {
                            if (err) {
                                logger.error(err);
                            }
                            logger.info("successfully sending emails");
                        });

                        res.send(constants.services.CALLBACK_SUCCESS);
                        return;
                    });
                }
            });
        }
        //logic for customers don't have StripeCustomerIDs, need to create new ones
        else {

            stripe.customers.create({
                card: stripeToken,
                description: 'payinguser@example.com' // what is this?
            }).then(function (customer) {

                console.dir("using customerId:" + customer.id);

                var charge = stripe.charges.create({
                    amount: amount*100, // amount in cents, again
                    currency: "usd",
                    //card: stripeToken,
                    customer: customer.id,
                    description: "payinguser@example.com"
                    //customer: customer.id
                }, function (err, charge) {
                    if (err) {
                        logger.error(err);
                        logger.error("payment get declined ");

                        res.send(constants.services.CALLBACK_FAILED);
                        return;
                    }
                    //card https://stripe.com/docs/api#create_charge
                    //console.dir("last four of credit card: " + charge.source.last4);



                    //TODO: We need to insert transaction first then do the charge!!!
                    //"Stripe_RecurrentPayment" + new Date().getTime(), amount, userId, recipientId, "Processed", notes, stripeToken,
                    billingUtil.insertTransactionHistroy("Stripe_" + stripeToken, amount, userId, recipientId, constants.paymentStatus.PAID, notes,stripeToken, function (err, results) {
                        if (err) {
                            console.error(err);
                            //res.send(constants.services.CALLBACK_FAILED);
                            return;
                        }
                        // res.send(constants.services.CALLBACK_SUCCESS);
                    });

                    console.dir("rememberMe: " + rememberMe+ "; last4: " + charge.source.last4 + "; brand: "+ charge.source.brand +"; funding: "+charge.source.funding);

                    //We save customer payment information only when
                    // customer check the remember checkbox
                    if(rememberMe) {
                        console.dir("start saving customers");

                        billingUtil.updatePaymentMethodStripeId(userId, customer.id, charge.source, function (err, results) {
                            if (err) {
                                logger.error(err);
                                // If saving customer payment method fails, it doesn't hurt.
                                // We should ingore the failure, just log it
                                //res.send(constants.services.CALLBACK_FAILED);
                                //return;
                            }
                            console.dir("end saving customers");
                            res.send(constants.services.CALLBACK_SUCCESS);
                            return;
                        });
                    }


                });

            })
        }
    });
}