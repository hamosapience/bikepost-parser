var json2csv = require('json2csv');
var fs = require('fs');
var moment = require('moment');
var _ = require('lodash');

moment.locale('ru');   

var json = JSON.parse(fs.readFileSync('./all.json', 'utf8'));

function fixDate(creationDate, postDate) {
    return postDate
        .replace('сегодня', moment(creationDate).format('LL'))
        .replace('вчера', moment(creationDate).subtract(1, 'days').format('LL'));
}

var fixed = json
    .filter(item => item.url)
    .map(function(item) {
        item.rating = parseInt(item.rating);
        item.blog = item.url.split('/')[4];
        item.date = fixDate(item.pageRequestTime, item.rawDate);
        return _.omit(item, ['rawDate', 'pageRequestTime', 'author_link']);
    });

// var result = json2csv({
//     data: fixed
// });

console.log(JSON.stringify(fixed, null, 2));
