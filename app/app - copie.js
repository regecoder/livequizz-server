'use strict';

var _ = require('../lib/underscore/underscore-min');

var User   = require('./user');
var Users  = require('./users');
var Player = require('./player');
var Game   = require('./game');
var Games  = require('./games');
var Timer  = require('./timer');
var TimeEngine = require('./time-engine');

var scenario = require('../data/scenario.json');

var io;

var appUsers,
    appGames;

var appThis = this;

module.exports.initApp = initApp;
module.exports.initUser = initUser;














module.exports.getQuiz = getQuiz;









function getQuiz(quizId) {

    var json;

    json = require('../data/quiz-' + quizId + '.json');

    return json;
}


function initApp(ioInstance) {

    io = ioInstance;

    appUsers = new Users();
    appGames = new Games();
}

function initUser(socket) {
    console.log('initUser: ' + socket.id);

    bindEvents();

    function bindEvents() {
           
        socket.on('userLogin', userLogin);
        socket.on('createGame', createGame);



        
    }   
 

    // var myUser;

    // myUser = new User(socket.id);
    // appUsers. 




    // appUsers.addUser(myUser);

    function userLogin(data) {
        console.log('userLogin: ' + data.userPseudo + '/' + socket.id);

        var myUser; 

        if (appUsers.userPseudoIsAvailable(data.userPseudo) === true) {
            myUser = new User(socket.id, data.userPseudo);
            appUsers.addUser(myUser);
            socket.emit('userLogged');
        } else {
            // TODO
            socket.emit('userPseudoNotAvailable');
        }
    }

    function createGame() {

        console.log('createGame socketId:' + socket.id);

        var myUser;
        var myGame;
        var myPlayer;

        // Create a unique Socket.IO Game
        gameId = (Math.random() * 10000).toString();

        // Join the Game and wait for the players

        io.sockets.socket(socketId).join(gameId);

        myGame = new Game(gameId);
        myPlayer = new Player(socket.id);
        myGame.masterId = myPlayer.socketId;
        myGame.addPlayer(myPlayer);
        appGames.addGame(myGame);

        myUser = appUsers.getUser(socket.id);
        myUser.addNearGame(myGame.id, 0);

        io.sockets.socket(socketId).emit('gameCreated', gameId);

    }

    // socket.on('userLogin', function(data){
    //     console.log('userLogin: ' + data.userPseudo + '/' + socket.id);
    //     socket.emit('messagereceived');


    // });


    socket.on('userGeoPositionTaken', activateUserGeoPosition);
    socket.on('userPseudoSubmit', function(data) {
        approveUserPseudo(data, socket.id);
    });
    socket.on('createGameRequested', createGame);




    // socket.on('createGameRequested', createGame);
    socket.on('startQuizRequested', startQuizEngine);
    socket.on('hostNextRound', hostNextRound);

    socket.on('playerJoinGame', playerJoinGame);
    socket.on('playerAnswer', playerAnswer);
    socket.on('playerRestart', playerRestart);

    socket.emit('connected');
}

/* *******************************
   *                             *
   *       HOST FUNCTIONS        *
   *                             *
   ******************************* */

function activateUserGeoPosition (userPosition) {
    console.log('activateUserGeoPosition:' + userPosition.latitude + '/' + userPosition.longitude + '/' + userPosition.accuracy);

    var myUser;

    myUser = appUsers.getUser(socket.id);
    myUser.position = userPosition;

    searchUserNearGames(socket.id);
}

function searchUserNearGames(userId) {

    // Distance maximale admise entre la position de l'utilisateur et celle du créateur d'une partie pour considérer cette dernère comme proche de l'utilisateur.
    var maxDistance = 100;

    var myUser;
    var checkIsNearGame;

    myUser = appUsers.getUser(socket.id);

    console.log('gamesCount:' + appGames.count);

    if (appGames.count === 0) {
        return;
    }

    checkIsNearGame = function(myGame) {

        var myMaster;
        var myDistance;
        var clientData;

        myMaster = appUsers.getUser(myGame.masterId);
        if (myMaster.position !== {}) {
            myDistance = distance(myUser.position, myMaster.position);
            // if (myDistance <= maxDistance) {
                myUser.addNearGame(myGame.id, distance);
                console.log('searchUserNearGames:' + myGame.id + '/' + myDistance);
            // }
        }
    };

    appGames.forEach(checkIsNearGame);

    clientData = {
        nearGames: myUser.getNearGames()
    };

    io.sockets.socket(socketId).emit('userNearGamesSearchCompleted', clientData);
}

function approveUserPseudo(data, socketId) {
    console.log('approveUserPseudo:' + socketId);

// var myGame = new Game(124);
// myGame.run(appThis);

    startQuizEngine(125);





    // var timer = new Timer(5000, 5, 'countdown', function(){console.log('complete');}, function(steps, count){console.log(steps + '/' + count);});
    // timer.start();



    // io.sockets.socket(socketId).emit('userPseudoApproved');



    return;

    var clientData;

    myUser = appUsers.getUser(socket.id);
    myUser.pseudo = data.userPseudo;

    console.log('nearGamesCount:' + myUser.nearGamesCount());

    clientData = {
        userPseudo: myUser.pseudo,
        nearGames: myUser.getNearGames()
    };

    io.sockets.socket(socketId).emit('userPseudoApproved', clienData);
}

/**
 * Create a game
 */
// function createGame() {
//     console.log('createGame socketId:' + socket.id);

//     var myUser;
//     var myGame;
//     var myPlayer;

//     // Create a unique Socket.IO Game
//     gameId = ((Math.random() * 100000) | 0).toString();

//     // Join the Game and wait for the players

//     io.sockets.socket(socketId).join(gameId);

//     myGame = new Game(gameId);
//     myPlayer = new Player(socket.id);
//     myGame.masterId = myPlayer.socketId;
//     myGame.addPlayer(myPlayer);
//     appGames.addGame(myGame);

//     myUser = appUsers.getUser(socket.id);
//     myUser.addNearGame(myGame.id, 0);

//     io.sockets.socket(socketId).emit('gameCreated', gameId);
// }

/*
 * Start quiz engine
 * @param gameId
 */
function startQuizEngine(gameId) {

    // var quizFile = '../data/quiz1.json';
    // var quiz = require(quizfile);
    console.log('startQuizEngine gameId:' + gameId);

    var quizEngine;

    quizEngine = new TimeEngine(gameId, scenario, Timer, appThis, io, _);
    quizEngine.start();
}

/*
 * Start quiz
 * @param gameId
 */
module.exports.startQuiz = function(gameId) {
    console.log('startQuiz:' + gameId);
    // appGames[gameId].currentScene = 0;
    io.sockets.in(gameId).emit('quizStarted', gameId);
};

module.exports.startQuestion = function(gameId, sequence) {

    // startScene(gameId, currentScene);

    var data;

    data = {
        gameId: gameId,
        sequence: sequence
    };
    io.sockets.in(gameId).emit('questionStarted', gameId, sequence.sequenceStep);
    console.log('startQuestion:' + gameId + '/' + sequence.sequenceStep);
};

module.exports.startResponse = function(gameId, sequence) {
    console.log('startResponse:' + gameId + '/' + sequence.sequenceStep);

    // startScene(gameId, currentScene);
    io.sockets.in(gameId).emit('responseStarted', gameId, sequence.sequenceStep);
};

/**
 * A player answered correctly. Time for the next word.
 * @param data Sent from the client. Contains the current round and gameId (game)
 */
function hostNextRound(data) {
    if(data.roundIndex < quiz.length ){
        // Send a new set of words back to the host and players.
        startScene(data.gameId, data.roundIndex);
    } else {
        // If the current round exceeds the number of words, send the 'gameOver' event.
        io.sockets.in(data.gameId).emit('gameOver', data);
    }
}
/* *****************************
   *                           *
   *     PLAYER FUNCTIONS      *
   *                           *
   ***************************** */

/**
 * A player clicked the 'START GAME' button.
 * Attempt to connect them to the game that matches
 * the gameId entered by the player.
 * @param data Contains data entered via player's input - playerName and gameId.
 */
function playerJoinGame(data) {
    // console.log('playerJoinGame socketId:' + socket.id);

    // A reference to the player's Socket.IO socket object
    var sock = this;

    // Look up the game ID in the Socket.IO manager object.
    var game = socket.manager.games["/" + data.gameId];

    // If the game exists...
    if( game !== undefined ){
        // attach the socket id to the data object.
        data.mySocketId = sock.id;

        // Join the game
        sock.join(data.gameId);

        //console.log('Player ' + data.playerName + ' joining game: ' + data.gameId );

        // Emit an event notifying the clients that the player has joined the game.
        io.sockets.in(data.gameId).emit('playerJoinedGame', data);

    } else {
        // Otherwise, send an error message back to the player.
        socket.emit('error',{message: "This game does not exist."} );
    }
}

/**
 * A player has tapped a word in the word list.
 * @param data gameId
 */
function playerAnswer(data) {
    // console.log('Player ID: ' + data.playerId + ' answered a question with: ' + data.answer);

    // The player's answer is attached to the data object.  \
    // Emit an event with the answer so it can be checked by the 'Host'
    io.sockets.in(data.gameId).emit('hostCheckAnswer', data);
}

/**
 * The game is over, and a player has clicked a button to restart the game.
 * @param data
 */
function playerRestart(data) {
    // console.log('Player: ' + data.playerName + ' ready for new game.');

    // Emit the player's data back to the clients in the game game.
    data.playerId = this.id;
    io.sockets.in(data.gameId).emit('playerJoinedGame',data);
}

/**
 * Start question
 *
 * @param gameId
 * @param questionIndex
 */
function startScene(gameId, sceneIndex) {
    var sceneCount;
    var data;

    sceneCount = quiz.length;

    data = {
        sceneIndex: sceneIndex,
        sceneCount: sceneCount,
        sceneData: quiz[sceneIndex]
    };

    io.sockets.in(gameId).emit('startNewRound', data);
}
