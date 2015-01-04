/**
 * Created by XiTU on 3/31/14.
 */

var mysql=require('mysql');

var dbOptions={
    host: 'localhost',//process.env.MYSQL_HOST,
    user: 'root',//process.env.MYSQL_USER,

    password: 'root_mysql',//process.env.MYSQL_PASS,
    database: 'willGive',//process.env.MYSQL_DB,
    connectionLimit: 100,
    supportBigNumbers: true
};


var pool = mysql.createPool(dbOptions);
var errorHandler = function(err) {
    console.log(err);
}

exports.connection = mysql.createConnection(dbOptions);


exports.runQueryWithParams = function(sql, params, callback) {
    pool.getConnection(function(err,conn){
        if(err){
            console.error("Get connection from pool failed in runQueryWithParams.");
            return;
        }
        conn.query(sql, params, function(err,results){
            if(err){
                console.error("Error in runQueryWithParams with SQL: "+sql+" and params: "+params);
                conn.release();
                callback(err,null);
                return;
            }
            callback(null,results);
            conn.release();
        })
    })
}

exports.runQuery = function(sql, callback) {
    pool.getConnection(function(err,conn){
        if(err){
            console.error("Get connection from pool failed in runQuery.");
            return;
        }
        conn.query(sql, function(err,results){
            if(err){
                console.error(sql+" failed \n" +err);//throw err;}
                conn.release();
                callback(err,null);
                return;
            }
            callback(null,results);
            conn.release();
        })
     })
 }