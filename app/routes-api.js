'use strict';

var express = require('express');
var router = express.Router();

var myApp = require('../app/app');

module.exports = router;

// middleware to use for all requests
// router.use(function(req, res, next) {
//     console.log('Something is happening.');
//     next(); // make sure we go to the next routes and don't stop here
// });

router.get('/', function(req, res) {
    var jsonResponse = myApp.getJsonMessage();
    res.json({ message: jsonResponse});
});

router.get('/quiz/:id', function(req, res) {

    var quizId,
        json;

    quizId = req.params.id;
    json = myApp.getQuiz(quizId);
    res.json(json);
});
