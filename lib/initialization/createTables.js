﻿/**
 *  Initialization script, creating all the necessary tables
 *
 */
var dbPool = require('../db/createDBConnectionPool');
var tableNames = require('../common/tableNames').TABLE_NAMES;
var constants = require('../common/constants');
var connection = dbPool.connection;


var callback = function(results) {
    console.log(results);
}

var errorHandler = function(err) {
    if (err != null)
        console.log(err);
}

connection.connect();

/////////////////////////////////////////////////////////////////////
// Drop all the tables before creating them if exist
/////////////////////////////////////////////////////////////////////

var dropTableSQLs=[];

var dropTableSQL0='DROP TABLE '+ tableNames.USER_TABLE;
var dropTableSQL1='DROP TABLE '+ tableNames.USER_LOGIN_HISTORY_TABLE;


dropTableSQLs.push(dropTableSQL1);
dropTableSQLs.push(dropTableSQL0);

/////////////////////////////////////////////////////////////////////
// SQL for creating the tables
/////////////////////////////////////////////////////////////////////

var createTableSQL0 = 'CREATE TABLE ' + tableNames.USER_TABLE  +
    ' ( user_id INT PRIMARY KEY AUTO_INCREMENT, ' +
    ' username VARCHAR(31) NOT NULL, ' +
    ' password VARCHAR(63) NOT NULL, ' +
    ' first_name VARCHAR(20) NOT NULL, ' +
    ' middle_name VARCHAR(20) , ' +
    ' last_name VARCHAR(20) NOT NULL, ' +
    ' phone VARCHAR(15) , ' +
    ' email VARCHAR(255) NOT NULL, ' +
    ' address VARCHAR(255) , ' +
    ' city VARCHAR(63) , ' +
    ' state VARCHAR(15), ' +
    ' country VARCHAR(20), ' +
    ' post_code VARCHAR(15), ' +
    ' provider VARCHAR(15) DEFAULT \'willgive\' ,' + //@provider, if login using facebook, then it is facebook
    ' is_active ENUM(\'Y\', \'N\') DEFAULT \'Y\' ,' +
    ' creation_datetime TIMESTAMP default now(), ' +
    ' last_updated_by VARCHAR(15) default \'sysuser\', ' +
    ' last_updated_time TIMESTAMP  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ' +
    ' UNIQUE(user_id), UNIQUE(username), UNIQUE(provider, email) ' +  //LOGIN and PASSWORD?
    ' )ENGINE=InnoDB AUTO_INCREMENT=1000001 DEFAULT CHARSET=utf8 ';

var createTableSQL1 = ' CREATE TABLE ' + tableNames.USER_LOGIN_HISTORY_TABLE  +
    ' ( history_id INT PRIMARY KEY AUTO_INCREMENT, ' +
    '   user_id INT NOT NULL ,' +
    '   login_datetime DATETIME  DEFAULT now(), ' +
    '   logout_datetime DATETIME , ' +
    '   random_key VARCHAR(6) NOT NULL, ' + //randomKey is used for identifier of this login activity
    '   FOREIGN KEY login_history_f_key_customer_id (user_id) REFERENCES '+tableNames.USER_TABLE+' (user_id) ON DELETE CASCADE ' +
    '  ) ENGINE=InnoDB DEFAULT CHARSET=utf8 ';



/////////////////////////////////////////////////////////////////////
// Creating all the tables
/////////////////////////////////////////////////////////////////////

var createTableSQLs=[];
createTableSQLs.push(createTableSQL0);
createTableSQLs.push(createTableSQL1);


console.log("Drop tables ...");
//Drop tables first
for(var i in dropTableSQLs) {
   // console.log(dropTableSQLs[i]);
    connection.query(dropTableSQLs[i],errorHandler);
}

console.log("Create tables ...");
//Create tables
for(var i in createTableSQLs) {
   // console.log(dropTableSQLs[i]);
    connection.query(createTableSQLs[i],errorHandler);
}



connection.end();
