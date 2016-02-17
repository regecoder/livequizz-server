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

module.exports.quizIntro = quizIntro;
module.exports.quizPostIntro = quizPostIntro;
module.exports.quizQuestion = quizQuestion;
module.exports.quizResult = quizResult;

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
            data;

        myGame = appGames.getGameByOwnerId(socket.id);
        if (_.isUndefined(myGame) === false) {
            socket.emit('gameOwned', myGame.id);         
            console.log('gameOwned gameId:' + myGame.id);
        } else {
            newGameId = getNewGameId();
            myUser = appUsers.getUser(socket.id);
            myGame = new Game(newGameId, myUser);
            myGame.status = 'waiting';
            myGame.quizEngine = new QuizEngine();
            myGame.addUser(myUser);
            appGames.addGame(myGame);

            data = {
                game: myGame,
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
            data;

        myGame = appGames.getGame(gameId);
        if (_.isUndefined(myGame)) {
            // TODO
            socket.emit('gameNonexistent');         
            console.log('gameNonexistent');
        } else {
            myUser = appUsers.getUser(socket.id);
            myGame.addUser(myUser);
            data = {
                game: myGame,
                user: myUser
            };

            // TODO: Vérifier si l'utilisateur n'est pas déjà dans la room
            socket.join(myGame.id);
            socket.emit('gameJoined', data);
            io.sockets.in(myGame.id).emit('gameUserJoined', data);
            console.log('gameJoined gameId:' + data.game.id + '/user:' + data.user.pseudo + '/players:' + data.game.usersCount);
        }
    }

    function startGame(gameId) {
        console.log('startGame gameId:' + gameId);

        var myGame;

        myGame = appGames.getGame(gameId);
        myGame.forEachUser(initUserGame);
        myGame.status = 'started';

        io.sockets.in(myGame.id).emit('gameStarted', myGame);
        console.log('gameStarted gameId:' + myGame.id);

        startRound(0, gameId);

        function initUserGame(user) {
            user.initGame();
        }
    }

    function startRound(roundIndex, gameId) {

        var myGame;

        myGame = appGames.getGame(gameId);
        myGame.forEachUser(initUserRound);
        myGame.quizEngine.loadQuizList();
        myGame.roundIndex = roundIndex;
        myGame.rounds[roundIndex] = new Round();

        io.sockets.in(myGame.id).emit('roundStarted', myGame);
        console.log('roundStarted gameId:' + myGame.id + '/roundId:' + myGame.roundIndex);

        function initUserRound(user) {
            user.initRound();
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

    // Permet de retirer les méthodes d'un objet = plus léger
    // L'objet récupéré est un clone :
    // Les modifications apportées au clone ne sont pas répercutées sur l'objet original
    function getClone(myObject) {
        return JSON.parse(JSON.stringify(myObject));
    }
}

function quizIntro(gameClone) {
    console.log('quizIntro:' + gameClone.id);
    io.sockets.in(gameClone.id).emit('quizIntroStarted', gameClone);
}

// Remplit le rôle de delay
// Permet au client de charger l'écran des questions au déclenchement de l'événement quizIntroTEComplete
// Sinon, l'événement quizQuestionStarted de la 1ere question n'est pas interceptée par le client
function quizPostIntro(gameClone) {
    console.log('quizPostIntro:' + gameClone.id);
}

function quizQuestion(gameClone, questionIndex) {
    console.log('quizQuestion:' + gameClone.id + '/' + questionIndex);

    var data = {
        gameClone: gameClone,
        questionIndex: questionIndex
    };
    io.sockets.in(gameClone.id).emit('quizQuestionStarted', data);
}

function quizResult(gameClone, questionIndex) {
    console.log('quizResult:' + gameClone.id + '/' + questionIndex);

    var data = {
        gameClone: gameClone,
        questionIndex: questionIndex
    };
    io.sockets.in(gameClone.id).emit('quizResultStarted', data);
}
