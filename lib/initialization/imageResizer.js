/**
 * Created by XiTU on 2/26/15.
 */
/*
var easyimg = require('easyimage');
var resize = require('batch-resize');

easyimg.resize({
    src:'public/resources/profileIcons/profilePicture_100000001.jpg',
    dst:'public/resources/profileIcons/profilePicture_100000001_small.jpg',
    width:500, height:500
});


resize('public/resources/profileIcons/profilePicture_100000001.jpg')
    .to('small', 100, 75)
    .to('medium', 400, 300)
    .to('large', 1000, 750)
    .end(function(err, images){
        console.dir(err);
        console.dir(images);
    })
*/
var gm = require('gm');
var dbPool = require('./../db/createDBConnectionPool');
var tableNames = require('./../common/tableNames');
var fs = require('fs');

function getMinAndMaxRecipientId(callback) {
    var sql = 'select min(recipient_id) as minId, max(recipient_id) as maxId from ' + tableNames.TABLE_NAMES.RECIPIENT_TABLE;
    dbPool.runQuery(sql, function(err, results){
        if(err) {
            console.error(err);
            return;
        }

        var minId = results[0].minId;
        var maxId = results[0].maxId;

        callback(minId, maxId);
    })
}

getMinAndMaxRecipientId(function(minId, maxId){
    var charityId = minId;
    console.warn('minId-'+minId+';  maxId-'+maxId);
    while(charityId<=maxId) {
        var profilePicturePath = 'public/resources/recipients/profilePicture/pp_'+charityId;

        fs.exists(profilePicturePath, function(exists) {
            if (exists) {
                gm(profilePicturePath)
                    .resize(100, 75, "!")
                    .noProfile()
                    .write(profilePicturePath+'_small', function (err) {
                        if (!err) console.log('small done');
                    });
                gm(profilePicturePath)
                    .resize(400, 300, "!")
                    .noProfile()
                    .write(profilePicturePath+'_medium', function (err) {
                        if (!err) console.log('medium done');
                    });
                gm(profilePicturePath)
                    .resize(1000, 750, "!")
                    .noProfile()
                    .write(profilePicturePath+'_large', function (err) {
                        if (!err) console.log('large done');
                    });
            } else {
                console.warn(profilePicturePath+' doesnot exist!');
            }
        });


        ++charityId;
    }
})
