var tableNames = require('./../common/tableNames').TABLE_NAMES;
var stringUtil = require('./../utils/stringUtils');
var dbPool = require('../db/createDBConnectionPool');
var constants = require('./../common/constants');
var encryptionUtil = require('./../utils/encryptionUtil');

var logger = require('../../app').logger;
exports.getRecipientIdByEIN = function (ein, callback){
    var sql = 'select recipientId from ' + tableNames.RECIPIENT_TABLE  + " where ein=?";
    dbPool.runQueryWithParams(sql,[ein],function(err,results) {
        if(err || results.length < 1) {
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null, results[0].recipientId);
    })
}

exports.searchCharity = function(userId, condition, callback) {
    var sql = 'select recipientId, category, status, email, name, ein, address, zipCode, city, state, country, phone, fax, website, ' +
        ' CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, status, facebookUrl, ' +
        ' videoUrl, "" as imagePath, ' +
        ' contactPersonName, contactPersonTitle, rating from ' + tableNames.RECIPIENT_TABLE;
	if (userId != null)
	{
	  sql = 'select r.recipientId, category, status, email, name, ein, address, zipCode, city, state, country, phone, fax, website, ' +
            ' CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, status, facebookUrl, ' +
            ' videoUrl, "" as imagePath, ' +
            ' contactPersonName, contactPersonTitle, ' +
            ' rating, ifNull( isEnabled, "N") as isFavored from ' + tableNames.RECIPIENT_TABLE +
		    ' r left join ' + tableNames.USER_FAVORITE_RECIPIENT_TABLE + ' fr on r.recipientId = fr.recipientId and fr.userId = ' + userId + ' ';
	}
	sql += " where name like ? " +
        " or ein like ? or city like ? or website like ? or mission like ?";
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

exports.getHotCharites = function( callback) {

    var sql = 'select r.recipientId , category, name, website from  hot_charities h , recipient r where h.recipientId = r.recipientId' ;

    dbPool.runQueryWithParams(sql,function(err,results) {
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        callback(null, results);
    })
}



exports.getFavoriteCharity = function(userId, callback) {
    var sql = 'select r.recipientId, category, status, email, name, ein, address, zipCode, city, state, country, phone, fax, website, ' +
        ' CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, status, facebookUrl, ' +
        ' videoUrl, "" as imagePath, ' +
        ' contactPersonName, contactPersonTitle, rating, ' +
        ' ifNull( isEnabled, "N") as isFavored from ' + tableNames.USER_FAVORITE_RECIPIENT_TABLE +
        ' ur inner join ' + tableNames.RECIPIENT_TABLE +
		' r on ur.recipientId = r.recipientId ' +
		' where ur.userId = ? and isEnabled = "Y" ' ;
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
	var sql  = "update " + tableNames.USER_FAVORITE_RECIPIENT_TABLE + " set isEnabled = '" + value.replace("'", "''") + "' where userId=? and recipientId=?";
    dbPool.runQueryWithParams(sql,[userId, rid],function(err,results) {
        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }		
        if (results.affectedRows == 0 && value== "Y")
		{		
			sql = "insert into " + tableNames.USER_FAVORITE_RECIPIENT_TABLE + "(userId, recipientId) values(?, ?)";
			dbPool.runQueryWithParams(sql,[userId, rid],function(err,results) {
                if(err) {
                    console.error(err);
                    callback(err,null);
                    return;
                }
                callback(null, constants.services.CALLBACK_SUCCESS);
            });
		} else {
            callback(null, constants.services.CALLBACK_SUCCESS);
        }

    })
}

function listAllCharity( userId, start, count, callback ) {
    var sql = ' select recipientId, category, status, email, name, ein, address, zipCode, city, state, country, phone, fax, website, ' +
        ' CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, status, facebookUrl, ' +
        ' videoUrl, imageUrl, "" as imagePath, ' +
        ' contactPersonName, contactPersonTitle, rating from ' + tableNames.RECIPIENT_TABLE;

    if (userId != null)
    {
        sql = ' select r.recipientId, category, status, r.email, r.name, ein, address, zipCode, city, state, country, r.phone, r.fax, website, ' +
            ' CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, status, facebookUrl, ' +
            ' r.videoUrl, r.imageUrl, ' +
            ' r.contactPersonName, r.contactPersonTitle, ' +
            ' r.rating, ifNull( isEnabled, "N") as isFavored from ' + tableNames.RECIPIENT_TABLE +
            ' r left join ' + tableNames.USER_FAVORITE_RECIPIENT_TABLE + ' fr on r.recipientId = fr.recipientId and fr.userId = ' + userId + ' ';
    }

    if(start!=null && count!=null) {
        sql = sql + ' LIMIT '+ start+', '+ count;
    }

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
    var sql = "select recipientId, category, name, ein, address, zipCode, city, state, phone, website, CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, '' as imagePath from " + tableNames.RECIPIENT_TABLE;
	if (userId != null)
	{
	  sql = "select r.recipientId, category, name, ein, address, zipCode, city, state, phone, website, CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, ifNull( isEnabled, 'N') as isFavored from " + tableNames.RECIPIENT_TABLE
		  + " r left join " + tableNames.USER_FAVORITE_RECIPIENT_TABLE + " fr on r.recipientId = fr.recipientId and fr.userId = " + userId + " ";
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

function charityByEIN(ein, userId, callback){
    var sql = ' select recipientId, category, status, email, name, ein, address, zipCode, city, state, country, phone, fax, website, ' +
        ' CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, status, facebookUrl, ' +
        ' videoUrl, "" as imagePath, ' +
        ' contactPersonName, contactPersonTitle, rating from '+
        tableNames.RECIPIENT_TABLE + ' where ein= ' + ein;

    if(userId) {
        sql = sql = ' select r.recipientId, category, status, r.email, r.name, ein, address, zipCode, city, state, country, r.phone, r.fax, website, ' +
            ' CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, status, facebookUrl, ' +
            ' r.videoUrl, r.imageUrl, "" as imagePath, ' +
            ' r.contactPersonName, r.contactPersonTitle, ' +
            ' r.rating, ifNull( isEnabled, "N") as isFavored from ' + tableNames.RECIPIENT_TABLE +
            ' r left join ' + tableNames.USER_FAVORITE_RECIPIENT_TABLE + ' fr on r.recipientId = fr.recipientId and fr.userId = ' + userId + ' ' +
            ' where r.ein= ' + ein;
    }

    dbPool.runQueryWithParams(sql, ein, function(err,results) {
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        if(results && results.length>0) {

            callback(null, results[0]);
        } else {
            logger.error('No result is found - ' + results.length);
            callback(new Error("Internal Error. Please try it again."), null);
        }
    })
}
exports.charityByEIN = charityByEIN;

function charityById(id, userId, callback){
    var sql = ' select recipientId, category, status, email, name, ein, address, zipCode, city, state, country, phone, fax, website, ' +
        ' CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, status, facebookUrl, ' +
        ' videoUrl, "" as imagePath, ' +
        ' contactPersonName, contactPersonTitle, rating from '+
         tableNames.RECIPIENT_TABLE + " where recipientId=" + id;

    if(userId) {
        sql = sql = ' select r.recipientId, category, status, r.email, r.name, ein, address, zipCode, city, state, country, r.phone, r.fax, website, ' +
            ' CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, status, facebookUrl, ' +
            ' r.videoUrl, r.imageUrl, "" as imagePath, ' +
            ' r.contactPersonName, r.contactPersonTitle, ' +
            ' r.rating, ifNull( isEnabled, "N") as isFavored from ' + tableNames.RECIPIENT_TABLE +
            ' r left join ' + tableNames.USER_FAVORITE_RECIPIENT_TABLE + ' fr on r.recipientId = fr.recipientId and fr.userId = ' + userId + ' ' +
            ' where r.recipientId= ' + id;
    }
    dbPool.runQueryWithParams(sql,id,function(err,results) {
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }
        if(results && results.length==1) {

            callback(null, results[0]);
        } else {
            logger.error('The length of result is not equal to 1 -- ' + results.length);
			logger.error('id:' + id);
            callback(new Error("Internal Error. Please try it again."), null);
        }
    })
}

exports.charityById = charityById;

function updateAccountInfoForRecipientAccount(updatedData, recipientId, callback) {
    var updateAccountInfoSql = " update " + tableNames.RECIPIENT_TABLE + " set name = ? , ein = ? , " +
        " category = ?, address = ?, city = ?, state = ?, country = ?, zipCode = ?, phone = ?, fax = ?, " +
        " website = ?, facebookUrl = ?, mission = ?, contactPersonName = ?, contactPersonTitle = ? where recipientId= ? ";

    var params = [updatedData.name, updatedData.ein, updatedData.category, updatedData.address, updatedData.city,
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
    var sql = ' select ut.userId, users.firstName, users.lastName, ut.amount, ' +
        ' ut.datetime, ut.status, users.imageIconUrl, us.transactionPublic from ' +
        tableNames.TRANSACTION_TABLE + ' ut inner join ' +tableNames.USER_TABLE +
        ' on ut.userId = users.userId  inner join ' + tableNames.USER_SETTING_TABLE +
        ' us on users.userId = us.userId where ut.recipientId = ? and ut.status= ? '
        ;
    dbPool.runQueryWithParams( sql, [charityId, constants.paymentStatus.PAID], function(err, results){
        if(err) {
            logger.error(err);
            callback(err,null);
            return;
        }

        for(var i in results) {
            if(results[i].transactionPublic == 'N') {
                results[i].imageIconUrl= constants.paths.BLANK_ICON_PATH;
                results[i].firstName = constants.strings.ANONYMOUS;
                results[i].lastName = '';
            }
        }
        callback(null, results);
    });
}
exports.getTransactionsByCharityId = getTransactionsByCharityId;

function getTransactionSummaryForCharity( charityId, duration, callback ) {
    var sql = ' select sum(ut.amount), count(1), r.recipientId from ' + tableNames.TRANSACTION_TABLE +
            ' ut inner join ' + tableNames.RECIPIENT_TABLE + ' r on ' +
            ' ut.recipientId = r.recipientId where ut.recipientId = ? and ut.status= ? '
        ;
}


exports.updateAccountInfoForRecipientAccount = updateAccountInfoForRecipientAccount;

function updatePasswordForRecipientAccount(updateData, recipientId, callback) {

    if(updateData.newPassword != updateData.confirmPassword) {
        callback(new Error("Passwords don't match."), null);
        return;
    } else if(updateData.confirmPassword.length<8) {
        callback(new Error("The length of password should not less than 8."), null);
        return;
    }

    var checkOldPasswordSql = 'select recipientId, password from ' + tableNames.RECIPIENT_TABLE + ' where recipientId = ? ';
    dbPool.runQueryWithParams(checkOldPasswordSql, [recipientId], function(err,results) {
        if(err) {
            logger.error(err);
            callback(new Error("Updating password failed. Please try it again."),null);
            return;
        }
        //console.log('old password-'+updateData.oldPassword);
        if(results && results.length==1 && encryptionUtil.validatePassword(updateData.oldPassword, results[0].password)) {
            var updatePasswordSql = ' update ' + tableNames.RECIPIENT_TABLE + ' set password = ? where recipientId = ? ';
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
