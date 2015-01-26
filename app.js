﻿
///////////////////////////////////////////////////////////////////////////
// Module dependencies
///////////////////////////////////////////////////////////////////////////
var express = require('express');
var http = require('http');
var https = require('https');
var path = require('path');
var passport = require('passport');

var flash = require('connect-flash');
var qr = require('qr-image');

//User's code in lib folder
var recipient = require('./lib/db/recipientOperation')
var constants = require('./lib/common/constants');
global.activeMenu = "Home";

var billingUntil = require('./lib/db/BillingUtil');

var configUserLoginRoute = require('./routes/userLoginRoute');
var configUserProfileRoute = require('./routes/userProfileRoute');
var configCharityRoute = require('./routes/charityRoute');

///////////////////////////////////////////////////////////////////////////
// Environments Settings
///////////////////////////////////////////////////////////////////////////
var app = express();
// all environments
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.cookieParser('123456xyz'));
app.use(express.session({cookie: { maxAge : constants.SESSION_HOURS*60*60*1000 }})); // Session expires in SESSION_HOURS hours
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(express.methodOverride());

//for fileupload
var busboy = require("connect-busboy");
app.use(busboy({
    limits: {
        fileSize: 1 * 1024 * 1024
    }
}));

///////////////////////////////////////////////////////////////////////////
// Log4js configuration
///////////////////////////////////////////////////////////////////////////
var log4js = require('log4js');
log4js.configure({
    appenders: [
        { type: 'console' }, //控制台输出
        {
            type: 'file', //文件输出
            filename: 'logs/access.log',
            maxLogSize: 1024*1024*100, //100MB
            backups:3,
            "layout": {
                "type": "pattern",
                "pattern": "%m"
            },
            "category": "app"
        }
    ],
    replaceConsole: true
});
var logger = log4js.getLogger('WillGive');
logger.setLevel('INFO');
app.use(log4js.connectLogger(logger, {level:log4js.levels.INFO}));

exports.logger=function(name){
    var logger = log4js.getLogger(name);
    logger.setLevel('INFO');
    return logger;
}

///////////////////////////////////////////////////////////////////////////
// Router / Middleware configuration
///////////////////////////////////////////////////////////////////////////
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'bower_components')));
app.use(express.static(path.join(__dirname, 'public')));

if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}


///////////////////////////////////////////////////////////////////////////
// SSL Certification
///////////////////////////////////////////////////////////////////////////
var tls = require('tls');
var fs = require('fs');
var serverOptions = {
    key: fs.readFileSync('./my_key.pem'),
    cert: fs.readFileSync('./my_cert.pem')
};


//User login, need to separate from recipient login
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated() && ( constants.login.LOGIN_PROVIDER.FACEBOOK=req.user.provider || constants.login.LOGIN_PROVIDER.WILLGIVE==req.user.provider)) {
        console.dir(req.user);
        return next();
    }
    res.redirect("/login/signin");
}
//User login, need to separate from recipient login
function isLoggedInAsRecipient(req, res, next) {
    if (req.isAuthenticated() && constants.login.LOGIN_PROVIDER.RECIPIENT==req.user.provider) {
        console.dir(req.user);
        return next();
    }
    res.redirect("/recipient/login");
}

exports.isLoggedIn = isLoggedIn;
exports.isLoggedInAsRecipient = isLoggedInAsRecipient;



configUserLoginRoute(app);
configUserProfileRoute(app);
configCharityRoute(app);

///////////////////////////////////////////////////////////////////////////
// Page Routing
///////////////////////////////////////////////////////////////////////////
app.get('/', function (req,res){
     console.log(req.user);
     res.render('index',{user: req.user});
});

app.get('/contactus', function (req,res){
    res.render('contactUs', {user: req.user});
});
app.get('/aboutus', function (req,res){
    res.render('aboutUs', {user: req.user});
});



app.get('/payment', function (req,res){
    res.render('payment');
});



app.get('/services/getConfirmPic',  function(req,res){
    var conf = confirmPicGenerator.generateConfirmPic();
    req.session.confirmText = conf[0];
    console.log("text is "+conf[0]);
    res.end(conf[1]);
})

//known customer
app.post('/payment/stripePayment/customerId',function(req,res) {

});

//https://stripe.com/docs/tutorials/forms

app.post('/payment/stripePayment',function(req,res){

    console.warn("start payment process");

    //'stripeToken
    console.dir(req.body);
    console.dir(req.body.stripeToken);


    var stripe = require("stripe")("sk_test_zjF1XdDy0TZAYnuifaHR0iDf");

// (Assuming you're using express - expressjs.com)
// Get the credit card details submitted by the form
    var stripeToken = req.body.stripeToken;

    var amount = req.body.amount;

    console.dir("amount:"+amount);
    //save transaction history into database

    var savedId;

    console.dir("start saving customers");
    stripe.customers.create({
        card: stripeToken,
        description: 'payinguser@example.com'
    }).then(function(customer) {

        console.dir("using customerId:"+ customer.id);
        console.dir("creating customers");

        //update customerId into for payment method table
        var user_id=1;
        var recipient_id=2;
        billingUntil.updatePaymentMethodStripeId(user_id,customer.id,function(err,results){
            if(err){
                console.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            res.send(results);
        });

        console.dir("end saving customers");

        var charge = stripe.charges.create({
            amount: amount, // amount in cents, again
            currency: "usd",
            card: stripeToken,
            description: "payinguser@example.com",
            //customer: customer.id
        }, function(err, charge) {
            if (err && err.type === 'StripeCardError') {
                // The card has been declined
            }
            billingUntil.insertTransactionHistroy("Stripe_"+stripeToken,amount,user_id,recipient_id,Date.now(),Date.now(),"Processing", stripeToken, function(err,results){
                if(err){
                    console.error(err);
                    res.send(constants.services.CALLBACK_FAILED);
                    return;
                }
                res.send(results);
            });

        });

        console.dir("end saving charges");


           console.warn("end payment process");

        })


});



////////////////////////////////////
//Recipient Pages / Services
////////////////////////////////////
app.get('/recipient/signup', function(req, res) {
    res.render('recipientLogin/recipientSignUp');
})
app.get('/recipient/login', function(req, res) {
    res.render('recipientLogin/recipientLogin');
})
app.get('/recipient/designPage', function(req, res) {
    res.render('recipientLogin/recipientSignUp2_upload');
})

app.post('/services/recipient/signup', function(req, res) {
    //should auto login after signup
    var signUpFrom = req.body.recipientSignUpForm;
    console.dir(signUpFrom);
    recipient.createNewRecipient(signUpFrom, function(err, results) {

    });
})

///////////////////////////////////////////////////////////////////////////
// Start Server
///////////////////////////////////////////////////////////////////////////
if ('development' == app.get('env')) {
	app.set('port', process.env.PORT || 3000);
	https.createServer(serverOptions,app).listen(app.get('port'), function(){
		console.log('Express server listening on port ' + app.get('port'));
	});
}else
{
	app.set('port', process.env.PORT || 443);
	https.createServer(serverOptions,app).listen(app.get('port'), function(){
		console.log('Express server listening on port ' + app.get('port'));
	});
	http.createServer(app).listen(80, function(){
		console.log('Express server listening on port 80');
	});
}





