/**
 * Created by XiTU on 2/16/15.
 */

var charityOps = require('../db/charityOperation');
var qrCode = require('../utils/qrCodeGenerator');


charityOps.listAllCharity(null, null, null, function(err, results){
    if(err){
        console.error(err);
        return;
    }
    console.dir(results);
    for(i in results) {
        qrCode.generateQRCode(results[i], 'public/resources/recipients/qrCode/QR_'+results[i].recipientId+'.png')
    }
});
