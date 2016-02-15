'use strict';

var express = require('express');
var router = express.Router();
var path = require('path');

var root = path.join(path.resolve(__dirname), '../public');

module.exports = router;

router.get('/', function(req, res) {
    res.sendFile('index.html', {root: root});
});

router.get('*', function(req, res) {
    res.redirect('/');
});
