/**
 * Created by XiTU on 1/4/15.
 */

var qrCode = require('qrcode');

/**
 *
 * @param code: the string to be converted to qrCode
 * @param callback: callback with the url returned as parameter
 */
exports.generateQRCode = function(code, callback) {
    qrCode.toDataURL(code,function(err,url){
        console.log(url);
        callback(url);
    });
}
