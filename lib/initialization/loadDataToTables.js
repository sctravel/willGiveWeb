/**
 * Created by XiTU on 1/27/14.
 */

var fs=require('fs');
var readline=require('readline');
var constants = require('./../common/constants');
//var assert = require('assert');
var dbPool = require('./../db/createDBConnectionPool');
var stringUtils = require('./../utils/stringUtils');
var tableNames = require('./../common/tableNames');


//connection.query('CREATE database sctravel');
//connection.query('USE sctravel');


/**********************************************
 *
 * Read data from txt files
 *  according to the format given by params
 * Load the data read from file to
 *  our @tableName table in our DB
 *
 * @param tableColumnNames
 * @param tableColumnTypes
 * @param filePath
 * @param delimiter
 * @param tableName
 *
 *********************************************/
var loadDataFromTxtToTable = function( tableColumnNames, tableColumnTypes, filePath, delimiter, tableName) {

    var connection = dbPool.connection;
    //check the length of tableColumnNames and table ColumnTypes
    if(tableColumnNames.length != tableColumnTypes.length) {
        throw new Error("The length for " + tableName + " of tableColumnNames is "+ tableColumnNames.length+"; and the length of " +
   " tableColumnTypes is "+ tableColumnTypes.length+". They should be equal!");
    }


   // console.log("splitting line by "+delimiter);

    var rd = readline.createInterface({
        input: fs.createReadStream(filePath),
        output: process.stdout,
        terminal: false
    });

    var lineNo = 1;
    var processline = function(line) {
       lineNo ++;
       if (line == "#end#")
       {
       	   console.log("Load complete:" + lineNo + ".  Press Ctrl-C to end.");
       	   return;
       }
       var userInput = line.split(delimiter);

        //Convert the types from String to Number if necessary
        for(var i in tableColumnTypes) {

           var type = tableColumnTypes[i];
           if(type==constants.TYPE_NUMBER) {
               userInput[i] = Number(userInput[i]);
           } else if(type==constants.TYPE_STRING) {
               if(userInput[i]) {
                   userInput[i]=userInput[i].trim();
               }
           } else if(type==constants.TYPE_DATE) {
               if(!userInput[i] || userInput[i]=='') {
                   userInput[i]=null;
               }
           }
        }

        //console.log(userInput);
        var insertSql = 'Insert into ' + tableName +
   ' ( ' + stringUtils.getDelimitedStringFromArray(tableColumnNames,',') +' ) VALUES ( ' +
  stringUtils.getDelimitedRepeatString('?',',',tableColumnNames.length) + ' ) ' ;
        //console.log(insertSql);
        //we can get the automated insertId here in the results
        connection.query( insertSql, userInput,function(err,results){
            if (err != null) console.error(err);
   	//console.dir(results)
        });
        return;
    }

    rd.on('line', function(line) {
        processline(line);
        //console.log(line);
    });

    rd.on('close',function(){
       // connection.end();
    })


}


/***********************
 *
 * Loading data from txt
 *  file to our DB
 *
 * @type {string}
 **********************/
var productsFilePath = './Charity.csv';
var productsColumnNames=['name','EIN','Status','Address','City',
'State','Zipcode','CONTACT_PERSON_NAME','CONTACT_PERSON_Title','phone',
'fax','website','category','mission'];

var productsColumnTypes=['STRING',   'STRING',  'STRING',  'STRING', 'STRING',
'STRING',  'STRING',  'STRING', 'STRING', 'STRING',
'STRING','STRING', 'STRING',   'STRING'];

loadDataFromTxtToTable(productsColumnNames,productsColumnTypes,productsFilePath,'|', tableNames.TABLE_NAMES.RECIPIENT_TABLE);


//rd.close();
//name, type, content, image, web_url, latitude, longtitude, city, address, phone, hours



