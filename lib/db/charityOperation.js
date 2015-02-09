var tableNames = require('./../common/tableNames').TABLE_NAMES;
var stringUtil = require('./../utils/stringUtils');
var dbPool = require('../db/createDBConnectionPool');
var constants = require('./../common/constants');
var encryptionUtil = require('./../utils/encryptionUtil');

var logger = require('../../app').logger;

exports.searchCharity = function(userId, condition, callback) {
    var sql = "select recipient_id, name, EIN, address, zipcode, city, state, phone, website, CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission from " + tableNames.RECIPIENT_TABLE;
	if (userId != null)
	{
	  sql = "select r.recipient_id, name, EIN, address, zipcode, city, state, phone, website, CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, '' as imagePath, ifNull( isEnabled, 'N') as isFavored from " + tableNames.RECIPIENT_TABLE
		  + " r left join " + tableNames.USER_FAVORITE_RECIPIENT_TABLE + " fr on r.recipient_id = fr.recipient_id and fr.user_id = " + userId + " ";
	}
	sql += " where name like ? " +
        " or EIN like ? or City like ? or website like ? or mission like ?";
	var condition = "%" + condition + "%"    
    dbPool.runQueryWithParams(sql,[condition, condition, condition, condition, condition],function(err,results) {
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }		
        callback(null, results);
    })
}

exports.getFavoriteCharity = function(userId, callback) {
    var sql = "select r.recipient_id, name, EIN, city, state, phone, website, CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, '' as imagePath, ifNull( isEnabled, 'N') as isFavored from " + tableNames.USER_FAVORITE_RECIPIENT_TABLE + " ur inner join " 
		+ tableNames.RECIPIENT_TABLE
		+ " r on ur.recipient_id = r.recipient_id "
		+ " where ur.user_id = ? and isEnabled = 'Y'";
    dbPool.runQueryWithParams(sql,[userId],function(err,results) {
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null, results);
    })
}

exports.setFavoriteCharity = function(userId, rid, value, callback) {
	var sql  = "update " + tableNames.USER_FAVORITE_RECIPIENT_TABLE + " set isEnabled = '" + value.replace("'", "''") + "' where user_id=? and recipient_id=?";
    dbPool.runQueryWithParams(sql,[userId, rid],function(err,results) {
        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }		
        if (results.affectedRows == 0 && value== "Y")
		{		
			sql = "insert into " + tableNames.USER_FAVORITE_RECIPIENT_TABLE + "(user_id, recipient_id) values(?, ?)";
			dbPool.runQueryWithParams(sql,[userId, rid],function(err,results) {});
		}
    })
}

function listAllCharity( callback ) {
    var sql = "select recipient_id, name, EIN, address, zipcode, city, state, phone, website, CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, '' as imagePath from " + tableNames.RECIPIENT_TABLE;
    dbPool.runQueryWithParams(sql,function(err,results) {
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null, results);
    })
}
exports.listAllCharity = listAllCharity;
function listCharity(userId, category, state, city, callback) {
    var sql = "select recipient_id, name, EIN, address, zipcode, city, state, phone, website, CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, '' as imagePath from " + tableNames.RECIPIENT_TABLE;
	if (userId != null)
	{
	  sql = "select r.recipient_id, name, EIN, address, zipcode, city, state, phone, website, CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, ifNull( isEnabled, 'N') as isFavored from " + tableNames.RECIPIENT_TABLE
		  + " r left join " + tableNames.USER_FAVORITE_RECIPIENT_TABLE + " fr on r.recipient_id = fr.recipient_id and fr.user_id = " + userId + " ";
	}
	var isFirst = true;
	if (category != "All")
	{
	   sql += " where category='" + category.replace("'", "''") + "'";
	   isFirst = false;
	}
	
	if (state != "All")
	{
		if(isFirst)
		{
			sql += " where ";
			isFirst = false;
		}else
			sql += " and ";
		sql += "state='" + state.replace("'", "''") + "'";
	}

	if (city != "All")
	{
		if(isFirst)
		{
			sql += " where ";
			isFirst = false;
		}else
			sql += " and ";
		sql += "city='" + city.replace("'", "''") + "'";
	}
	
	sql += " order by name";	
    dbPool.runQueryWithParams(sql,function(err,results) {
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null, results);
    })
}
exports.listCharity = listCharity;

function classifyCharity(classification, condition, callback) {
    var sql = "select distinct ";
	if (classification == "category")
		sql += " category from " + tableNames.RECIPIENT_TABLE + " order by category";  
	else if (classification == "state")
		sql += " state from " + tableNames.RECIPIENT_TABLE + " order by state";  
	else if (classification == "city")
		sql += " city from " + tableNames.RECIPIENT_TABLE + " where state = ? order by city";
	else return;

    dbPool.runQueryWithParams(sql,condition,function(err,results) {
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null, results);
    })
}
exports.classifyCharity = classifyCharity;


function charityById(id,callback){

    var sql = "select recipient_id,Type,name,EIN,STATUS,Category,Address,City,State,ZipCode,Phone,FAX,Email,password," +
              "CONTACT_PERSON_NAME,CONTACT_PERSON_Title,CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, '' as imagePath, " +
              "Image_URL, Video_URL,Website,FACEBOOK_URL,Rating  from "
              + tableNames.RECIPIENT_TABLE + " where recipient_id=" + id;

    dbPool.runQueryWithParams(sql,id,function(err,results) {
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }

        callback(null, results);

})}

exports.charityById = charityById;

function updateAccountInfoForRecipientAccount(updatedData, recipientId, callback) {
    var updateAccountInfoSql = " update " + tableNames.RECIPIENT_TABLE + " set name = ? , EIN = ? , " +
        " category = ?, address = ?, city = ?, state = ?, country = ?, zipcode = ?, phone = ?, fax = ?, " +
        " website = ?, facebook_url = ?, mission = ?, contact_person_name = ?, contact_person_title = ? where recipient_id= ? ";

    var params = [updatedData.name, updatedData.EIN, updatedData.category, updatedData.address, updatedData.city,
        updatedData.state, updatedData.country, updatedData.zipCode, updatedData.phone, updatedData.fax, updatedData.website,
        updatedData.facebookPage, updatedData.mission, updatedData.contactPersonName, updatedData.contactPersonTitle, recipientId];
    dbPool.runQueryWithParams(updateAccountInfoSql, params, function(err,results) {

        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }


        callback(null, constants.services.CALLBACK_SUCCESS);
    })
}

//Currently we get all the transactions for a charity,
// later maybe get only for recent 3 months or 100 transactions, etc
function getTransactionsByCharityId( charityId, callback ) {
    var sql = " select ut.transaction_id, ut.user_id, users.first_name, users.last_name, ut.amount, " +
        " ut.datetime, ut.status, users.email, users.image_icon_url from user_transactions ut inner join users on " +
        " ut.user_id = users.user_id  where ut.recipient_id = ? ";
    dbPool.runQueryWithParams( sql, [charityId], function(err, results){
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }

        callback(null, results);
    });
}
exports.getTransactionsByCharityId = getTransactionsByCharityId;

exports.updateAccountInfoForRecipientAccount = updateAccountInfoForRecipientAccount;

function updatePasswordForRecipientAccount(updateData, recipientId, callback) {

    if(updateData.newPassword != updateData.confirmPassword) {
        callback(new Error("Passwords don't match."), null);
        return;
    } else if(updateData.confirmPassword.length<8) {
        callback(new Error("The length of password should not less than 8."), null);
        return;
    }

    var checkOldPasswordSql = 'select recipient_id, password from ' + tableNames.RECIPIENT_TABLE + ' where recipient_id = ? ';
    dbPool.runQueryWithParams(checkOldPasswordSql, [recipientId], function(err,results) {
        if(err) {
            logger.error(err);
            callback(new Error("Updating password failed. Please try it again."),null);
            return;
        }
        //console.log('old password-'+updateData.oldPassword);
        if(results && results.length==1 && encryptionUtil.validatePassword(updateData.oldPassword, results[0].password)) {
            var updatePasswordSql = ' update ' + tableNames.RECIPIENT_TABLE + ' set password = ? where recipient_id = ? ';
            dbPool.runQueryWithParams(updatePasswordSql, [encryptionUtil.saltAndHash(updateData.newPassword), recipientId], function(err,results) {
                if(err) {
                    logger.error(err);
                    callback(new Error("Updating password failed. Please try it again."), null);
                    return;
                }
                callback(null, constants.services.CALLBACK_SUCCESS);
            });

        } else {
            callback(new Error("Updating password failed. The old password is incorrect."), null);
        }
    });

}
exports.updatePasswordForRecipientAccount = updatePasswordForRecipientAccount;
