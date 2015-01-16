/**
 * Created by XiTU on 1/4/15.
 */
var qr = require('qr-image');
var fs = require('fs');

exports.generateQRCode = function(message, outputLocation){
    var code = qr.image(message, { type: 'png' });
    //save qrcode to local file
    code.pipe(fs.createWriteStream(outputLocation+'/qrcode.png'));

}
