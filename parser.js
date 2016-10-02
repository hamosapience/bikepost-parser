const cheerio = require('cheerio');
const _ = require('lodash');
const got = require('got');

const baseUrl = 'http://bikepost.ru/blog/wsbk/';

function getPostList(pageUrl) {
    console.log('getPostList', pageUrl);
    return Promise.resolve();

}

function getPostRating(pageContent, postId) {

}

function getPageCount(url) {
    return got(url).then(response => {
        const $ = cheerio.load(response.body);
        return $(".pagination ul li").last().find("a").text()
    });
}

function start(baseUrl) {

    getPageCount(baseUrl).then(pageCount => {
        console.log('pageCount', pageCount);

        _.range(5).reduce((prev, pageIndex) => {
            return prev.then(() => {
                console.log('pageIndex', pageIndex);
                let pageUrl;
                if (pageIndex === 0) {
                    pageUrl = baseUrl;
                } else {
                    pageUrl = `${baseUrl}page${pageIndex}` ;
                }
                return getPostList(pageUrl);
            });
        }, Promise.resolve());
           
    });

}

start(baseUrl);

