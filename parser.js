const cheerio = require('cheerio');
const _ = require('lodash');
const got = require('got');
var phantom = require('phantom');

const baseUrl = 'http://bikepost.ru/blog/wsbk/';

const authHeaders = {
    'Cookie': 'PHPSESSID=f229352dea1ef32f3e289a1bbf17bb29; _ym_uid=1475419381945779301; _ym_isad=2; image_id=2; __utma=99723405.572694598.1475419381.1475419381.1475442653.2; __utmb=99723405.2.10.1475442656; __utmc=99723405; __utmz=99723405.1475419382.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none)',
    'Host': 'bikepost.ru',
    'Origin': 'http://bikepost.ru',
    'Proxy-Authorization': 'Basic QFRLLTkzNmYzNDJkLTc0ZGUtNGY4Zi1iOTE4LTBjMjIzYWMzM2VjNDpAVEstOTM2ZjM0MmQtNzRkZS00ZjhmLWI5MTgtMGMyMjNhYzMzZWM0',
    'Proxy-Connection': 'keep-alive',
    'Referer': 'http://bikepost.ru/',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36',
};

const votePostHeaders = {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'en,en-US;q=0.8,ru;q=0.6,uk;q=0.4,tr;q=0.2',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',    
    'X-Requested-With': 'XMLHttpRequest'
};

function asyncDo(actions) {
    let results = [];

    console.log('asyncDo', actions);

    return actions.reduce((prev, action) => {
        return prev.then(prevResult => {
            results.push(prevResult);
            return action();
        });
    }, Promise.resolve())
        .then(last => results.slice(1).concat(last));
}

let ok = false;

let phInstance;
let pageInstance = phantom.create()
    .then(instance => {
        phInstance = instance;
        return instance.createPage();
    });

function getPostList(pageUrl) {
    let sitepage;

    return pageInstance.then(page => {
            console.log('phantom open:', pageUrl);
            sitepage = page;
            return page.open(pageUrl, {
                headers: authHeaders
            });
        })
        .then(status => sitepage.property('content'))
        .then(content => {

            const $ = cheerio.load(content);
            const sessionId = getSessionId($('head').html());

            const topicGetters = $('.topic').map((i, elem) => {
                const $elem = $(elem);

                const $link = $elem.find('.title-topic');
                const $username = $elem.find(".username a");
                const postId = $elem.html().match(/vote_area_topic_(\d+)/)[1];
                const favCount = parseInt($elem.find('.favourite-count').text()) || 0;

                const ratingContent = $elem.find('.voting .total').text().trim();

                let ratingGetter = null;

                if (ratingContent !== '?') {
                    let ratingValue = parseInt(ratingContent.match(/([+-]\d+)/)[1]);
                    ratingGetter = Promise.resolve(ratingValue);
                } else {
                    ratingGetter = getPostRating(sessionId, postId);
                }

                console.log('ratingGetter', ratingGetter);

                return (() => {
                    return ratingGetter.then(rating => {
                        return {
                            id: postId,
                            title: $link.text(),
                            url: $link.attr('href'),
                            author: $username.text(),
                            author_link: $username.attr('href'),
                            fav_count: favCount,
                            rating: rating
                        };
                    });
                });
            }).toArray();

            return asyncDo(topicGetters);

            sitepage.close();
            phInstance.exit();
        })
        .then(topics => {
            console.log(topics);
        })
        .catch(error => {
            console.log(error);
            phInstance.exit();
        }); 

}

function getPostRating(sessionId, postId) {
    console.log('getPostRating', postId);
    return Promise.resolve();
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

        const result = asyncDo(_.range(1, 2).map(pageIndex => {
            return () => {
                const pageUrl = `${baseUrl}page${pageIndex}` ;
                return getPostList(pageUrl);
            }
        }));           
    });

}

start(baseUrl);

