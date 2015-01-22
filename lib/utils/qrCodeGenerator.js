/**
 * Created by XiTU on 1/4/15.
 */
var qr = require('qr-image');
var fs = require('fs');


/**
 * The message in qr code should be a json containing the following fields :
 *   recipient_id, name, address, city, status, zipcode, category, mission
 * @param message
 * @param outputLocation: should be public/resources/qrcodes
 */
exports.generateQRCode = function(jsonMessage, outputLocation){
    var code = qr.image(jsonMessage.toString(), { type: 'png' });
    //save qrcode to local file
    code.pipe(fs.createWriteStream(outputLocation+jsonMessage.id+'.png'));

}
