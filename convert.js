var json2csv = require('json2csv');
var fs = require('fs');

var json = JSON.parse(fs.readFileSync('./all.json', 'utf8'));

var fixed = json.map(function(item) {
    item.rating = parseInt(item.rating);
    return item;
});

var result = json2csv({ data: fixed});
console.log(result);  
