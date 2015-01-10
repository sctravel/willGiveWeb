/**
 * Created by XiTU on 1/9/15.
 */

function callbackResponse(statusCode, data) {
    this.statusCode = statusCode;
    this.data = data;
}

callbackResponse.prototype.isValid = function() {
    return true;
}

module.exports = callbackResponse;