var io;
var gameSocket;

var scenario = [
    {
        action: 'quizzStart',
        tempo: 10
    },
    {
        action: 'questionStart',
        tempo: 10
    },
    {
        action: 'questionPreview',
        tempo: 2
    },
    {
        action: 'responseStart',
        tempo: 4
    }
];

var QuizEngine = function(quiz, scenario) {

    this.quiz = quiz;
    this.scenario = scenario;

    var start = function() {
        console.log('quizzEngine start');
    };

    this.start = start;
};


    // newGame: {
    //     name: 'newGame',
    //     duration: 10
    // },
    // roundPreview: {
    //     name: 'roundPreview',
    //     duration: 2
    // }

var quiz = [];

(function() {[]
    var quizItem;
    var str;
    var i;

    for (i = 0; i < 10; i++) {
        str = 'Q' + i;
        quizItem = {
            question: {
                text: str,
                answer: [
                    {
                        id: 1,
                        text: "1"
                    },
                    {
                        id: 2,
                        text: "2"
                    },
                    {
                        id: 3,
                        text: "3"
                    },
                    {
                        id: 4,
                        text: "4"
                    }
                ],
                goodAnswer: 1
            },
            response: {
                text: str
            }
        };
        quiz.push(quizItem);
    };

})();

var chrono = {
     timeLeft: 0,
     timer: undefined,
     gameId: undefined,
     data: undefined,
     callback: undefined,
     chronoConfigItem: undefined,
     isStarting: false,

     start: function (gameId, chronoConfigItem, callback) {
        if (this.isStarting) {
            return;
        }
        console.log("start:" + chronoConfigItem.duration + '/' + chronoConfigItem.name);
        this.gameId = gameId
        this.callback = callback;
        this.chronoConfigItem = chronoConfigItem;
         //Initialisation du nombre de secondes selon la valeur passée en paramètre
         this.timeLeft = chronoConfigItem.duration;
         this.data = {
            timeLeft: this.timeLeft,
            duration: this.chronoConfigItem.duration
         }
         //Démarrage du chrono
         console.log('setInterval' + this.timeLeft);
         this.timer = setInterval(this.tick.bind(this), 1000);
         this.isStarting = true;

        io.sockets.in(this.gameId).emit(this.chronoConfigItem.name + 'CountdownStarted', this.data);
     },

     tick: function () {
         console.log('tick:' + this.timeLeft);
         --this.timeLeft;
            if (this.timeLeft === 0) {
                this.stop();
            } else {
                 this.data.timeLeft = this.timeLeft;
                 //On actualise la valeur affichée du nombre de secondes
                io.sockets.in(this.gameId).emit(this.chronoConfigItem.name + 'CountdownTick', this.data);
            }
     },

     stop: function () {
         console.log('stop chrono:' + this.timeLeft);
         //quand le temps est écoulé, on arrête le timer
        clearInterval(this.timer);
        this.isStarting = false;
         //Et on appelle la fonction qui gère la fin du temps imparti et poursuit le traitement
         //Ici, pour le test, simplement une fonction alert
        if (this.callback && typeof(this.callback) === 'function') {
            this.callback();
        }
        io.sockets.in(this.gameId).emit(this.chronoConfigItem + 'CountdownCompleted');
     }
 };



/**
 * This function is called by index.js to initialize a new game instance.
 *
 * @param sio The Socket.IO library
 * @param socket The socket object for the connected client.
 */
exports.initGame = function(sio, socket){
    io = sio;
    gameSocket = socket;
    gameSocket.emit('connected', { message: "You are connected!" });

    // Host Events
    gameSocket.on('openRoomRequested', openNewRoom);
    gameSocket.on('startQuizRequested', startQuiz);
    // gameSocket.on('hostNewGameRequestCountdown', hostManageNewGameCountdown);
    gameSocket.on('hostNextRound', hostNextRound);

    // Player Events
    gameSocket.on('playerJoinGame', playerJoinGame);
    gameSocket.on('playerAnswer', playerAnswer);
    gameSocket.on('playerRestart', playerRestart);
}


/* *******************************
   *                             *
   *       HOST FUNCTIONS        *
   *                             *
   ******************************* */

/**
 * Open an new room
 */
function openNewRoom() {
    // Create a unique Socket.IO Room
    var thisGameId = ( Math.random() * 100000 ) | 0;

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    this.emit('newRoomOpened', {gameId: thisGameId, mySocketId: this.id});

    // Join the Room and wait for the players
    this.join(thisGameId.toString());
};

/*
 * Start quiz
 * @param gameId
 */
function startQuiz(gameId) {
    console.log('startQuiz' + gameId);

    // Start the quiz
    var sock = this;
    var data = {
        mySocketId : sock.id,
        gameId : gameId
    };

    var quizEngine = new QuizEngine(quiz, scenario);
    quizEngine.start();

    io.sockets.in(data.gameId).emit('newQuizStarted', data);
}

/*
 * The Countdown has finished, and the game begins!
 * @param gameId The game ID / room ID
 */
function hostStartGame(gameId) {
    console.log('Game Started:' + gameId);
    startNewRound(0, gameId);
};



function hostRoundPreviewCompleted(gameId) {
    io.sockets.in(gameId).emit('roundPreviewCompleted', gameId);
}

function hostManageNewGameCountdown(gameId) {

    var callback = startQuiz.bind(null, gameId);
    chrono.start(gameId, chronoConfig.newGame, callback);
}

function hostManageRoundPreviewCountdown(gameId) {

    var callback = hostRoundPreviewCompleted.bind(null, gameId);
    chrono.start(gameId, chronoConfig.roundPreview, callback);
}

/**
 * A player answered correctly. Time for the next word.
 * @param data Sent from the client. Contains the current round and gameId (room)
 */
function hostNextRound(data) {
    if(data.roundIndex < quiz.length ){
        // Send a new set of words back to the host and players.
        startNewRound(data.roundIndex, data.gameId);
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
 * Attempt to connect them to the room that matches
 * the gameId entered by the player.
 * @param data Contains data entered via player's input - playerName and gameId.
 */
function playerJoinGame(data) {

    // A reference to the player's Socket.IO socket object
    var sock = this;
    console.log('Player ' + data.playerName + ' joining game: ' + data.gameId + ' with socketId: ' + sock.id );

    // Look up the room ID in the Socket.IO manager object.
    var room = gameSocket.manager.rooms["/" + data.gameId];

    // If the room exists...
    if( room != undefined ){
        // attach the socket id to the data object.
        data.mySocketId = sock.id;

        // Join the room
        sock.join(data.gameId);

        //console.log('Player ' + data.playerName + ' joining game: ' + data.gameId );

        // Emit an event notifying the clients that the player has joined the room.
        io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

    } else {
        // Otherwise, send an error message back to the player.
        this.emit('error',{message: "This room does not exist."} );
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

    // Emit the player's data back to the clients in the game room.
    data.playerId = this.id;
    io.sockets.in(data.gameId).emit('playerJoinedRoom',data);
}

/* *************************
   *
   *                          *
   *      GAME LOGIC       *
   *                       *
   ************************* */

/**
 * Get a word for the host, and a list of words for the player.
 *
 * @param wordPoolIndex
 * @param gameId The room identifier
 */
function startNewRound(roundIndex, gameId) {
    var data = getRoundData(roundIndex);

    // hostManageRoundPreviewCountdown(gameId);
    io.sockets.in(gameId).emit('startNewRound', data);
}

/**
 * This function does all the work of getting a new words from the pile
 * and organizing the data to be sent back to the clients.
 *
 * @param i The index of the wordPool.
 * @returns {{round: *, word: *, answer: *, list: Array}}
 */
function getRoundData(roundIndex){
    var roundData;
    var roundTotal;

    roundTotal = quiz.length;

    var roundData = {
        roundIndex: roundIndex,
        roundTotal: roundTotal,
        quizItem: quiz[roundIndex]
    };

    return roundData;
}
