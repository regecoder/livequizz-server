var io;
var currentSocket;

var dataStore = {
    currentRoomId: null
};

var scenario = [
    {
        name: 'startQuiz',
        action: 'startQuiz',
        tempo: 10
    },
    {
        name: 'startQuestion',
        action: 'startQuestion',
        tempo: 0
    },
    // {
    //     action: 'questionPreview',
    //     tempo: 2
    // },
    // {
    //     action: 'responseStart',
    //     tempo: 4
    // }
];

var QuizEngine = function(roomId, quiz, scenario) {

    this.roomId = roomId;
    this.quiz = quiz;
    this.scenario = scenario;

    //
    // --------------------------------------------------------
    //

    var start = function() {
        console.log('quizEngine start');

        var mySequence;
        var sequenceCount;
        var sequenceIndex;
        var that;
        var startSequence;
        var onTick;
        var onComplete;

        // problème this: à étudier
        // http://www.sitepoint.com/mastering-javascripts-this-keyword/
        sequenceIndex = 0;
        sequenceCount = this.scenario.length
        that = this;

        startSequence = function(sequenceIndex) {
            mySequence = that.scenario[sequenceIndex];
            global[mySequence.action].call(that, that.roomId);
            if (typeof mySequence.tempo === 'undefined' || mySequence.tempo > 0) {
                return;
            } else {
                onTick = function(totalLength, currentLength) {
                    io.sockets.in(that.roomId).emit('timerTick', mySequence.name, totalLength, currentLength);
                };
                sequenceIndex++;
                if (sequenceIndex === sequenceCount - 1) {
                    onComplete = function() {
                        io.sockets.in(that.roomId).emit('timerComplete', mySequence.name);
                    };
                } else {
                    onComplete = function() {
                        io.sockets.in(that.roomId).emit('timerComplete', mySequence.name);
                        startSequence(sequenceIndex);
                    };
                }
                doTimer((mySequence.tempo * 1000), 5, onTick, onComplete, -1);
            }
        };
        startSequence(sequenceIndex);
    };

    //
    // --------------------------------------------------------
    //

    this.start = start;
};

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
     isRunning: false,

     start: function (gameId, chronoConfigItem, callback) {
        if (this.isRunning) {
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
         this.isRunning = true;

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
        this.isRunning = false;
         //Et on appelle la fonction qui gère la fin du temps imparti et poursuit le traitement
         //Ici, pour le test, simplement une fonction alert
        if (this.callback && typeof(this.callback) === 'function') {
            this.callback();
        }
        io.sockets.in(this.gameId).emit(this.chronoConfigItem + 'CountdownCompleted');
     }
 };


// self-adjusting timer
// http://www.sitepoint.com/creating-accurate-timers-in-javascript/
//
// length: durée en ms
// resolution: nombre de pulsations par s
// oninstance: callback sur la pulsation
// oncomplete: callback à la fin
//
// displayBySeconde: 0: non, 1: oui chronomètre, -1 oui compte à rebours

function doTimer(length, resolution, onTick, onComplete, displayBySeconde)
{
    var steps = (length / 100) * (resolution / 10),
        speed = length / steps,
        count = 0,
        countBySeconde = 0,
        lengthBySeconde = length / 1000,
        start = new Date().getTime();

    function instance()
    {
        var diff;

        if (count++ == steps)
        {
            onComplete();
        }
        else
        {
            if (displayBySeconde !== 0) {
                onTick(steps, count);
            } else {
                diff = parseInt((new Date().getTime() - start) / 1000, 10);
                if (diff > countBySeconde) {
                    countBySeconde = diff;
                    if (displayBySeconde === -1) {
                        diff = (lengthBySeconde) - diff;
                    }
                    onTick(lengthBySeconde, diff);
                }
            }

            diff = (new Date().getTime() - start) - (count * speed);
            setTimeout(instance, (speed - diff));
        }
    }

    setTimeout(instance, speed);
}




/**
 * This function is called by index.js to initialize a new server app instance.
 *
 * @param sio The Socket.IO library
 * @param socket The socket object for the connected client.
 */
exports.initServerApp = function(sio, socket){

    io = sio;
    currentSocket = socket;

    currentSocket.emit('connected');

    // Host Events
    currentSocket.on('openRoomRequested', openNewRoom);
    currentSocket.on('startQuizRequested', startQuizEngine);
    // currentSocket.on('hostNewGameRequestCountdown', hostManageNewGameCountdown);
    currentSocket.on('hostNextRound', hostNextRound);

    // Player Events
    currentSocket.on('playerJoinGame', playerJoinGame);
    currentSocket.on('playerAnswer', playerAnswer);
    currentSocket.on('playerRestart', playerRestart);
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

    var newRoomId;
    var mySocketId;
    var data;
    var socketId;

    // Create a unique Socket.IO Room
    newRoomId = ( Math.random() * 100000 ) | 0;
    dataStore.currentRoomId = newRoomId;

    // Join the Room and wait for the players
    this.join(newRoomId.toString());

    socketId = this.id;

    console.log('openNewRoom:' + newRoomId)

    // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
    this.emit('newRoomOpened', newRoomId, socketId);
};

/*
 * Start quiz engine
 * @param roomId
 */
function startQuizEngine(roomId) {
    console.log('startQuizEngine' + roomId);

    var quizEngine = new QuizEngine(roomId, quiz, scenario);
    quizEngine.start();
}

/*
 * Start quiz
 * @param roomId
 */
global.startQuiz = function(roomId) {
    console.log('startQuiz' + roomId);

    var socketId;

    // Start the quiz
    socketId = this.id;

    io.sockets.in(roomId).emit('newQuizStarted', roomId, socketId);
}

/*
 * Start question
 * @param roomId
 */
global.startQuestion = function(roomId) {
    console.log('startQuestion' + roomId);
    startNewRound(0, roomId);
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
    var room = currentSocket.manager.rooms["/" + data.gameId];

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
