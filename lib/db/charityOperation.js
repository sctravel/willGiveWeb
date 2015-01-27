var tableNames = require('./../common/tableNames').TABLE_NAMES;
var conn = require('./../db/createDBConnectionPool');
var stringUtil = require('./../utils/stringUtils');
var dbPool = require('../db/createDBConnectionPool');
var constants = require('./../common/constants');

exports.searchCharity = function(userId, condition, callback) {
    var sql = "select recipient_id, name, EIN, city, state, phone, website, CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission from " + tableNames.RECIPIENT_TABLE;
	if (userId != null)
	{
	  sql = "select r.recipient_id, name, EIN, city, state, phone, website, CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, ifNull( isEnabled, 'N') as isFavored from " + tableNames.RECIPIENT_TABLE
		  + " r left join " + tableNames.USER_FAVORITE_RECIPIENT_TABLE + " fr on r.recipient_id = fr.recipient_id and fr.user_id = " + userId + " ";
	}
	sql += " where name like ? " +
        " or EIN like ? or City like ? or website like ? or mission like ?";
	var condition = "%" + condition + "%"    
    dbPool.runQueryWithParams(sql,[condition, condition, condition, condition, condition],function(err,results) {
        if(err) {
            console.error(err);
            callback(err,null);
            return;
        }		
        callback(null, results);
    })
}

exports.getFavoriteCharity = function(userId, callback) {
    var sql = "select r.recipient_id, name, EIN, city, state, phone, website, CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, ifNull( isEnabled, 'N') as isFavored from " + tableNames.USER_FAVORITE_RECIPIENT_TABLE + " ur inner join " 
		+ tableNames.RECIPIENT_TABLE
		+ " r on ur.recipient_id = r.recipient_id "
		+ " where ur.user_id = ? and isEnabled = 'Y'";
    dbPool.runQueryWithParams(sql,[userId],function(err,results) {
        if(err) {
            console.error(err);
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

function listCharity(userId, category, state, city, callback) {
    var sql = "select recipient_id, name, EIN, city, state, phone, website, CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission from " + tableNames.RECIPIENT_TABLE;
	if (userId != null)
	{
	  sql = "select r.recipient_id, name, EIN, city, state, phone, website, CAST(mission AS CHAR(10000) CHARACTER SET utf8) as mission, ifNull( isEnabled, 'N') as isFavored from " + tableNames.RECIPIENT_TABLE
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
            console.error(err);
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
            console.error(err);
            callback(err,null);
            return;
        }
        callback(null, results);
    })
}
exports.classifyCharity = classifyCharity;