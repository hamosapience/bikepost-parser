const TelegramBot = require('node-telegram-bot-api');
const MongoClient = require('mongodb').MongoClient;
const _ = require('lodash');

const config = require('./config');

class PostGetter {
    constructor(collection) {
        this.collection = collection;
    }

    getRandomPost() {
        return this.collection.count()
        .then(count => {
            const randomInt = _.random(0, count);

            return this.collection
                .find()
                .skip(randomInt)
                .limit(1)
                .toArray()
        })
        .then(postArray => postArray[0]);
    }
}

function printPost(post) {
    const msg = `
    <b>${post.title}</b>

    <b>Рейтинг: </b><i>${post.rating}</i>
    <b>Fav: </b><i>${post.fav_count}</i>
    <b>Комментариев: </b><i>${post.comment_count}</i>
    <b>Дата: </b><i>${post.rawDate}</i>
    
    ${post.url}
    `;

    return msg;
}

function setBot(postGetter) {
    const bot = new TelegramBot(config.botToken, {
        polling: true
    });

    bot.on('message', function (msg) {
        const fromId = msg.from.id;

        postGetter.getRandomPost().then(post => {
            bot.sendMessage(fromId, printPost(post), {
                parse_mode: 'HTML'
            });
        })
    });
}

MongoClient.connect(config.dbUrl).then(db => {
    const postGetter = new PostGetter(db.collection('posts'));
    setBot(postGetter);
}).catch(err => {
    console.error(err);
});








