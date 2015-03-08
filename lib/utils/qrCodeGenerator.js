/**
 * Created by XiTU on 1/4/15.
 */
var qr = require('qr-image');
var fs = require('fs');


/**
 * The message in qr code should be a json containing the following fields :
 *   recipientId, name, address, city, status, zipCode, category, mission
 * @param message
 * @param outputLocation: should be public/resources/recipient/:id
 */
exports.generateQRCode = function(recipient, outputLocation){
    var code = qr.image(getQRCodeContentForRecipient(recipient), { type: 'png' });
    //save qrcode to local file
    console.log('saving qrcode to '+outputLocation);
    code.pipe(fs.createWriteStream(outputLocation));
}

function getQRCodeContentForRecipient( recipient ) {
    console.dir(recipient);
    var name = recipient.name.trim().replace(/\s/g, '^');
    var address = recipient.city.trim().replace(/\s/g, '^')+','+recipient.state.trim().replace(/\s/g, '^');
    var mission = recipient.mission.trim().replace(/\s/g, '^').substring(0,200);
    var message = 'http://www.willgive.org/c/'+recipient.ein.trim()+'?n='+name+'&a='+address+'&p='+recipient.phone.trim()+'&m='+mission;
    return message;
}