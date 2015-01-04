
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var https = require('https');
var path = require('path');
var dateFormat = require('dateformat');

var passport = require('passport');
var fpass = require('passport-facebook').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');

//User's code in lib folder
var constants = require('./lib/common/constants');


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


/*********************************************************
 *Log4js configuration
 *********************************************************/
var log4js = require('log4js');
log4js.configure({
    appenders: [
        { type: 'console' }, //控制台输出
        {
            type: 'file', //文件输出
            filename: 'logs/access.log',
            maxLogSize: 1024*1024*100,
            backups:3,
            category: 'normal'
        }
    ],
    replaceConsole: true
});
var logger = log4js.getLogger('normal');
logger.setLevel('INFO');
app.use(log4js.connectLogger(logger, {level:log4js.levels.INFO}));

exports.logger=function(name){
    var logger = log4js.getLogger(name);
    logger.setLevel('INFO');
    return logger;
}


app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

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

//Home page
app.get('/', function (req,res){
    if(req.user) {
        console.log(req.user);
        res.render('index',{provider:req.user.provider,customerId:req.user.customerId, randomKey:req.user.randomKey,firstName: req.user.firstName, lastName: req.user.lastName});
    } else {
        res.render('index');
    }
});


https.createServer(serverOptions,app).listen(app.get('port'), function(){
                              console.log('Express server listening on port ' + app.get('port'));
                              });




