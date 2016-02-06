'use strict';

var express = require('express');
var path = require('path');
var http = require('http');
var sio = require('socket.io');

var app = express();
var port = process.env.PORT || 8080;
var root = path.resolve(__dirname);

var myApp = require('./app/app');
var myRoutes = require('./app/routes');


app.use(express.static(path.join(root, 'public')));

// app.get('/', function(req, res) {
//     res.sendfile(root + '/public/index8.html');
// });
// app.get('*', function(req, res) {
//     res.redirect('/');
// });
myRoutes(app, root);

var server = http.createServer(app).listen(port);
var io = sio.listen(server);

// Reduce the logging output of Socket.IO
io.set('log level', 1);

myApp.init(io);

io.sockets.on('connection', function(socket) {
    // console.log('connection:' + socket.id);
    myApp.onConnection(socket);
});
