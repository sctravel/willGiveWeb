/**
 * Created by XiTU on 1/26/15.
 */


module.exports = function(app) {
    var charityOps = require('../lib/db/charityOperation');
    var constants = require('../lib/common/constants');
    var isLoggedIn = require('../app').isLoggedIn;


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

}