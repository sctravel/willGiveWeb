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

//User's code in lib folder
var recipient = require('./lib/db/recipientOperation')
var constants = require('./lib/common/constants');
global.activeMenu = "Home";

global.fs = require('fs');


var configUserLoginRoute = require('./routes/userLoginRoute');
var configUserProfileRoute = require('./routes/userProfileRoute');
var configCharityRoute = require('./routes/charityRoute');
var configRecipientLoginRoute = require('./routes/recipientLoginRoute');
var configPaymentRoute = require('./routes/paymentRoute');

///////////////////////////////////////////////////////////////////////////
// Environments Settings
///////////////////////////////////////////////////////////////////////////
var app = express();
// all environments
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon(__dirname + '/public/images/icon.png'));
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.cookieParser('123456xyz'));
app.use(express.session({cookie: { expires: new Date(new Date().getTime()+constants.SESSION_HOURS*60*60*1000), maxAge : constants.SESSION_HOURS*60*60*1000 }})); // Session expires in SESSION_HOURS hours
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
            "category": "WillGive"
        }
    ],
    replaceConsole: true
});
var logger = log4js.getLogger('WillGive');
if ('development' == app.get('env')) {
    logger.setLevel('DEBUG');
    app.use(log4js.connectLogger(logger, {level:log4js.levels.DEBUG, format:':method :url'}));
} else {
    logger.setLevel('INFO');
    app.use(log4js.connectLogger(logger, {level:log4js.levels.INFO, format:':method :url'}));
}
exports.logger=logger;

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
    if (req.isAuthenticated() && ( constants.login.LOGIN_PROVIDER.FACEBOOK==req.user.provider || constants.login.LOGIN_PROVIDER.WILLGIVE==req.user.provider)) {
        logger.debug(req.user);
        return next();
    } else if( req.isAuthenticated() && constants.login.LOGIN_PROVIDER.RECIPIENT==req.user.provider){
        req.flash('error','You are logged in as a Charity. Please use your user account to login.');
        req.logout();
    }
    res.redirect("/login/signin");
}
//User login, need to separate from recipient login
function isLoggedInAsRecipient(req, res, next) {
    if (req.isAuthenticated() && constants.login.LOGIN_PROVIDER.RECIPIENT==req.user.provider) {
        logger.debug(req.user);
        return next();
    } else if( req.isAuthenticated() && constants.login.LOGIN_PROVIDER.RECIPIENT!=req.user.provider){
        req.flash('error','You are logged in as a user. Please use your Charity account to login.');
        req.logout();
    }
    res.redirect("/recipient/login");
}

exports.isLoggedIn = isLoggedIn;
exports.isLoggedInAsRecipient = isLoggedInAsRecipient;



configUserLoginRoute(app);
configUserProfileRoute(app);
configCharityRoute(app);
configRecipientLoginRoute(app);
configPaymentRoute(app);

///////////////////////////////////////////////////////////////////////////
// Page Routing
///////////////////////////////////////////////////////////////////////////
app.get('/', function (req,res){
    console.log(req.user);
    req.session.lastPage = '/';

    res.render('index',{user: req.user});
});


app.get('/contactus', function (req,res){
    req.session.lastPage = '/contactus';
    res.render('contactUs', {user: req.user});
});
app.get('/aboutus', function (req,res){
    req.session.lastPage = '/aboutus';
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




//charge known customer
app.post('/payment/stripePaymentWithStripeId/',function(req,res) {





});

//https://stripe.com/docs/tutorials/forms





////////////////////////////////////
//Recipient Pages / Services
////////////////////////////////////


///////////////////////////////////////////////////////////////////////////
// Start Server
///////////////////////////////////////////////////////////////////////////
if ('development' == app.get('env')) {
	app.set('port', process.env.PORT || 3000);
	https.createServer(serverOptions,app).listen(app.get('port'), function(){
        logger.info('Express server listening on port ' + app.get('port'));
	});
}else
{
	app.set('port', process.env.PORT || 443);
	https.createServer(serverOptions,app).listen(app.get('port'), function(){
        logger.info('Express server listening on port ' + app.get('port'));
	});
	http.createServer(app).listen(80, function(){
		logger.info('Express server listening on port 80');
	});
}





