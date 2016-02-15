'use strict';

var express = require('express'),
    path = require('path'),
    http = require('http'),
    cors = require('cors'),
    sio = require('socket.io'),
    bodyParser = require('body-parser');

var app = express();

var port = process.env.PORT || 8080;
var root = path.resolve(__dirname);

var myApp = require('./app/app');

var myWebRoutes = require('./app/routes-web');
var myApiRoutes = require('./app/routes-api');

app.use(cors());

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.use(express.static(path.join(root, 'public')));
// app.use('/assets', express.static(path.join(root, 'public/assets')));

// Routes
app.use('/api', myApiRoutes);
app.use('/', myWebRoutes);

var server = http.createServer(app).listen(port);

server.listen(port, function() {
    console.info('server started on port ' + port);
});

var io = sio.listen(server);

myApp.initApp(io);

io.sockets.on('connection', myApp.initUser);
