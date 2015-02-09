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

    app.get('/charities/charities',  function (req,res){
        req.session.lastPage = '/charity/charities';
        res.render('charity/charities', {user: req.user});
    });

    app.get('/charities/searchCharities', function (req,res){
        req.session.lastPage = '/charity/searchCharities';
        res.render('charity/searchCharities', {user: req.user, keyword: req.query.keyword});
    });

    app.get('/charities/listCharities', function (req,res){
        req.session.lastPage = '/charity/listCharities';
        res.render('charity/listCharities', {user: req.user});
    });

    app.get('/charities/hotCharities', function (req,res){
        req.session.lastPage = '/charity/hotCharities';
        res.render('charity/hotCharities', {user: req.user});
    });

    // Currently charity == recipient
    app.get('/services/charityById/:id', function(req,res){

        var recipientId = req.params.id;
        recipientOps.getRecipientAccountInfo(recipientId, function(err, results){
            if(err) {
                logger.error(err);
                res.send(err.toString());
                return;
            }
			verifyImagePath(results);
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
            res.json(results);
        })
    });

    app.get('/services/charities/searchCharity', function(req,res){
        logger.info('calling /services/charity/searchCharity ' + req.query.keyword);
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

        charityOps.listAllCharity(function(err, results){
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
               if (global.fs.existsSync("public/resources/recipients/profilePicture/pp_" + results[i].recipient_id)) {
                    imagePath = "/resources/recipients/profilePicture/pp_" + results[i].recipient_id;                    
			    }
				results[i].imagePath = imagePath;
		}
	}


}