const cheerio = require('cheerio');
const _ = require('lodash');
const got = require('got');
const phantomjs = require('phantomjs-prebuilt')

const baseUrl = 'http://bikepost.ru/blog/wsbk/';

const authHeaders = {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'en,en-US;q=0.8,ru;q=0.6,uk;q=0.4,tr;q=0.2',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Cookie': 'PHPSESSID=f229352dea1ef32f3e289a1bbf17bb29; _ym_uid=1475419381945779301; _ym_isad=2; image_id=2; __utma=99723405.572694598.1475419381.1475419381.1475442653.2; __utmb=99723405.2.10.1475442656; __utmc=99723405; __utmz=99723405.1475419382.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)',
    'Host': 'bikepost.ru',
    'Origin': 'http://bikepost.ru',
    'Proxy-Authorization': 'Basic QFRLLTkzNmYzNDJkLTc0ZGUtNGY4Zi1iOTE4LTBjMjIzYWMzM2VjNDpAVEstOTM2ZjM0MmQtNzRkZS00ZjhmLWI5MTgtMGMyMjNhYzMzZWM0',
    'Proxy-Connection': 'keep-alive',
    'Referer': 'http://bikepost.ru/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
};

let ok = false;

function getPostList(pageUrl) {
    console.log('getPostList', pageUrl);
    return got(pageUrl, {
        headers: authHeaders
    }).then(response => {
        const $ = cheerio.load(response.body);
        const sessionId = getSessionId($('head').html());

        console.log('sessionId', sessionId);

        if (!ok) {
            ok = true;

            got.post('http://bikepost.ru/ajax/vote/topic/', {
                body: JSON.stringify({
                    value: 1,
                    idTopic: 68155,
                    security_ls_key: sessionId
                }),
                headers: authHeaders,
                json: true
            }).then(response => {
                console.log('response');
                console.log(response.body);
            });
        }
        
        const topics = $('.topic').map((i, elem) => {
            const $elem = $(elem);
            const $link = $elem.find('.title-topic');
            const $username = $elem.find(".username a");
            return {
                id: $elem.html().match(/vote_area_topic_(\d+)/)[1],
                title: $link.text(),
                url: $link.attr('href'),
                author: $username.text(),
                author_link: $username.attr('href'),
                fav_count: parseInt($elem.find('.favourite-count').text()) || 0,
                rating: $elem.find('.voting .total').text() || null
            };
        }).toArray();

        // console.log(topics);
    });

}

function getPostRating(pageContent, sessionId, postId) {

}

function getSessionId(headContent) {
    return headContent.match(/LIVESTREET_SECURITY_KEY\s+=\s'(\w+)'/)[1];
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

        _.range(1, 2).reduce((prev, pageIndex) => {
            return prev.then(() => {
                const pageUrl = `${baseUrl}page${pageIndex}` ;
                return getPostList(pageUrl);
            });
        }, Promise.resolve());
           
    });

}

start(baseUrl);

