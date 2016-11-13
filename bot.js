const TelegramBot = require('node-telegram-bot-api');
const MongoClient = require('mongodb').MongoClient;
const _ = require('lodash');

const config = require('./config');

class PostGetter {
    constructor(db) {
        this.db = db;
        this.posts = db.collection('posts');
        this.best = db.collection('best');
    }

    _getRandomPost(collection, filter = {}) {
        return collection.find(filter).count()
        .then(count => {
            const randomInt = _.random(0, count);

            return collection
                .find(filter)
                .skip(randomInt)
                .limit(1)
                .toArray()
        })
        .then(postArray => postArray[0]);
    }

    getRandomGoodPost() {

    }

    getRandomGood(source) {
        return this._getRandomPost(this.db.collection(source));
    }

    getBestList(param, offset) {
    }

    getRandomFromBlog(blog, good = true) {
        return this._getRandomPost((good ? this.posts : this.posts), {blog});
    }
}

class Bot {
    constructor(postGetter) {

        this.postGetter = postGetter;
        this.bot = new TelegramBot(config.botToken, {
            polling: true
        });

        this.commands = {
            '/travel': () => postGetter.getRandomFromBlog('travel'),
            '/top_rated': () => postGetter.getRandomGood('best_rating'),
            '/top_faved': () => postGetter.getRandomGood('best_fav'),
            '/top_commented': () => postGetter.getRandomGood('best_comment'),
        };

        this.bot.on('message', msg => this.messageHandler(msg));
    }

    messageHandler(msg) {
        console.log(msg);    

        const fromId = msg.from.id;
        const text = msg.text;

        const handlerKey = Object.keys(this.commands).find(command => text.match(command));
        const postSender = (post) => this.sendPost(fromId, post);

        if (handlerKey) {
            this.commands[handlerKey]().then(postSender);
        } else {
            this.sendDefaultMessage(fromId);
        }
    }

    getPostBlog(url) {
        return url.split('/')[4];
    }

    printPost(post) {
        const msg = `
        <b>${post.title}</b>

        <b>Рейтинг: </b><i>${post.rating}</i>
        <b>Fav: </b><i>${post.fav_count}</i>
        <b>Комментариев: </b><i>${post.comment_count}</i>
        <b>Дата: </b><i>${post.date || '–'}</i>
        <b>Автор: </b><i>${post.author}</i>

        ${post.url}
        `;

        return msg;
    }

    sendPost(target, post) {
        this.bot.sendMessage(target, this.printPost(post), {
            parse_mode: 'HTML'
        });
    }

    sendDefaultMessage(target) {
        this.bot.sendMessage(target, '?', {
            reply_markup: JSON.stringify({
                keyboard: [
                    ['/top_rated', '/top_faved', '/top_commented'],
                    ['/travel']
                ]
            })
        });
    }
}

MongoClient.connect(config.dbUrl).then(db => {
    const postGetter = new PostGetter(db);
    const bot = new Bot(postGetter);
}).catch(err => {
    console.error(err);
});








