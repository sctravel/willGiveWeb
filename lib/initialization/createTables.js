/**
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

var dropTriggerSQL0 = 'DROP Trigger user_auto_setting';
var dropTableSQL0='DROP TABLE '+ tableNames.USER_TABLE;
var dropTableSQL1='DROP TABLE '+ tableNames.USER_LOGIN_HISTORY_TABLE;
var dropTableSQL2='DROP TABLE '+ tableNames.USER_FIND_PASSWORD;
var dropTableSQL3='DROP TABLE '+ tableNames.USER_SETTING_TABLE;
var dropTableSQL4='DROP TABLE '+ tableNames.RECIPIENT_TABLE;
var dropTableSQL5='DROP TABLE '+ tableNames.TRANSACTION_TABLE;
var dropTableSQL6='DROP TABLE '+ tableNames.PAYMENT_METHOD_TABLE;

dropTableSQLs.push(dropTriggerSQL0);
dropTableSQLs.push(dropTableSQL6);
dropTableSQLs.push(dropTableSQL5);
dropTableSQLs.push(dropTableSQL4);
dropTableSQLs.push(dropTableSQL3);
dropTableSQLs.push(dropTableSQL2);
dropTableSQLs.push(dropTableSQL1);
dropTableSQLs.push(dropTableSQL0);


/////////////////////////////////////////////////////////////////////
// SQL for creating the tables
/////////////////////////////////////////////////////////////////////

//userId starting from 1000000001
var createTableSQL0 = 'CREATE TABLE ' + tableNames.USER_TABLE  +
    ' ( user_id INT PRIMARY KEY AUTO_INCREMENT, ' +
    ' email VARCHAR(255) NOT NULL, ' + //username is email
    ' password VARCHAR(63) NOT NULL, ' +
    ' first_name VARCHAR(20) NOT NULL, ' +
    ' middle_name VARCHAR(20) , ' +
    ' last_name VARCHAR(20) NOT NULL, ' +
    ' display_name VARCHAR(63) , ' +
    ' image_icon_url VARCHAR(63), ' + //Maybe we should use convention, only check the icon exists or not
    ' provider VARCHAR(15) DEFAULT \'willgive\' ,' + //@provider, if login using facebook, then it is facebook
    ' creation_datetime TIMESTAMP default now(), ' +
    ' last_updated_by VARCHAR(15) default \'sysuser\', ' +
    ' last_updated_time TIMESTAMP  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ' +
    ' UNIQUE(user_id), UNIQUE(provider, email) ' +  //LOGIN and PASSWORD?
    ' )ENGINE=InnoDB AUTO_INCREMENT=100000001 DEFAULT CHARSET=utf8 ';

var createTableSQL1 = ' CREATE TABLE ' + tableNames.USER_LOGIN_HISTORY_TABLE  +
    ' ( history_id INT PRIMARY KEY AUTO_INCREMENT, ' +
    '   user_id INT NOT NULL ,' +
    '   login_datetime DATETIME  DEFAULT now(), ' +
    '   logout_datetime DATETIME , ' +
    '   session_id VARCHAR(8) NOT NULL, ' + //sessionId is used for identifier of this login activity
    '   device ENUM(\'Web\', \'App\') DEFAULT \'Web\', ' + // login via web or mobile app
    '   FOREIGN KEY login_history_f_key_user_id (user_id) REFERENCES '+tableNames.USER_TABLE+' (user_id) ON DELETE CASCADE ' +
    '  ) ENGINE=InnoDB DEFAULT CHARSET=utf8 ';

var createTableSQL2 = ' CREATE TABLE ' + tableNames.USER_FIND_PASSWORD +
    ' ( email VARCHAR(255) NOT NULL, ' +
    '   random_string VARCHAR(31) NOT NULL, ' +
    '   request_datetime DATETIME default now(), ' +
    '   is_active  ENUM(\'Y\', \'N\') DEFAULT \'Y\' ' +
    ' ) ENGINE=InnoDB DEFAULT CHARSET=utf8'

//userId starting from 1000000001
var createTableSQL3 = 'CREATE TABLE ' + tableNames.USER_SETTING_TABLE  +
    ' ( user_id INT PRIMARY KEY , ' +
    ' max_amount_per_time INT default 100, ' +
    ' max_amount_per_day INT default 300, ' +
    ' default_amount INT default 20, ' +
    ' receive_email VARCHAR(1) default \'Y\', ' +
    ' receive_notification VARCHAR(1) default \'Y\', ' +
    ' transaction_public VARCHAR(1) default \'Y\', ' +
    ' creation_datetime TIMESTAMP default now(), ' +
    ' last_updated_by VARCHAR(15) default \'sysuser\', ' +
    ' last_updated_time TIMESTAMP  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ' +
    ' UNIQUE(user_id),' +
    ' FOREIGN KEY user_setting_f_key_user_id (user_id) REFERENCES '+tableNames.USER_TABLE+' (user_id) ON DELETE CASCADE ' +
    ' )ENGINE=InnoDB DEFAULT CHARSET=utf8 ';

var createTriggerSQL0 =
    ' CREATE TRIGGER user_auto_setting AFTER INSERT ON '+ tableNames.USER_TABLE +' FOR EACH ROW ' +
    ' INSERT INTO '+tableNames.USER_SETTING_TABLE +' (user_id) VALUES (NEW.user_id)';

var createTableSQL4 = 'CREATE TABLE ' + tableNames.RECIPIENT_TABLE +
    ' (recipient_id INT PRIMARY KEY AUTO_INCREMENT, ' +
    ' name VARCHAR(255) NOT NULL, ' +
    ' EIN VARCHAR(31) NOT NULL, ' +
    ' STATUS VARCHAR(15) DEFAULT \'Approved\', ' +
    ' Category VARCHAR(31) NOT NULL, ' +
    ' Address VARCHAR(255) NOT NULL, ' +
    ' City VARCHAR(63) NOT NULL, ' +
    ' State VARCHAR(31) NOT NULL, ' +
    ' ZipCode VARCHAR(15) NOT NULL, ' +
    ' Phone VARCHAR(31) NOT NULL, ' +
    ' FAX VARCHAR(31), ' +
    ' Email VARCHAR(63), ' +
    ' CONTACT_PERSON_NAME VARCHAR(63) NOT NULL, ' +
    ' CONTACT_PERSON_Title VARCHAR(63) NOT NULL, ' +
    ' MISSION BLOB NOT NULL, ' +
    ' Image_URL VARCHAR(63), ' +
    ' Video_URL VARCHAR(127), ' +
    ' Website VARCHAR(127), ' +
    ' FACEBOOK_URL VARCHAR(63), '+
    ' Rating INT DEFAULT 0, ' +
    ' creation_datetime TIMESTAMP default now(), ' +
    ' last_updated_by VARCHAR(15) default \'sysuser\', ' +
    ' last_updated_time TIMESTAMP  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ' +
    ' UNIQUE(recipient_id) ' +  //LOGIN and PASSWORD?
    ' )ENGINE=InnoDB AUTO_INCREMENT=900000001 DEFAULT CHARSET=utf8 ';

//We need to generate transaction Id
var createTableSQL5 = 'CREATE TABLE ' + tableNames.TRANSACTION_TABLE +
    ' (transaction_id VARCHAR(20) PRIMARY KEY, ' +
    ' amount DOUBLE, ' +
    ' user_id  INT, ' +
    ' recipient_id  INT, ' +
    ' dateTime  TIMESTAMP default now(), ' +
    ' settleTime  TIMESTAMP, ' +
    ' status  VARCHAR(15), ' +
    ' stripeToken  VARCHAR(50), ' +
    ' UNIQUE(transaction_id), ' +
    ' FOREIGN KEY user_id (user_id) REFERENCES '+ tableNames.USER_TABLE+' (user_id) ON DELETE RESTRICT ,' +
    ' FOREIGN KEY recipient_id (recipient_id) REFERENCES '+ tableNames.RECIPIENT_TABLE+' (recipient_id) ON DELETE RESTRICT ' +
    ' )ENGINE=InnoDB DEFAULT CHARSET=utf8 ';


var createTableSQL6 = 'CREATE TABLE ' + tableNames.PAYMENT_METHOD_TABLE +
    ' (user_id INT,' +
    ' stripe_customerId VARCHAR(50), ' +
    ' type VARCHAR(50), ' +
    ' cvc VARCHAR(50), ' +
    ' address VARCHAR(50), ' +
    ' phone  VARCHAR(50), ' +
    ' nameOnCard  VARCHAR(15), ' +
    ' expirationDate  TIMESTAMP, ' +
    ' FOREIGN KEY user_id (user_id) REFERENCES '+tableNames.USER_TABLE+' (user_id) ON DELETE RESTRICT ' +
    ' )ENGINE=InnoDB DEFAULT CHARSET=utf8 ';

/////////////////////////////////////////////////////////////////////
// Creating all the tables
/////////////////////////////////////////////////////////////////////

var createTableSQLs=[];
createTableSQLs.push(createTableSQL0);
createTableSQLs.push(createTableSQL1);
createTableSQLs.push(createTableSQL2);
createTableSQLs.push(createTableSQL3);
createTableSQLs.push(createTriggerSQL0);
createTableSQLs.push(createTableSQL4);
createTableSQLs.push(createTableSQL5);
createTableSQLs.push(createTableSQL6);



console.log("Drop tables ...");
//Drop tables first
for(var i in dropTableSQLs) {
    console.log(dropTableSQLs[i]);
    connection.query(dropTableSQLs[i],errorHandler);
}

console.log("Create tables ...");
//Create tables
for(var i in createTableSQLs) {
   // console.log(dropTableSQLs[i]);
    connection.query(createTableSQLs[i],errorHandler);
}



connection.end();

