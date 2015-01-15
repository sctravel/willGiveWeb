
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
var constants = require('./lib/common/constants');
global.activeMenu = "Home";


///////////////////////////////////////////////////////////////////////////
// Environments Settings
///////////////////////////////////////////////////////////////////////////
var app = express();
// all environments
app.set('port', process.env.PORT || 3000);
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
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'bower_components')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
};


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
        console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

        console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!email-"+username+"; password-"+password);
        userLogin.manualLogin(username, password, function(error,results){
            console.dir(results);
            if(error) {
                return done(null, false, { message: 'Login Error. Please try again' });
            }
            if(results.isAuthenticated == true ) {
                console.dir(results);
                return done(null, {provider : results.provider, userId : results.userId, sessionId: results.sessionId,
                    firstName: results.firstName, lastName: results.lastName} );
            } else {
                return done(null, false, { message: results.errorMessage });
            }
        });
    }
));

//WillGive app under XiTu's FB account
passport.use(new fpass({
        clientID:'323966477728028',
        clientSecret:'660a1a721669c9daa0244faa45113b21',
        callbackURL:'/auth/facebook/callback'
    },
    function(accessToken, refreshToken, fbUserData, done){

        userLogin.loginOrCreateAccountWithFacebook(fbUserData._json,function(err,results){
            console.dir(results);
            if(err) {
                return done(null, false, { message: 'Facebook Login Error.' });
            }
            if(results.isAuthenticated == true ) {
                console.dir(results);
                return done(null,{provider:results.provider, userId :results.userId, sessionId: results.sessionId,
                    firstName: results.firstName, lastName: results.lastName});
            } else {
                return done(null, false, { message: results.errorMessage });
            }
        })

    }
));

passport.serializeUser(function (user, done) {//保存user对象
    done(null, {provider:user.provider, userId:user.userId, sessionId:user.sessionId,
        firstName: user.firstName, lastName: user.lastName});//可以通过数据库方式操作
});

passport.deserializeUser(function (user, done) {//删除user对象
    done(null, {provider:user.provider, userId:user.userId, sessionId:user.sessionId,
        firstName: user.firstName, lastName: user.lastName} );//可以通过数据库方式操作
});


function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
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

        req.session.cookie.maxAge = 1*24*60*60*1000;
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
    //if(req.user) {
        console.log(req.user);
        res.render('index',{user: req.user});
    //} else {
        //var code = qr.image("abcd", { type: 'png' });
        //res.render('index');
        //res.type('png');
        //var svg_string = qr.imageSync('I love QR!', { type: 'svg' });
        //save qrcode to local file
        //code.pipe(fs.createWriteStream('i_love_qr.png'));
        //code.pipe(res);
    //}

});

app.get('/contactus', function (req,res){
    res.render('contactUs', {user: req.user});
});
app.get('/aboutus', function (req,res){
    res.render('aboutUs', {user: req.user});
});

app.get('/login/signin', function (req,res){
    res.render('login/signin',{error: req.flash('error'), success: req.flash('success'), message:req.flash('message') });
});
app.get('/login/signup', function (req,res){
    res.render('login/signup');
});
app.get('/login/forgotPassword', function (req,res){
    res.render('login/forgotPassword');
});

app.get('/login/resetPassword',function(req,res){
    var email = req.query.email;
    var randomString = req.query.randomString;

    console.warn("email:"+email+"; randomString:"+randomString);
    res.render('/login/resetPassword',{email:email,randomString:randomString});
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




app.get('/services/getConfirmPic',function(req,res){
    var conf = confirmPicGenerator.generateConfirmPic();
    req.session.confirmText = conf[0];
    console.log("text is "+conf[0]);
    res.end(conf[1]);
})

/////////////////////////////////////////////////////////
//find back password
//////////////////////////////////////////////////////////
app.post('/services/login/updatePassword',function(req,res){
    var email = req.body.email;
    var randomString = req.body.randomString;
    var password = req.body.password;

    console.log("password we got is "+password);
    forgotPassword.findPasswordByEmail(email,randomString,password,function(err,results){
        if(err) {
            console.error(err);
            res.send(constants.services.CALLBACK_SUCCESS);
            return;
        }
        res.send(results);

    })

})

//Data Services for account
app.post('/services/login/signup', function(req,res) {
    console.dir(req.body);
    var newAccountInfo = req.body.newAccountInfo;
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
            return;
        }
        res.send(results);
    })

})

app.post('/services/login/forgotPassword',function(req,res){
    console.log("post to forgot password");
    var email = req.body.email;

    forgotPassword.forgotPassword(email,function(err,results){
        if(err) {
            console.error(err);
            res.send(constants.services.CALLBACK_FAILED);
            return;
        }
        console.info("Email exists? "+results);
        res.send(results);
    })
})

///////////////////////////////////////////////////////////////////////////
// Start Server
///////////////////////////////////////////////////////////////////////////
https.createServer(serverOptions,app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
});

/*
http.createServer(app).listen(80, function(){
    console.log('Express server listening on port 80');
});*/




