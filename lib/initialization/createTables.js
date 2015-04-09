/**
 *  Initialization script, creating all the necessary tables
 *
 */
var dbPool = require('../db/createDBConnectionPool');
var  tableNames = require('../common/tableNames').TABLE_NAMES;
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
var dropTableSQL7='DROP TABLE '+ tableNames.USER_FAVORITE_RECIPIENT_TABLE;
var dropTableSQL8='DROP TABLE '+ tableNames.USER_CONTACT_US;
var dropTableSQL9='DROP TABLE '+ tableNames.HOT_CHARITIES;
var dropTableSQL10='DROP TABLE '+ tableNames.QR_SCAN_HISTORY;

dropTableSQLs.push(dropTriggerSQL0);
dropTableSQLs.push(dropTableSQL10);
dropTableSQLs.push(dropTableSQL9);
dropTableSQLs.push(dropTableSQL8);
dropTableSQLs.push(dropTableSQL7);
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
    ' ( userId INT PRIMARY KEY AUTO_INCREMENT, ' +
    ' email VARCHAR(255) NOT NULL, ' + //username is email
    ' password VARCHAR(63) NOT NULL, ' +
    ' firstName VARCHAR(20) NOT NULL, ' +
    ' middleName VARCHAR(20) , ' +
    ' lastName VARCHAR(20) NOT NULL, ' +
    ' displayName VARCHAR(63) , ' +
    ' imageIconUrl VARCHAR(63), ' + //Maybe we should use convention, only check the icon exists or not
    ' provider VARCHAR(15) DEFAULT \'willgive\' ,' + //@provider, if login using facebook, then it is facebook
    ' creationDatetime TIMESTAMP default now(), ' +
    ' lastUpdatedBy VARCHAR(15) default \'sysuser\', ' +
    ' lastUpdatedTime TIMESTAMP  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ' +
    ' UNIQUE(userId), UNIQUE(provider, email) ' +  //LOGIN and PASSWORD?
    ' )ENGINE=InnoDB AUTO_INCREMENT=100000001 DEFAULT CHARSET=utf8 ';

var createTableSQL1 = ' CREATE TABLE ' + tableNames.USER_LOGIN_HISTORY_TABLE  +
    ' ( historyId INT PRIMARY KEY AUTO_INCREMENT, ' +
    '   userId INT NOT NULL ,' +
    '   loginDatetime DATETIME  DEFAULT now(), ' +
    '   logoutDatetime DATETIME , ' +
    '   sessionId VARCHAR(8) NOT NULL, ' + //sessionId is used for identifier of this login activity
    '   device ENUM(\'Web\', \'App\') DEFAULT \'Web\' ' + // login via web or mobile app
    //'   FOREIGN KEY login_history_f_key_user_id (userId) REFERENCES '+tableNames.USER_TABLE+' (userId) ON DELETE CASCADE ' +
    '  ) ENGINE=InnoDB DEFAULT CHARSET=utf8 ';

var createTableSQL2 = ' CREATE TABLE ' + tableNames.USER_FIND_PASSWORD +
    ' ( email VARCHAR(255) NOT NULL, ' +
    '   randomString VARCHAR(31) NOT NULL, ' +
    '   requestDatetime DATETIME default now(), ' +
    '   isActive  ENUM(\'Y\', \'N\') DEFAULT \'Y\' ' +
    ' ) ENGINE=InnoDB DEFAULT CHARSET=utf8'

//userId starting from 1000000001
var createTableSQL3 = 'CREATE TABLE ' + tableNames.USER_SETTING_TABLE  +
    ' ( userId INT PRIMARY KEY , ' +
    ' maxAmountPerTime INT default 100, ' +
    ' maxAmountPerDay INT default 300, ' +
    ' defaultAmount INT default 20, ' +
    ' receiveEmail VARCHAR(1) default \'Y\', ' +
    ' receiveNotification VARCHAR(1) default \'Y\', ' +
    ' transactionPublic VARCHAR(1) default \'Y\', ' +
    ' creationDatetime TIMESTAMP default now(), ' +
    ' lastUpdatedBy VARCHAR(15) default \'sysuser\', ' +
    ' lastUpdatedTime TIMESTAMP  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ' +
    ' UNIQUE(userId) ' +
    //' FOREIGN KEY user_setting_f_key_user_id (userId) REFERENCES '+tableNames.USER_TABLE+' (userId) ON DELETE CASCADE ' +
    ' )ENGINE=InnoDB DEFAULT CHARSET=utf8 ';

var createTriggerSQL0 =
    ' CREATE TRIGGER user_auto_setting AFTER INSERT ON '+ tableNames.USER_TABLE +' FOR EACH ROW ' +
    ' INSERT INTO '+tableNames.USER_SETTING_TABLE +' (userId) VALUES (NEW.userId)';

var createTableSQL4 = 'CREATE TABLE ' + tableNames.RECIPIENT_TABLE +
    ' (recipientId INT PRIMARY KEY AUTO_INCREMENT, ' +
    ' type VARCHAR(5) DEFAULT \'C\', ' +
    ' name VARCHAR(255) NOT NULL, ' +
    ' ein VARCHAR(31) NOT NULL, ' +
    ' status VARCHAR(15) DEFAULT \'Approved\', ' +
    ' category VARCHAR(31) NOT NULL, ' +
    ' address VARCHAR(255) NOT NULL, ' +
    ' city VARCHAR(63) NOT NULL, ' +
    ' state VARCHAR(31) NOT NULL, ' +
    ' zipCode VARCHAR(15) NOT NULL, ' +
    ' country VARCHAR(63) Default \'United States\', '+
    ' phone VARCHAR(31) NOT NULL, ' +
    ' fax VARCHAR(31), ' +
    ' email VARCHAR(63), ' +
    ' password VARCHAR(63), ' +
    ' contactPersonName VARCHAR(63),' +
    ' contactPersonTitle VARCHAR(63), ' +
    ' mission BLOB , ' +
    ' imageUrl VARCHAR(63), ' +
    ' videoUrl VARCHAR(127), ' +
    ' website VARCHAR(127), ' +
    ' facebookUrl VARCHAR(63), '+
    ' rating DOUBLE DEFAULT 0.0, ' +
    ' creationDatetime TIMESTAMP default now(), ' +
    ' lastUpdatedBy VARCHAR(15) default \'sysuser\', ' +
    ' lastUpdatedTime TIMESTAMP  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, ' +
    ' UNIQUE(email) ' +  //LOGIN and PASSWORD?
    ' )ENGINE=InnoDB AUTO_INCREMENT=900000001 DEFAULT CHARSET=utf8 ';

//We need to generate transaction Id
var createTableSQL5 = 'CREATE TABLE ' + tableNames.TRANSACTION_TABLE +
    ' (transactionId VARCHAR(50) PRIMARY KEY, ' +
    ' amount DOUBLE, ' +
    ' userId  INT, ' +
    ' recipientId  INT, ' +
    ' datetime  TIMESTAMP default now(), ' +
    ' settleTime  TIMESTAMP, ' +
    ' status  VARCHAR(15), ' +
    ' notes  VARCHAR(1500), ' +
    ' stripeToken  VARCHAR(50), ' +
    ' source VARCHAR(10) default \'Web\', ' +
    ' confirmationCode VARCHAR(100), ' +
    ' UNIQUE(transactionId) ' +
    //' FOREIGN KEY userId (userId) REFERENCES '+ tableNames.USER_TABLE+' (userId) ON DELETE RESTRICT ,' +
    //' FOREIGN KEY recipientId (recipientId) REFERENCES '+ tableNames.RECIPIENT_TABLE+' (recipientId) ON DELETE RESTRICT ' +
    ' )ENGINE=InnoDB DEFAULT CHARSET=utf8 ';


var createTableSQL6 = 'CREATE TABLE ' + tableNames.PAYMENT_METHOD_TABLE +
    ' (userId INT,' +
    ' stripeCustomerId VARCHAR(50), ' +
    ' type VARCHAR(50), ' +
    ' cvc VARCHAR(50), ' +
    ' address VARCHAR(50), ' +
    ' phone  VARCHAR(50), ' +
    ' nameOnCard  VARCHAR(15), ' +
    ' expirationDate  TIMESTAMP, ' +
    ' last4  VARCHAR(15) ' +
    //' FOREIGN KEY userId (userId) REFERENCES '+tableNames.USER_TABLE+' (userId) ON DELETE RESTRICT ' +
    ' )ENGINE=InnoDB DEFAULT CHARSET=utf8 ';

var createTableSQL7 = 'CREATE TABLE ' + tableNames.USER_FAVORITE_RECIPIENT_TABLE +
    ' (id INT PRIMARY KEY AUTO_INCREMENT, ' +
    ' userId INT,' +
    ' recipientId INT,' +
    ' isEnabled VARCHAR(1) default \'Y\', ' +
    ' addDate  TIMESTAMP ' +
        //' FOREIGN KEY userId (userId) REFERENCES '+tableNames.USER_TABLE+' (userId) ON DELETE RESTRICT ' +
    ' )ENGINE=InnoDB DEFAULT CHARSET=utf8 ';

var createTableSQL8 = ' CREATE TABLE ' + tableNames.USER_CONTACT_US +
    ' ( id INT PRIMARY KEY AUTO_INCREMENT, ' +
    ' userId INT, ' +
    ' email VARCHAR(255), ' +
    ' name VARCHAR(63),' +
    ' content BLOB, datetime TIMESTAMP default now() )ENGINE=InnoDB DEFAULT CHARSET=utf8';

var createTableSQL9 = ' CREATE TABLE ' + tableNames.HOT_CHARITIES +  ' ( recipientId INT PRIMARY KEY AUTO_INCREMENT )';

var createTableSQL10 = ' CREATE TABLE ' + tableNames.QR_SCAN_HISTORY +
    ' (id INT PRIMARY KEY AUTO_INCREMENT, ' +
    ' userId INT, ' +
    ' recipientId INT, ' +
    ' datetime TIMESTAMP default now(), ' +
    ' latitude DOUBLE, ' +
    ' longitude DOUBLE, ' +
    ' qrCodeId INT ' +  // we might need to distinguish different QR Code for the same charity
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
createTableSQLs.push(createTableSQL7);
createTableSQLs.push(createTableSQL8);
createTableSQLs.push(createTableSQL9);
createTableSQLs.push(createTableSQL10);


console.log("Drop tables ...");
//Drop tables first
for(var i in dropTableSQLs) {
    console.log(dropTableSQLs[i]);
    connection.query(dropTableSQLs[i],errorHandler);
}

console.log("Create tables ...");
//Create tables
for(var i in createTableSQLs) {
   // console.log(createTableSQLs[i]);
    connection.query(createTableSQLs[i],errorHandler);
}



connection.end();

