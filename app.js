
///////////////////////////////////////////////////////////////////////////
// Module dependencies
///////////////////////////////////////////////////////////////////////////
var express = require('express');
var http = require('http');
var https = require('https');
var path = require('path');
var dateFormat = require('dateformat');
var passport = require('passport');
var fpass = require('passport-facebook').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');
var qr = require('qr-image');

//User's code in lib folder
var userLogin = require('./lib/db/userLogin');
var recipient = require('./lib/db/recipientOperation')
var charityOps = require('./lib/db/charityOperation');
var forgotPassword = require('./lib/db/forgotPassword');
var constants = require('./lib/common/constants');
global.activeMenu = "Home";

var billingUntil = require('./lib/db/BillingUtil');


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
        fileSize: 0.2 * 1024 * 1024
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
            maxLogSize: 1024*1024*100,
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


var facebookCredentials = {
    clientID:'420297851460293',
    clientSecret:'dd643be55187ac4e76e6487ccd61e7a0',
    callbackURL:'/auth/facebook/callback'
};
// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
    facebookCredentials = {
        clientID:'323966477728028',
            clientSecret:'660a1a721669c9daa0244faa45113b21',
        callbackURL:'/auth/facebook/callback'
    }
};
console.log("#########app env: "+app.get('env')+". ##############");
console.dir(facebookCredentials);


///////////////////////////////////////////////////////////////////////////
// SSL Certification
///////////////////////////////////////////////////////////////////////////
var tls = require('tls');
var fs = require('fs');
var serverOptions = {
    key: fs.readFileSync('./my_key.pem'),
    cert: fs.readFileSync('./my_cert.pem')
};


///////////////////////////////////////////////////////////////////////
// Passport - Login methods setup
///////////////////////////////////////////////////////////////////////
passport.use('local', new LocalStrategy(
    function (username, password, done) {

        userLogin.manualLogin(username, password, function(error,results){
            console.dir(results);
            if(error) {
                return done(null, false, { message: 'Login Error. Please try again' });
            }
            if(results.isAuthenticated == true ) {
                console.dir(results);
                return done(null, {provider : results.provider, email:results.email, userId : results.userId, sessionId: results.sessionId,
                    firstName: results.firstName, lastName: results.lastName, imageIconUrl: results.imageIconUrl} );
            } else {
                return done(null, false, { message: results.errorMessage });
            }
        });
    }
));


passport.use(new fpass(facebookCredentials,
    function(accessToken, refreshToken, fbUserData, done){
        console.dir(fbUserData);
        userLogin.loginOrCreateAccountWithFacebook(fbUserData._json,function(err,results){
            console.dir(results);
            if(err) {
                return done(null, false, { message: 'Facebook Login Error.' });
            }
            if(results.isAuthenticated == true ) {
                console.dir(results);
                return done(null,{provider:results.provider, email: results.email, userId :results.userId, sessionId: results.sessionId,
                    firstName: results.firstName, lastName: results.lastName, imageIconUrl: results.imageIconUrl});
            } else {
                return done(null, false, { message: results.errorMessage });
            }
        })

    }
));

passport.serializeUser(function (user, done) {//保存user对象
    done(null, {provider:user.provider, email:user.email, userId:user.userId, sessionId:user.sessionId,
        firstName: user.firstName, lastName: user.lastName, imageIconUrl: user.imageIconUrl});//可以通过数据库方式操作
});

passport.deserializeUser(function (user, done) {//删除user对象
    done(null, {provider:user.provider, email:user.email, userId:user.userId, sessionId:user.sessionId,
        firstName: user.firstName, lastName: user.lastName, imageIconUrl: user.imageIconUrl} );//可以通过数据库方式操作
});


//User login, need to separate from recipient login
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated() && ('facebook'==req.user.provider || 'willgive'==req.user.provider)) {
        console.dir(req.user);
        return next();
    }
    res.redirect("/login/signin");
}


app.post('/services/login/signin',
    passport.authenticate('local',
        { failureRedirect: '/login/signin', failureFlash: true }
    ),
    function(req,res){
        console.dir(req.body);

        //req.session.cookie.maxAge = 1*24*60*60*1000;
        console.log("set cookie maxAge to 1 day");

        console.dir(req.session);
        if(req.session.lastPage) {
            res.redirect(req.session.lastPage);
        } else {
            res.redirect("/");
        }

    }
);
// GET /auth/facebook
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Facebook authentication will involve
//   redirecting the user to facebook.com.  After authorization, Facebook will
//   redirect the user back to this application at /auth/facebook/callback
app.get('/auth/facebook',
    passport.authenticate('facebook',{ scope: ['user_about_me', 'email', 'public_profile'] }),
    function(req, res){
        // The request will be redirected to Facebook for authentication, so this
        // function will not be called.
    });

// GET /auth/facebook/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/facebook/callback',
    passport.authenticate('facebook', {
        failureRedirect: '/login/signin' })
    ,
    function(req,res){
        console.dir(req.session);
        if(req.session.lastPage) {
            res.redirect(req.session.lastPage);
        } else {
            res.redirect("/");
        }

    }
);



///////////////////////////////////////////////////////////////////////////
// Page Routing
///////////////////////////////////////////////////////////////////////////
app.get('/', function (req,res){
     console.log(req.user);
     res.render('index',{user: req.user});

    //}

});


app.get('/charity', function (req,res){
    console.log(req.user);
    res.render('charity',{user: req.user});

    //}

});

app.get('/contactus', function (req,res){
    res.render('contactUs', {user: req.user});
});
app.get('/aboutus', function (req,res){
    res.render('aboutUs', {user: req.user});
});

app.get('/charity/charities', function (req,res){
    res.render('charity/charities', {user: req.user});
});

app.get('/charity/searchCharities', function (req,res){
    res.render('charity/searchCharities', {user: req.user, keyword: req.query.keyword});
});

app.get('/charity/listCharities', function (req,res){
    res.render('charity/listCharities', {user: req.user});
});

app.get('/charity/hotCharities', function (req,res){
    res.render('charity/hotCharities', {user: req.user});
});

app.get('/login/signin', function (req,res){
    res.render('login/signin',{error: req.flash('error'), success: req.flash('success'), message:req.flash('message') });
});
app.get('/login/signup', function (req,res){
    res.render('login/signup', {user: req.user});
});

app.get('/login/forgotPassword', function (req,res){
    res.render('login/forgotPassword', {user: req.user});
});

app.get('/users/account', isLoggedIn, function(req,res){
    console.log('in /user/account');
    console.dir(req.user);
    res.render('login/userProfile', {user: req.user});
})
app.get('/users/settings', isLoggedIn, function(req,res){
    res.render('login/userSettings', {user: req.user});
})
app.get('/users/paymentMethod', isLoggedIn, function(req,res){
    res.render('login/userPaymentMethod', {user: req.user});
})
app.get('/users/contribution', isLoggedIn, function(req,res){
    res.render('login/userContribution', {user: req.user});
})
app.get('/users/collections', isLoggedIn, function(req,res){
    res.render('login/userCollections', {user: req.user});
})
app.get('/login/resetPassword',function(req,res){
    var email = req.query.email;
    var randomString = req.query.randomString;

    console.warn("email:"+email+"; randomString:"+randomString);
    res.render('login/resetPassword', {email:email,randomString:randomString});
})

//app.all('/users', isLoggedIn);
app.get('/login/logout', isLoggedIn, function (req, res) {
    console.log(req.user.userId + " logged out.");
    userLogin.logoutUserLoginHistory(req.user.userId, req.user.sessionId, function(err, results){
        console.info("");//write logout history success
    })
    req.flash('success','Logged out!');
    req.logout();
    res.redirect("/");
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

app.post('/services/login/profilePictureUpload', function(req,res) {

    var fstream;
    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {
        var fileNameArray = filename.split('.');
        var suffix = fileNameArray[fileNameArray.length-1].toLowerCase();

        //Path where image will be uploaded
        fstream = fs.createWriteStream(__dirname + '/public/resources/profileIcons/' + fieldname +'.'+suffix);
        file.pipe(fstream);
        fstream.on('close', function () {
            console.log("Upload Finished of " + fieldname);
            var iconUrl = '/resources/profileIcons/' + fieldname +'.'+suffix;
            userLogin.updateUserProfileImageUrl( iconUrl, req.user.userId,function(err, results){
                if(!err) {
                    var user = req.user;
                    user.imageIconUrl = iconUrl;
                    req.logIn(user, function(error) {
                        if (error) {
                            console.warn('after updating basic info login failed');
                            res.send(constants.services.CALLBACK_FAILED);
                        }
                        res.redirect('/users/account');
                    });
                }
            });
                       //where to go next
        });
    });

});



/////////////////////////////////////////////////////////
//find back password
//////////////////////////////////////////////////////////
app.post('/services/login/resetPassword',function(req,res){
    var email = req.body.email;
    var randomString = req.body.randomString;
    var password = req.body.password;

    forgotPassword.updatePasswordByEmail(email,randomString,password,function(err,results){
        if(err) {
            console.error(err);
            res.send(err.toString());
            return;
        }
        res.send(results);

    })

})

//Data Services for account
app.post('/services/login/signup', function(req,res) {
    console.dir(req.body);
    var newAccountInfo = req.body.newAccountInfo;
    newAccountInfo.imageIconUrl = "/images/blank_icon.jpg";
    //newAccountInfo.provider=constants.login.LOGIN_PROVIDER.WILLGIVE;
    userLogin.addNewUserAccount(newAccountInfo, function(err,results){
        if(err) {
            console.error(err);
            res.send(err.toString());
        } else {
            console.info(results);
            res.send(constants.services.CALLBACK_SUCCESS);
        }
    });
});


//Use Passport to handle signin


app.post('/services/login/validateEmailLink',function(req,res){
    var email = req.body.email;
    var randomString = req.body.randomString;

    forgotPassword.validateEmailLink(email,randomString,function(err,results){
        if(err){
            console.error(err);
            res.send(constants.services.CALLBACK_FAILED);
            return;
        }
        res.send(results);
    })

})


/////////////////////////////////////
// User Account related
/////////////////////////////////////
app.post('/services/user/updatePassword', isLoggedIn, function(req,res){
    var updatedData = req.body.updatedData;
    userLogin.updatePasswordForUserAccount(updatedData, req.user.userId,function(err,results){
        if(err){
            console.error(err);
            res.send(err.toString());
            return;
        }
        res.send(results);
    })

})

app.post('/services/user/updateBasicInfo', isLoggedIn, function(req,res){
    var basicInfo = req.body.updatedData;
    console.log('calling /services/user/updateBasicInfo');
    userLogin.updateBasicInfoForUserAccount(basicInfo, req.user.userId,function(err,results){
        if(err){
            res.send(constants.services.CALLBACK_FAILED);
            return;
        } else {
            var user = req.user;
            user.firstName = basicInfo.firstName;
            user.lastName = basicInfo.lastName;

            req.logIn(user, function(error) {
                if (error) {
                    console.warn('after updating basic info login failed');
                    res.send(constants.services.CALLBACK_FAILED);
                }
            });
            res.send(constants.services.CALLBACK_SUCCESS);
        }
    })

})


app.get('/services/user/getTransactionHistory', isLoggedIn, function(req, res){
    userLogin.getUserTransactionHistory(req.user.userId, function(err, results){
        if(err){
            console.error(err);
            res.send(constants.services.CALLBACK_FAILED);
            return;
        }
        console.dir(results);
        res.send(results);
    })
})
app.post('/services/user/settings', isLoggedIn, function(req,res){
    var userSettings = req.body.userSettings;

    userLogin.updateAccountSettingsForUser(userSettings, req.user.userId, function(err,results){
        if(err){
            console.error(err);
            res.send(constants.services.CALLBACK_FAILED);
            return;
        }
        res.send(results);
    })

})
app.get('/services/user/settings', isLoggedIn, function(req,res) {
    userLogin.getAccountSettingInfoForUser(req.user.userId, function(err, userSettings){
        if(err){
            console.error(err);
            res.send(constants.services.CALLBACK_FAILED);
            return;
        }
        res.send(userSettings);
    })
});

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

app.post('/services/login/forgotPassword',function(req,res){
    console.log("post to forgot password");
    var email = req.body.email;

    forgotPassword.forgotPassword(email,function(err,results){
        if(err) {
            console.error(err);
            console.info("Email exists? Error!");

            res.send(err.toString());
            return;
        }
        console.info("Email exists? "+results);
        res.send(results);
    })
});

////////////////////////////////////
//Recipient Pages / Services
////////////////////////////////////
app.get('/recipient/signup', function(req, res) {
    res.render('recipientLogin/recipientSignUp');
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


app.get('/services/charity/getFavoriteCharity', isLoggedIn, function(req,res){
    console.log('calling /services/charity/getFavoriteCharity ' + req.user.userId);
    charityOps.getFavoriteCharity(req.user.userId, function(err, results){
        if(err){
            console.error(err);
            res.send(constants.services.CALLBACK_FAILED);
            return;
        }
        console.dir(results);
        res.send(results);
    })
})

app.get('/services/charity/searchCharity', function(req,res){
    console.log('calling /services/charity/searchCharity ' + req.query.keyword);
    charityOps.searchCharity(req.query.keyword, function(err, results){
        if(err){
            console.error(err);
            res.send(constants.services.CALLBACK_FAILED);
            return;
        }
        console.dir(results);
        res.send(results);
    })
})

app.get('/services/charity/classifyCharity', function(req,res){
    console.log('calling /services/charity/classifyCharity ' + req.query.classification + " " + req.query.condition);
    charityOps.classifyCharity(req.query.classification, req.query.condition, function(err, results){
        if(err){
            console.error(err);
            res.send(constants.services.CALLBACK_FAILED);
            return;
        }
        console.dir(results);
        res.send(results);
    })
})

app.get('/services/charity/listCharity', function(req,res){
    console.log('calling /services/charity/listCharity ' + req.query.category + " "+ req.query.state + " "+ req.query.city);
    charityOps.listCharity(req.query.category, req.query.state, req.query.city, function(err, results){
        if(err){
            console.error(err);
            res.send(constants.services.CALLBACK_FAILED);
            return;
        }
        console.dir(results);
        res.send(results);
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





