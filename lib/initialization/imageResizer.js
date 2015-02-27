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

for()
gm('public/resources/recipients/profilePicture/pp_900000001')
    .resize(1000, 750, "!")
    .noProfile()
    .write('public/resources/recipients/profilePicture/pp_900000001_small', function (err) {
        if (!err) console.log('done');
    });

gm('public/resources/profileIcons/profilePicture_100000001.jpg')
    .resize(100, 75, "!")
    .noProfile()
    .write('public/resources/profileIcons/profilePicture_100000001.jpg', function (err) {
        if (!err) console.log('done');
    });