/**
 * Created by XiTU on 1/4/15.
 */

exports.login = {
    SESSION_HOURS : 2,  // session expires in 2 hour
    FIND_PASSWORD_VALID_MINUTES : 30, //find password link only valid for 30 minutes
    SESSION_ID_LENGTH : 8,
    LOGIN_PROVIDER : {
        WILLGIVE : "willgive",
        FACEBOOK : "facebook"
    },
    EMAIL_REX : /^([\w-\.]+@([\w-]+\.)+[\w-]{2,6})?$/,

    FB_ICON_URL_TEMPLATE : "http://graph.facebook.com/{FB_ID}/picture",
    FB_ICON_URL_PATTERN : "{FB_ID}"

}

//TODO change this
exports.SITE_URL = "https://localhost:3000";

exports.services = {
    CALLBACK_SUCCESS : "success",
    CALLBACK_FAILED : "failed"
}
