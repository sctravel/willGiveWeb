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

    var isLoggedIn = require('../app').isLoggedIn;
    var logger = require('../app').logger;

    this.name = 'paymentRoute';


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



    app.get('/payment/stripePayment/queryUser/', function (req, res) {

        var userId = req.query.userId;

        console.dir("app userId:" + userId);

        billingUtil.queryExistingStripCustomers(userId, function (err, customerToken) {
            if (err) {
                console.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            console.dir("query results: " + customerToken);
            res.send(customerToken);
        });

    });

    app.post('/payment/pledge', isLoggedIn, function(req, res) {
        var userPledge = {};
        userPledge.amount = req.body.amount;
        userPledge.userId = req.user.userId;
        userPledge.recipientId = req.body.recipientId;

        billingUtil.insertUserPledge(userPledge, function(err, results){
            if(err) {
                console.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            res.send(constants.services.CALLBACK_SUCCESS);
        })
    });


    app.get('/payment/stripePayment/queryPledge/', function (req, res) {

        var confirmationCode = req.query.confirmationCode;

        billingUtil.queryExistingPledgeByConfirmationCode(confirmationCode, function (err, PledgeInfo) {
            if (err) {
                console.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            console.dir("query results: " + PledgeInfo);
            res.send(PledgeInfo);
        });


    });


    app.post('/payment/stripePledge', function (req, res) {

        console.dir("UserId in passport: " + req.user.userId);

        console.dir("app.js billing charityId: " + req.params.id);
        console.warn("start payment process");

        //'stripeToken
        console.dir("requset body:" + req.body);
        console.dir("stripeTokens:" + req.body.stripeToken);

        console.dir("receipientId: " + req.body.receipientId);

        console.dir("stripeCustomerId: " + req.body.stripeCustomerId);

        console.dir("payment Notes: " + req.body.notes);

        var notes =req.body.notes;
        var stripe = require("stripe")("sk_test_zjF1XdDy0TZAYnuifaHR0iDf");

// (Assuming you're using express - expressjs.com)
// Get the credit card details submitted by the form
        var stripeToken = req.body.stripeToken;

        var amount = req.body.amount;
        var url = req.url;

        var recipientId = req.body.receipientId;

        console.dir("url:" + url);
        console.dir("amount:" + amount);
        //save transaction history into database

        var stripeCustomerId = req.body.stripeCustomerId;

        console.dir("UserId in passport: " + req.user.userId);
        userId = req.user.userId;

        //logic for customers already has StripeCustomerIDs

        console.dir("stripeCustomerId in app.js:" + stripeCustomerId);
        if (stripeCustomerId && stripeCustomerId != 0) {
            stripe.charges.create({
                amount: amount * 100, // amount in cents, again
                currency: "usd",
                customer: stripeCustomerId
            });



            return;
        }


        //logic for customers don't have StripeCustomerIDs, need to create new ones

        console.dir("start saving customers");
        stripe.customers.create({
            card: stripeToken,
            description: 'payinguser@example.com'
        }).then(function (customer) {

            console.dir("using customerId:" + customer.id);
            console.dir("creating customers");

            //update customerId into for payment method table



            billingUtil.updatePaymentMethodStripeId(userId, customer.id, function (err, results) {
                if (err) {
                    console.error(err);
                    res.send(constants.services.CALLBACK_FAILED);
                    return;
                }
                //res.send(results);
            });

            console.dir("end saving customers");

            var charge = stripe.charges.create({
                amount: amount*100, // amount in cents, again
                currency: "usd",
                card: stripeToken,
                description: "payinguser@example.com"
                //customer: customer.id
            }, function (err, charge) {
                if (err && err.type === 'StripeCardError') {
                    // The card has been declined
                }

                console.dir("recipientId: " + recipientId);
                //"Stripe_RecurrentPayment" + new Date().getTime(), amount, userId, recipientId, constants.paymentStatus.PAID, notes, stripeToken,
                billingUtil.insertTransactionHistroy("Stripe_" + stripeToken, amount, userId, recipientId, constants.paymentStatus.PAID, notes,stripeToken, function (err, results) {
                    if (err) {
                        console.error(err);
                        //res.send(constants.services.CALLBACK_FAILED);
                        return;
                    }
                    // res.send(constants.services.CALLBACK_SUCCESS);
                });

            });

            console.dir("end saving charges");


            console.warn("end payment process");

        })


    });

    app.post('/payment/stripePayment', function (req, res) {

        console.dir("UserId in passport: " + req.user.userId);

        console.dir("app.js billing charityId: " + req.params.id);
        console.warn("start payment process");

        //'stripeToken
        console.dir("requset body:" + req.body);
        console.dir("stripeTokens:" + req.body.stripeToken);

        console.dir("receipientId: " + req.body.receipientId);

        console.dir("stripeCustomerId: " + req.body.stripeCustomerId);

        console.dir("payment Notes: " + req.body.notes);

        var notes =req.body.notes;
        var stripe = require("stripe")("sk_test_zjF1XdDy0TZAYnuifaHR0iDf");

// (Assuming you're using express - expressjs.com)
// Get the credit card details submitted by the form
        var stripeToken = req.body.stripeToken;

        var amount = req.body.amount;
        var url = req.url;

        var recipientId = req.body.receipientId;

        console.dir("url:" + url);
        console.dir("amount:" + amount);
        //save transaction history into database

        var stripeCustomerId = req.body.stripeCustomerId;

        var confirmationCode  = req.body.confirmationCode;
        console.dir("confirmationCode:" + confirmationCode);

        console.dir("UserId in passport: " + req.user.userId);
        userId = req.user.userId;

        console.dir("isPledge:" + req.body.isPledge);
        var isPledge= req.body.isPledge;

        //logic for customers already has StripeCustomerIDs

        console.dir("stripeCustomerId in app.js:" + stripeCustomerId);
        if (stripeCustomerId && stripeCustomerId != 0) {
            stripe.charges.create({
                amount: amount * 100, // amount in cents, again
                currency: "usd",
                customer: stripeCustomerId
            });

            //need to store in transaction history table as well
             //exports.insertTransactionHistroy = function(transactionId,amount,userId,recipientId, status,notes,stripeToken, callback)

            var newTransactionId="Stripe_RecurrentPayment" + new Date().getTime() ;

            if(isPledge == undefined || isPledge== null|| !isPledge) {
                billingUtil.insertTransactionHistroy(newTransactionId, amount, userId, recipientId, constants.paymentStatus.PAID, notes, stripeToken, function (err, results) {
                    if (err) {
                        console.error(err);
                        //res.send(constants.services.CALLBACK_FAILED);
                        return;
                    }
                    //res.send(constants.services.CALLBACK_SUCCESS);

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
                            return;
                        });
                    });
                });
            }
            else {

                billingUtil.updateTransactionHistroy(confirmationCode, function (err, results) {
                    if (err) {
                        console.error(err);
                        //res.send(constants.services.CALLBACK_FAILED);
                        return;
                    }
                    //res.send(constants.services.CALLBACK_SUCCESS);

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
                            return;

                    });
                });


            }




            return;
        }


        //logic for customers don't have StripeCustomerIDs, need to create new ones

        console.dir("start saving customers");
        stripe.customers.create({
            card: stripeToken,
            description: 'payinguser@example.com'
        }).then(function (customer) {

            console.dir("using customerId:" + customer.id);
            console.dir("creating customers");

            //update customerId into for payment method table



            billingUtil.updatePaymentMethodStripeId(userId, customer.id, function (err, results) {
                if (err) {
                    console.error(err);
                    res.send(constants.services.CALLBACK_FAILED);
                    return;
                }
                //res.send(results);
            });

            console.dir("end saving customers");

            var charge = stripe.charges.create({
                amount: amount*100, // amount in cents, again
                currency: "usd",
                card: stripeToken,
                description: "payinguser@example.com"
                //customer: customer.id
            }, function (err, charge) {
                if (err && err.type === 'StripeCardError') {
                    // The card has been declined
                }

                console.dir("recipientId: " + recipientId);
                //"Stripe_RecurrentPayment" + new Date().getTime(), amount, userId, recipientId, "Processed", notes, stripeToken,
                billingUtil.insertTransactionHistroy("Stripe_" + stripeToken, amount, userId, recipientId, "Processed", notes,stripeToken, function (err, results) {
                    if (err) {
                        console.error(err);
                        //res.send(constants.services.CALLBACK_FAILED);
                        return;
                    }
                    // res.send(constants.services.CALLBACK_SUCCESS);
                });

            });

            console.dir("end saving charges");


            console.warn("end payment process");

        })


    });
}