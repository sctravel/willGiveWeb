/**
 * Created by Yichuan on 2/12/2015.
 */
//query if it's known customer

module.exports = function(app) {
    var billingUntil = require('../lib/db/BillingUtil');

    var userLogin = require('../lib/db/userLogin');
    var constants = require('../lib/common/constants');
    var charityOps = require('../lib/db/charityOperation');

    var isLoggedIn = require('../app').isLoggedIn;
    var logger = require('../app').logger;

    this.name = 'paymentRoute';
    app.get('/payment/stripePayment/queryUser/', function (req, res) {

        var user_id = req.query.userId;

        console.dir("app userId:" + user_id);

        billingUntil.queryExistingStripCustomers(user_id, function (err, customerToken) {
            if (err) {
                console.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            console.dir("query results: " + customerToken);
            res.send(customerToken);
        });

    });


    app.post('/payment/stripePayment', function (req, res) {

        console.dir("UserId in passport: " + req.user.userId);

        console.dir("app.js billing charityId: " + req.params.id);
        console.warn("start payment process");

        //'stripeToken
        console.dir("requset body:" + req.body);
        console.dir(req.body.stripeToken);

        console.dir("receipientId: " + req.body.receipientId);

        console.dir("stripeCustomerId: " + req.body.stripeCustomerId);


        var stripe = require("stripe")("sk_test_zjF1XdDy0TZAYnuifaHR0iDf");

// (Assuming you're using express - expressjs.com)
// Get the credit card details submitted by the form
        var stripeToken = req.body.stripeToken;

        var amount = req.body.amount;
        var url = req.url;

        var recipient_id = req.body.receipientId;

        console.dir("url:" + url);
        console.dir("amount:" + amount);
        //save transaction history into database

        var stripeCustomerId = req.body.stripeCustomerId;

        //logic for customers already has StripeCustomerIDs

        console.dir("stripeCustomerId in app.js:" + stripeCustomerId);
        if (stripeCustomerId && stripeCustomerId != 0) {
            stripe.charges.create({
                amount: amount * 100, // amount in cents, again
                currency: "usd",
                customer: stripeCustomerId
            });

            //need to store in transaction history table as well


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

            console.dir("UserId in passport: " + req.user.userId);
            user_id = req.user.userId;

            billingUntil.updatePaymentMethodStripeId(user_id, customer.id, function (err, results) {
                if (err) {
                    console.error(err);
                    res.send(constants.services.CALLBACK_FAILED);
                    return;
                }
                //res.send(results);
            });

            console.dir("end saving customers");

            var charge = stripe.charges.create({
                amount: amount, // amount in cents, again
                currency: "usd",
                card: stripeToken,
                description: "payinguser@example.com"
                //customer: customer.id
            }, function (err, charge) {
                if (err && err.type === 'StripeCardError') {
                    // The card has been declined
                }

                console.dir("recipient_id: " + recipient_id);
                billingUntil.insertTransactionHistroy("Stripe_" + stripeToken, amount, user_id, recipient_id, "Processing", stripeToken, function (err, results) {
                    if (err) {
                        console.error(err);
                        res.send(constants.services.CALLBACK_FAILED);
                        return;
                    }
                    // res.send(results);
                });

            });

            console.dir("end saving charges");


            console.warn("end payment process");

        })


    });
}