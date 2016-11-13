const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://writer:89ufinwb3dh2hu3id@ds055722.mlab.com:55722/bikepost';
const top = 0.01;

MongoClient.connect(url).then(db => {
    const posts = db.collection('posts');
    
    posts.count().then(count => {
        const limit = count * top;
        const commentRatingLimit = Math.round(limit * 0.5);

        const bestRating = posts.aggregate([
            { $sort: {'rating': -1} },
            { $limit: limit },
            { $out: 'best_rating' }
        ]).next();

        const bestFav = posts.aggregate([
            { $sort: {'fav_count': -1} },
            { $limit: limit },
            { $out: 'best_fav' }
        ]).next();

        const bestComment = posts.aggregate([
            { $sort: {'comment_count': -1} },
            { $limit: commentRatingLimit },
            { $out: 'best_comment' }
        ]).next();
        
        return Promise.all([bestRating, bestFav, bestComment]);
    })
    .then(() => {
        db.close();
    });
});