/**
 * Created by XiTU on 3/31/14.
 */

var mysql=require('mysql');

//parameters for connecting to DB
var dbOptions={
    host: 'localhost',//process.env.MYSQL_HOST,
    user: 'root',//process.env.MYSQL_USER,

    password: 'root_mysql',//process.env.MYSQL_PASS,
    database: 'willGive',//process.env.MYSQL_DB,
    connectionLimit: 100,
    supportBigNumbers: true
};


var pool = mysql.createPool(dbOptions);

//The db connection, not using connection pool
exports.connection = mysql.createConnection(dbOptions);

/**
 *
 * @param sql: the sql to run
 * @param params: the values of the parameters in sql
 * @param callback: callback function to deal with the result
 */
exports.runQueryWithParams = function(sql, params, callback) {
    var logger = require('../../app').logger;

    pool.getConnection(function(err,conn){
        if(err){
            logger.error("Get connection from pool failed in runQueryWithParams.");
            callback(err,null);
            return;
        }
        conn.query(sql, params, function(err,results){
            if(err){
                logger.error("Error in runQueryWithParams with SQL: "+sql+" and params: "+params);
                conn.release();
                callback(err,null);
                return;
            }
            callback(null,results);
            conn.release();
        })
    })
}

/**
 *
 * @param sql: the sql to run
 * @param callback: callback function to deal with the result
 */
exports.runQuery = function(sql, callback) {
    var logger = require('../../app').logger;

    pool.getConnection(function(err,conn){
        if(err){
            logger.error("Get connection from pool failed in runQuery.");
            callback(err,null);
            return;
        }
        conn.query(sql, function(err,results){
            if(err){
                logger.error(sql+" failed \n" +err);//throw err;}
                conn.release();
                callback(err,null);
                return;
            }
            callback(null,results);
            conn.release();
        })
     })
 }