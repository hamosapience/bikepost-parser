const cheerio = require('cheerio');
const _ = require('lodash');
const got = require('got');

const baseUrl = 'http://bikepost.ru/new/';

const authHeaders = {
    'Cookie': '_ym_uid=1475884668437410294; PHPSESSID=06a17d27be6b1ed0406a71d6fdf921df; _ym_isad=2; __utmt=1; __utma=99723405.1180717811.1475884668.1475967760.1478298721.7; __utmb=99723405.1.10.1478298722; __utmc=99723405; __utmz=99723405.1475884670.1.1.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); key=d39b03099d5f873924b66595c4ddfa6b; image_id=2',
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

    return actions.reduce((prev, action) => {
        return prev.then(prevResult => {
            results.push(prevResult);
            return action();
        });
    }, Promise.resolve())
        .then(last => results.slice(1).concat(last));
}

function getPostList(pageUrl) {
    console.error('page url:', pageUrl);
    const pageRequestTime = Date.now();

    return got(pageUrl, {
        headers: authHeaders
    })
    .then(response => {
        return response.body;
    })
    .then(content => {

        const $ = cheerio.load(content);
        const sessionId = getSessionId($('head').html());

        const topicGetters = $('.topic').map((i, elem) => {
            const $elem = $(elem);
            const $link = $elem.find('.title-topic');

            if (!$link.text()) {
                return () => Promise.resolve({});
            }

            const $username = $elem.find(".username a");
            const postId = $elem.html().match(/vote_area_topic_(\d+)/)[1];
            const favCount = parseInt($elem.find('.favourite-count').text()) || 0;
            const commentCount = parseInt($elem.find('.comments-link span').text()) || 0;
            const rawDate = $elem.find('.panel').eq(2).text() || '';

            const ratingContent = $elem.find('.voting .total').text().trim();

            let ratingGetter = null;

            if (ratingContent !== '?') {
                let ratingValue = parseInt(ratingContent.match(/([+-]\d+)/)[1]);
                ratingGetter = () => Promise.resolve(ratingValue);
            } else {
                ratingGetter = () => getPostRating(sessionId, postId);
            }

            return (() => {
                return ratingGetter().then(rating => {
                    return {
                        id: postId,
                        title: $link.text(),
                        url: $link.attr('href'),
                        author: $username.text(),
                        author_link: $username.attr('href'),
                        fav_count: favCount,
                        rating: rating,
                        comment_count: commentCount,
                        rawDate: rawDate,
                        pageRequestTime: pageRequestTime
                    };
                });
            });
        }).toArray();

        return asyncDo(topicGetters);
    })
    .then(topics => {
        return topics;
    })
    .catch(e => {
        console.error(e);
    });
}

function getPostRating(sessionId, postId) {
    return got('http://bikepost.ru/ajax/vote/topic/', {
        body: {
            value: 1,
            idTopic: postId,
            security_ls_key: sessionId
        },
        headers: authHeaders
    }).then(response => {
        try {
            return JSON.parse(response.body).iRating;
        } catch (e) {
            console.error('error getting rating:', e);
            return null;
        }
    }).then(rating => {
        return new Promise(resolve => {
            setTimeout(() => resolve(rating), 100);
        });
    });
}

function getSessionId(headContent) {
    return headContent.match(/LIVESTREET_SECURITY_KEY\s+=\s'(\w+)'/)[1];
}

function getPageCount(url) {
    return got(url).then(response => {
        const $ = cheerio.load(response.body);
        return parseInt($(".pagination ul li").last().find("a").text());
    });
}

function start(baseUrl) {
    getPageCount(baseUrl).then(pageCount => {
        console.error('pageCount:', pageCount);
        const result = asyncDo(_.range(1, pageCount).map(pageIndex => {
            return () => {
                const pageUrl = `${baseUrl}page${pageIndex}` ;
                return getPostList(pageUrl);
            }
        })).then(data => {
            console.log(JSON.stringify(_.flatten(data), null, 2));
        });
    });
}

start(baseUrl);

