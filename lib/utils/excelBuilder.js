/**
 * Created by XiTU on 4/13/15.
 */
// Create a new workbook file in current working-path
var excelbuilder = require('msexcel-builder');

var workbook = excelbuilder.createWorkbook('./', 'sample.xlsx')

// Create a new worksheet with 10 columns and 12 rows
var sheet1 = workbook.createSheet('sheet1', 10, 12);

// Fill some data
sheet1.set(1, 1, 'I am title');
for (var i = 2; i < 5; i++)
    sheet1.set(i, 1, 'test'+i);

// Save it
workbook.save(function(ok){
    if (!ok)
        workbook.cancel();
    else
        console.log('congratulations, your workbook created');
});

// Create an excel file with single sheet
//@param filePath: the path of the excel file
//@param fileName: the name of the file
//@param data: json array to be stored as excel file
//@param schema: an array of the schema
exports.createExcelFile = function(filePath, fileName, schema, data) {
    var workbook = excelbuilder.createWorkbook(filePath, fileName)

    var columns = schema.length;
    var rows = data.length;
    var sheet1 = workbook.createSheet('sheet1', columns, rows);

    for(var i=1; i<=columns; ++i) {
        sheet1.set(i, 1, schema[i-1]);
    }

    for(var j=2; j<=rows+1; ++j) {
        for(var i=1; i<=columns; ++i) {
            sheet1.set(i, j, data[j-2][schema[i-1]]);
        }
    }
    workbook.save(function(ok){
        if (!ok)
            workbook.cancel();
        else
            console.log('congratulations, your workbook created');
    });
}