const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://writer:89ufinwb3dh2hu3id@ds055722.mlab.com:55722/bikepost';
const top = 0.2;

MongoClient.connect(url).then(db => {
    const posts = db.collection('posts');
    const best = db.collection('best');

    best.drop().then(() => {
        posts.count()
        .then(count => {
            const limit = count * top;

            const bestRating = posts.aggregate([
                { $sort: {'rating': -1} },
                { $limit: limit },
                { $out: 'best' }
            ]).next();

            const bestFav = posts.aggregate([
                { $sort: {'fav_count': -1} },
                { $limit: limit },
                { $out: 'best' }
            ]).next();

            const bestComment = posts.aggregate([
                { $sort: {'comment_count': -1} },
                { $limit: limit },
                { $out: 'best' }
            ]).next();

            return Promise.all([bestRating, bestFav, bestComment]);
        })
        .then((r) => {
            db.close();
        });
    });

});