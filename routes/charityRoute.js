/**
 * Created by XiTU on 1/26/15.
 */


module.exports = function(app) {
    this.name = 'charityRoute';

    var charityOps = require('../lib/db/charityOperation');
    var recipientOps = require('../lib/db/recipientOperation');
    var constants = require('../lib/common/constants');
    var isLoggedIn = require('../app').isLoggedIn;
    var logger = require('../app').logger;
    var isLoggedInAsRecipient = require('../app').isLoggedInAsRecipient;

    app.get('/charity', function (req,res){
        req.session.lastPage = '/charity/';
        res.render('charity/charity',{user: req.user});
    });

    app.get('/services/charityByEIN/:id', function(req, res) {
        var id = req.params.id;

        charityOps.charityByEIN (id, function(err, results){
            if(err) {
                logger.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            verifyImagePath([results]);
            logger.debug(results);
            res.json(results);
        });
    })
    app.get('/c/:id', function (req,res){
        var id = req.params.id;
        req.session.lastPage = '/c/'+id;
        var ua = req.headers['user-agent'];
		if (ua == null) ua = "";		
		console.log('ua: '+ua);		
        var flag = req.query.flag;
		if (flag == null) flag = "";
        var caller = req.query.caller;
        if (caller != null && caller == "app")
        {
               charityOps.charityByEIN (id, function(err, results){
					if(err) {
						logger.error(err);
						res.send(constants.services.CALLBACK_FAILED);
						return;
					}
					verifyImagePath([results]);
					logger.debug(results);	
					res.json(results);
			   });
        }
        else if(ua.indexOf("iPhone") !=-1 || ua.indexOf("iPad") != -1 || ua.indexOf("iPod")!=-1 || flag == "IOS") {
            res.redirect("http://appstore.com/keynote");
        }else if(ua.indexOf("Fire")!=-1 || ua.indexOf("Silk")!=-1 || ua.indexOf("SD4930UR")!=-1 || ua.indexOf("Amazon")!=-1 || ua.indexOf("KF")!=-1 ||flag == "Amazon") {
          res.redirect("http://www.amazon.com/gp/mas/get-appstore/android");
        } else if(ua.indexOf("Android") !=-1 || flag == "Android") {
            res.redirect("https://play.google.com/store/apps/details?id=com.brainbow.peak.app");
        }else if(ua.indexOf("Windows Phone")!=-1 || ua.indexOf("IEMobile")!=-1|| flag == "Win") {
	      res.redirect("http://www.windowsphone.com/en-us/store/app/youtube/dcbb1ac6-a89a-df11-a490-00237de2db9e");
        }else {
            charityOps.getRecipientIdByEIN (id, function(error, result){
			    if(error) return;
				res.redirect('/charity/'+ result);
			});
        }
    });

    app.get('/charity/:id', function (req,res){
        var id = req.params.id;
        req.session.lastPage = '/charity/'+id;
        res.render('charity/charity',{user: req.user, pageId: id});
    });

    app.get('/charity/:id/edit', isLoggedInAsRecipient, function (req,res){
        var id = req.params.id;
        console.log('trying to edit charity id: '+id);
        if(id == req.user.userId) {
            res.render('charity/charityEdit',{user: req.user, pageId: id});
        } else {
            res.redirect('/');
        }
    });

    app.get('/charities/searchCharities', function (req,res){
        req.session.lastPage = '/charities/searchCharities';
        res.render('charity/searchCharities', {user: req.user, keyword: req.query.keyword});
    });

    app.get('/charities/listCharities', function (req,res){
        req.session.lastPage = '/charities/listCharities';
        res.render('charity/listCharities', {user: req.user});
    });

    app.get('/charities/hotCharities', function (req,res){
        req.session.lastPage = '/charity/hotCharities';
        res.render('charity/hotCharities', {user: req.user});
    });

    // Currently charity == recipient
    app.get('/services/charityById/:id', function(req,res){

        var recipientId = req.params.id;
        charityOps.charityById(recipientId, function(err, results){
            if(err) {
                logger.error(err);
                res.send(err.toString());
                return;
            }
	        verifyImagePath([results]);
	        logger.debug(results);	
            res.json(results);
        })
    });

    app.get('/services/transactionsByCharityId/:id', function(req, res) {
        var recipientId = req.params.id;

        charityOps.getTransactionsByCharityId(recipientId, function(err, results){
            if(err){
                logger.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            logger.debug(results);
            verifyImagePath(results);
            res.json(results);
        })
    });

    app.get('/services/charities/searchCharity', function(req,res){
        logger.info('calling /services/charities/searchCharity ' + req.query.keyword);
		userId = null;
		if (req.user!= null) userId = req.user.userId;
        charityOps.searchCharity(userId, req.query.keyword, function(err, results){
            if(err){
                logger.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            //logger.debug(results);
			verifyImagePath(results);
            res.json(results);
        })
    })

    app.get('/services/charities/classifyCharity', function(req,res){
        logger.info('calling /services/charity/classifyCharity ' + req.query.classification + " " + req.query.condition);
        charityOps.classifyCharity(req.query.classification, req.query.condition, function(err, results){
            if(err){
                logger.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            logger.debug(results);
            res.send(results);
        })
    })

    app.get('/services/charities/listAllCharity', function(req, res){

        var start = req.query.start;
        var count = req.query.count;
        var userId = null;
        if(req.user && req.user.provider == constants.login.LOGIN_PROVIDER.WILLGIVE) {
            userId = req.user.userId;
        }
        charityOps.listAllCharity(userId, start, count, function(err, results){
            if(err){
                logger.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            //logger.debug(results);
			verifyImagePath(results);
            res.send(results);
        });
    })
    app.get('/services/charities/listCharity', function(req,res){
        logger.info('calling /services/charity/listCharity ' + req.query.category + " "+ req.query.state + " "+ req.query.city);
		userId = null;
		if (req.user != null) userId = req.user.userId;
        charityOps.listCharity(userId, req.query.category, req.query.state, req.query.city, function(err, results){
            if(err){
                logger.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }
            //logger.debug(results);
			verifyImagePath(results);
            res.send(results);
        });
    })

    app.get('/services/getHotCharities', function(req,res){

        charityOps.getHotCharites(function(err, results){
            if(err){
                logger.error(err);
                res.send(constants.services.CALLBACK_FAILED);
                return;
            }

            var hotCharties = results;
            res.send(results);
        });
    })

    app.post('/services/charity/updatePassword', isLoggedInAsRecipient, function(req, res){

        var updatedData = req.body.updatedData;
        charityOps.updatePasswordForRecipientAccount(updatedData, req.user.userId,function(err,results){
            if(err){
                logger.error(err);
                res.send(err.toString());
                return;
            }
            res.send(results);
        })

    })

    app.post('/services/charity/updateAccountInfo', isLoggedInAsRecipient, function(req, res){

        var updatedData = req.body.updatedData;
        charityOps.updateAccountInfoForRecipientAccount(updatedData, req.user.userId, function(err,results){
            if(err){
                logger.error(err);
                res.send(err.toString());
                return;
            }
            res.send(results);
        })

    })

  function 	verifyImagePath(results)
  {
	for(var i=0;i< results.length;++i) 
		{			    
	           var imagePath = "/resources/recipients/profilePicture/pp_default";
               if (global.fs.existsSync("public/resources/recipients/profilePicture/pp_" + results[i].recipientId)) {
                    imagePath = "/resources/recipients/profilePicture/pp_" + results[i].recipientId;
			    }
				results[i].imagePath = imagePath;
		}
	}


}