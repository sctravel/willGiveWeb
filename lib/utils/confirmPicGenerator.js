var ccap = require('ccap');
var stringUtils = require('./stringUtils.js');


var captcha = ccap({

    width:150,//set width,default is 256

    height:40,//set height,default is 60

    offset:30,//set text spacing,default is 40

    quality:75,//set pic quality,default is 50

    fontsize:30, //set font size inside the picture

    generate:function(){//Custom the function to generate captcha text

        var text = stringUtils.generateRandomString(4);//generate captcha text here

        return text;//return the captcha text

    }

});

exports.generateConfirmPic = function(){
    return captcha.get();
}