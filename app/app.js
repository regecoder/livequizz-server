'use strict';

var _ = require('../lib/underscore/underscore-min');

var User = require('./user');
var Users= require('./users');
var Game = require('./game');
var Round = require('./round');
var Games = require('./games');
var Timer = require('./timer');
var TimeEngine = require('./time-engine');
var QuizEngine = require('./quiz-engine');

var timeEngineScenario = require('../config/time-engine-scenario.json');

var io;

var appUsers,
    appGames;

var appThis = this;

module.exports.initApp = initApp;
module.exports.initUser = initUser;

module.exports.quizBeginning = quizBeginning;
module.exports.quizPostBeginning = quizPostBeginning;
module.exports.quizQuestion = quizQuestion;
module.exports.quizResult = quizResult;
module.exports.quizEnd = quizEnd;

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
        // Pas utilisé
        // socket.on('findGame', findGame);
        socket.on('joinGame', joinGame);
        socket.on('startGame', startGame);
        socket.on('voteTheme', voteTheme);
        socket.on('quitGame', quitGame);
        socket.on('continueGame', continueGame);
        socket.on('autostartRound', autostartRound);
    }   
 
    function userLogin(data) {
        console.log('userLogin:' + socket.id);

        var myUser; 

        // TODO
        if (appUsers.userPseudoIsAvailable(data.userPseudo) === false) {
            socket.emit('userPseudoNotAvailable');
        } else {
            myUser = new User(socket.id, data.userPseudo);
            appUsers.addUser(myUser);
            socket.emit('userLogged');
            console.log('userLogged:' + myUser.pseudo);
        }
    }

    function createGame() {
        console.log('createGame');

        var newGameId,
            myGame,
            myUser,
            nextRoundIndex,
            data;

        myGame = appGames.getGameByOwnerId(socket.id);
        if (_.isUndefined(myGame) === false) {
            socket.emit('gameOwned', myGame.id);         
            console.log('gameOwned gameId:' + myGame.id);
        } else {
            newGameId = getNewGameId();
            myUser = appUsers.getUser(socket.id);
            myGame = new Game(newGameId, myUser, new QuizEngine());
            myGame.addUser(myUser);
            myUser.initGame();
            
            myGame.status = 'waiting';
            myGame.roundIndex = -1;

            nextRoundIndex = myGame.roundIndex + 1;
            myGame.createRound(nextRoundIndex, new Round());
            myGame.addUserToRound(nextRoundIndex, myUser);
            myUser.initRound(nextRoundIndex);

            appGames.addGame(myGame);

            data = {
                game: myGame,
                roundIndex: nextRoundIndex,
                user: myUser
            };
            socket.join(myGame.id);
            socket.emit('gameCreated', data);         
            console.log('gameCreated gameId:' + data.game.id + '/user:' + data.user.pseudo);
        }        

        function getNewGameId() {

            var newGameId;

            newGameId = (Math.random() * 10000).toString();
            newGameId = Array(5).join('0') + newGameId;
            newGameId = newGameId.slice(-4);

            return newGameId;
        }

    }

    // function findGame() {
    //     console.log('findGame socketId:' + socket.id);
    //     socket.emit('');
    // }

    function joinGame(gameId) {
        console.log('joinGame gameId:' + gameId);

        var myGame,
            myUser,
            nextRoundIndex,
            data;

        myGame = appGames.getGame(gameId);
        if (_.isUndefined(myGame) === true) {
            // TODO
            socket.emit('gameNonexistent');         
            console.log('gameNonexistent');
        } else {
            myUser = appUsers.getUser(socket.id);
            myGame.addUser(myUser);
            myUser.initGame();

            nextRoundIndex = myGame.roundIndex + 1;
            myGame.addUserToRound(nextRoundIndex, myUser);
            myUser.initRound(nextRoundIndex);

            data = {
                game: myGame,
                roundIndex: nextRoundIndex,
                user: myUser
            };
            // TODO: Vérifier si l'utilisateur n'est pas déjà dans la partie
            socket.join(myGame.id);
            socket.emit('gameJoined', data);
            io.sockets.in(myGame.id).emit('gameUserJoined', data);
            console.log('gameJoined gameId:' + data.game.id + '/user:' + data.user.pseudo + '/players:' + data.game.usersCount);
        }
    }

    function startGame(gameId) {

        var myGame;

        myGame = appGames.getGame(gameId);
        myGame.status = 'started';

        io.sockets.in(myGame.id).emit('gameStarted', myGame);
        console.log('gameStarted gameId:' + myGame.id);

        startRound(gameId, 0);
    }

    function startRound(gameId, roundIndex) {

        var myGame;

        myGame = appGames.getGame(gameId);
        myGame.quizEngine.loadQuizList();
        myGame.roundIndex = roundIndex;

        io.sockets.in(myGame.id).emit('roundStarted', myGame);
        console.log('roundStarted gameId:' + myGame.id + '/roundId:' + myGame.roundIndex);
    }

    function autostartRound(data) {

        var gameId = data.game.id;
        var roundIndex = data.roundIndex;

        var myTimer = new Timer(5000, 'countdown', timerOnComplete, timerOnTick);
        myTimer.start();

        function timerOnComplete() {
            startRound(gameId, roundIndex);
        }

        function timerOnTick(totalTime, currentTime) {
            var data = {
                currentTime: currentTime,
                totalTime: totalTime
            };
            io.sockets.in(gameId).emit('autostartRoundTick', data);
        }
    }

    function voteTheme(data) {

        var myGame,
            myRound;

        myGame = appGames.getGame(data.gameId);
        myRound = myGame.rounds[myGame.roundIndex];
        myRound.addThemeVote(data.themeIndex);

        io.sockets.in(myGame.id).emit('themeVoted', myRound);
        console.log('themeVoted gameId:' + myGame.id + '/roundId:' + myGame.roundIndex + '/themeIndex:' + data.themeIndex);

        if (areAllUsersVoted() === true) {
            startQuiz(myGame.id);
        }

        function areAllUsersVoted() {

            var votesCount = myRound.getThemeVotesCount();
            var playersCount = myGame.usersCount;

            return (votesCount === playersCount);
        }         
    }

    function startQuiz(gameId) {

        var myGame,
            myGameClone,
            myRound,
            themeIndex,
            timeEngine,
            quizScenario;

        myGame = appGames.getGame(gameId);
        myRound = myGame.rounds[myGame.roundIndex];

        themeIndex = myRound.getWinnerThemeIndex();
        myRound.quiz = myGame.quizEngine.quizList[themeIndex];

        myGameClone = getClone(myGame);
        quizScenario = getQuizScenario(timeEngineScenario, myRound.quiz.questions.length);

        io.sockets.in(myGame.id).emit('quizStarted');
        console.log('quizStarted gameId:' + myGame.id);

        timeEngine = new TimeEngine(myGameClone, quizScenario, Timer, appThis, io, _);
        timeEngine.start();

        function getQuizScenario(scenario, loop) {
            var quizScenario;
            quizScenario = JSON.stringify(scenario).replace(/#/g, loop);
            quizScenario = JSON.parse(quizScenario);
            return quizScenario;
        }
    }

    function quitGame(gameId) {

        var myGame,
            myUser,
            nextRoundIndex,
            data;

        myGame = appGames.getGame(gameId);
        myUser = appUsers.getUser(socket.id);
        myGame.removeUser(myUser.socketId);
        appUsers.removeUser(myUser.socketId);

        nextRoundIndex = myGame.roundIndex + 1;
        myGame.rounds[nextRoundIndex].usersWaited --;
        
        data = {
            game: myGame,
            roundIndex: nextRoundIndex,
            user: myUser
        };

        socket.emit('gameQuit');
        io.sockets.in(myGame.id).emit('gameUserQuit', data);
        console.log('gameQuit gameId:' + gameId + '/user:' + myUser.pseudo);
    }

    function continueGame(gameId) {

        var myGame,
            myUser,
            nextRoundIndex,
            data;

        myGame = appGames.getGame(gameId);
        myUser = appUsers.getUser(socket.id);

        nextRoundIndex = myGame.roundIndex + 1;
        myGame.addUserToRound(nextRoundIndex, myUser);
        myUser.initRound(nextRoundIndex);

        data = {
            game: myGame,
            roundIndex: nextRoundIndex,
            user: myUser
        };

        socket.emit('gameContinued', data);
        io.sockets.in(myGame.id).emit('gameUserJoined', data);
        console.log('gameContinued gameId:' + gameId + '/user:' + myUser.pseudo);
    }

    // Permet de retirer les méthodes d'un objet = plus léger
    // L'objet récupéré est un clone :
    // Les modifications apportées au clone ne sont pas répercutées sur l'objet original
    function getClone(myObject) {
        return JSON.parse(JSON.stringify(myObject));
    }
}

function quizBeginning(gameClone) {
    console.log('quizBeginning:' + gameClone.id);
    io.sockets.in(gameClone.id).emit('quizBeginning', gameClone);
}

// Remplit le rôle de delay
// Permet au client de charger l'écran des questions au déclenchement de l'événement quizIntroTEComplete
// Sinon, l'événement quizQuestionStarted de la 1ere question n'est pas interceptée par le client
function quizPostBeginning(gameClone) {
    console.log('quizPostBeginning:' + gameClone.id);
}

function quizQuestion(gameClone, questionIndex) {
    console.log('quizQuestion:' + gameClone.id + '/' + questionIndex);

    var data = {
        gameClone: gameClone,
        questionIndex: questionIndex
    };
    io.sockets.in(gameClone.id).emit('quizQuestion', data);
}

function quizResult(gameClone, questionIndex) {
    console.log('quizResult:' + gameClone.id + '/' + questionIndex);

    var data = {
        gameClone: gameClone,
        questionIndex: questionIndex
    };
    io.sockets.in(gameClone.id).emit('quizResult', data);
}

function quizEnd(gameClone) {
    console.log('quizEnd:' + gameClone.id);

    var myGame,
        nextRoundIndex;

    myGame = appGames.getGame(gameClone.id);
    myGame.status = 'waiting';

    nextRoundIndex = myGame.roundIndex + 1;
    myGame.createRound(nextRoundIndex, new Round());
    myGame.rounds[nextRoundIndex].usersWaited = myGame.rounds[myGame.roundIndex].usersCount;


    io.sockets.in(gameClone.id).emit('quizEnd', gameClone);
}
