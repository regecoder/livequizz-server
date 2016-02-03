// Client-side:
// var sessionid = socket.socket.sessionid;

// Server-side:
// var sessionid = socket.id;

var io;
var socket;

var quiz = [];

(function() {
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
    }
})();

var scenario = [
    {
        name: 'startQuiz',
        action: 'startQuiz',
        tempo: 3
    },
    {
        name: 'startEpisode',
        action: 'startEpisode',
        loop: true,
        scene: [
            {
                name: 'startQuestion',
                action: 'startQuestion',
                tempo: 3
            },
            {
                name: 'startResponse',
                action: 'startResponse',
                tempo: 3
            }
        ]
    }
];

var User = function(socketId, pseudo) {

    var nearRooms = [];

    this.socketId = socketId;
    this.pseudo = pseudo;
    this.position = {};

    this.addNearRoom = function(roomId, distance) {

        var i;
        var count;
        var myNearRoom;

        count = nearRooms.length;
        for (i = 0; i < count; i++) {
            if (nearRooms[i].id === roomId) {
                break;
            }
        }
        if (i >= count) {
            myNearRoom = {
                id: roomId,
                distance: distance
            };
            nearRooms.push(myNearRoom);
        }

        nearRooms.sort(function(a, b) {
                return a.distance - b.distance;
        });
    };

    this.nearRoomsCount = function() {

        return nearRooms.length;
    };

    this.getNearRooms = function() {

        return nearRooms;
    };

    this.getNearRoom = function(index) {

        return nearRooms[index];
    };

    this.clearNearRoom = function() {

        nearRooms = [];
    };
};

var Users = function() {

    var users = {};

    this.count = 0;

    this.addUser = function(user) {
        this.count++;
        users[user.socketId] = user;
    };

    this.getUser = function(socketId) {
        return users[socketId];
    };

    this.removeUser = function(socketId) {
        this.count--;
        delete users[socketId];
    };
};

var Player = function(socketId) {

    this.socketId = socketId;
    this.score = 0;
};

var Room = function(roomId) {

    var players = {};

    this.id = roomId;
    this.currentScene = null;
    this.playersCount = 0;
    this.masterId = null;

    this.addPlayer = function(player) {
        this.playersCount++;
        players[player.socketId] = player;
    };

    this.getPlayer = function(socketId) {
        return players[socketId];
    };

    this.removePlayer = function(socketId) {
        this.playersCount--;
        delete players[socketId];
    };
};

// var Rooms = function() {

//     var rooms = [];

//     this.addRoom = function(room) {
//         rooms.push(room);
//     };

//     this.getRoom = function(roomId) {

//         var index;

//         index = getIndex(roomId);
//         return rooms[index];
//     };

//     this.getRoomByIndex = function(index) {

//         return rooms[index];
//     };

//     this.removeRoom = function(roomId) {

//         var index;

//         index = getIndex(roomId);
//         rooms.splice(index, 1);
//     };

//     this.count = function() {
//         console.log('objet count:' + rooms.length);

//         return rooms.length;
//     };

//     var getIndex = function(roomId) {

//         var i;
//         var index;
//         var count;

//         index = -1;

//         count = rooms.length
//         for (i = 0; i < count; i++) {
//             if (rooms[i].id === roomdId) {
//                 index = i;
//                 break;
//             }
//         }
//         return index;
//     };
// };

var Rooms = function() {

    var rooms = {};

    this.count = 0;

    this.addRoom = function(room) {
        this.count++;
        rooms[room.id] = room;
    };

    this.getRoom = function(roomId) {
        return rooms[roomId];
    };

    this.removeRoom = function(roomId) {
        this.count--;
        delete rooms[roomId];
    };

    this.forEach = function(callback) {
        for (key in rooms) {
            if (rooms.hasOwnProperty(key)) {
                callback(rooms[key]);
            }
        }
    }
};

// getDistance: get distance between 2 positions
// uses 'Spherical Law of Cosines' formula
// http://www.movable-type.co.uk/scripts/latlong.html
var getDistance = function (position1, position2) {

    var earthRadius = 6371000;

    var DegreeToRadian = function (degree) {
        return degree * Math.PI / 180;
    }

    return Math.acos(Math.sin(DegreeToRadian(position1.latitude)) * Math.sin(DegreeToRadian(position2.latitude)) + Math.cos(DegreeToRadian(position1.latitude)) * Math.cos(DegreeToRadian(position2.latitude)) * Math.cos(DegreeToRadian(position2.longitude - position1.longitude))) * earthRadius;
}

var appUsers = new Users;
var appRooms = new Rooms;

var QuizEngine = function(roomId, quiz, scenario) {

    this.roomId = roomId;
    this.quiz = quiz;
    this.scenario = scenario;

    //
    // --------------------------------------------------------
    //

    var start = function() {
        console.log('quizEngine start');

        var sequences;
        var currentSequence;
        var sequencesCount;
        var sequenceIndex;
        var that;
        var startSequence;
        var onTick;
        var onComplete;
        var i;
        var j;
        var k;
        var scenarioItemsCount;
        var currentScene;
        var currentSceneLoop;
        var currentSceneItemsCount;
        var myScene;
        var currentSceneItem;
        var currentSceneIndex;
        var currentLoop;

        // problème this: à étudier
        // http://www.sitepoint.com/mastering-javascripts-this-keyword/
        that = this;

        // Génère la liste chronologique des séquences en fonction du scénario
        sequences = [];
        curLoop = quiz.length;
        scenarioItemsCount = that.scenario.length;
        for (i = 0; i < scenarioItemsCount; i++) {
            currentSequence = that.scenario[i];
            // action
            if (typeof currentSequence.action != undefined && currentSequence.action) {
                sequences.push(currentSequence);
            }
            // loop
            if (typeof currentSequence.loop != undefined && currentSequence.loop) {
                currentSceneLoop = curLoop;
                currentScene = currentSequence.scene;
                currentSceneItemsCount = currentScene.length;

                // for (j = 0; j < currentSceneLoop; j++) {
                //     for (k = 0; k < currentSceneItemsCount; k++) {
                //         currentSceneItem = currentSequence.scene[k];
                //         if (typeof currentSequence.action != undefined && currentSequence.action) {
                //             // currentSceneItem.sceneIndex = j;
                //             // console.log('regis:' + currentSceneItem.sceneIndex);
                //             sequences.push(currentSceneItem);
                //             currentSceneItem = new Object;
                //             currentSequence.scene[k].sceneIndex = j;
                //         }
                //     }
                // }
                //

                // Workaround utilisé pour corriger le problème d'affectation
                // de sceneIndex qui ne fonctionne pas (incompréhensible !)
                //  L'idée consiste à enregistrer cette variable dans un tableau
                //  à part. Et cela fonctionne !
                var wa_SceneIndex = [];

                for (j = 0; j < currentSceneLoop; j++) {
                    for (k = 0; k < currentSceneItemsCount; k++) {
                        // currentSceneItem = currentSequence.scene[k];
                        if (typeof currentSequence.scene[k].action != undefined && currentSequence.scene[k].action) {
                            currentSequence.scene[k].sceneIndex = j;
                            // console.log('regis:' + currentSceneItem.sceneIndex);
                            sequences.push(currentSequence.scene[k]);
                            // currentSceneItem = new Object;
                            // currentSequence.scene[k].sceneIndex = j;
                            // sequences[sequences.length - 1].sceneIndex = j;
                            wa_SceneIndex[sequences.length - 1] = j;
                            // console.log('sceneIndex:' + j + '/' + sequences[sequences.length - 1].sceneIndex);
                        }
                    }
                }
            }
        }

        sequencesCount = sequences.length;
        sequenceIndex = 0;

        // for (var m = 0; m < sequencesCount; m++) {
        //     console.log(m + '/' + sequences[m].action + '/' + sequences[m].tempo + '/' + wa_SceneIndex[m] + '/' + sequences[m].sceneIndex);
        // }
        // return;

        startSequence = function(sequenceIndex) {
            currentSequence = sequences[sequenceIndex];
            currentSceneIndex = currentSequence.sceneIndex || -1;
            console.log('quizEngine startSequence:' + sequenceIndex + '/' + currentSequence.action + '/' + currentSequence.tempo + '/' + currentSceneIndex);
            global[currentSequence.action].call(that, that.roomId, currentSceneIndex);

            sequenceIndex++;

            if (typeof currentSequence.tempo == undefined || !currentSequence.tempo) {
                if (sequenceIndex === sequencesCount) {
                    io.sockets.in(that.roomId).emit('timerComplete', currentSequence.name);
                } else {
                    startSequence(sequenceIndex);
                }
            } else {
                onTick = function(totalLength, currentLength) {
                    console.log('quizEngine tick:' + currentLength + '/' + totalLength);
                    io.sockets.in(that.roomId).emit('timerTick', currentSequence.name, totalLength, currentLength);
                };
                if (sequenceIndex === sequencesCount) {
                    onComplete = function() {
                        io.sockets.in(that.roomId).emit('timerComplete', currentSequence.name);
                    };
                } else {
                    onComplete = function() {
                        io.sockets.in(that.roomId).emit('timerComplete', currentSequence.name);
                        startSequence(sequenceIndex);
                    };
                }
                console.log('QuizEngine start timer');
                setTimer((currentSequence.tempo * 1000), 5, onTick, onComplete, -1);
            }
        };
        // Launch startSequence
        startSequence(sequenceIndex);
    };

    //
    // --------------------------------------------------------
    //

    this.start = start;
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

function setTimer(length, resolution, onTick, onComplete, displayBySeconde)
{
    console.log('setTimer start');
    // console.log(onComplete.toString());

    var steps = (length / 100) * (resolution / 10),
        speed = length / steps,
        count = 0,
        countBySeconde = 0,
        lengthBySeconde = length / 1000,
        start = new Date().getTime();

    function instance()
    {
        var diff;

        count++;
        if (count === steps)
        {
            console.log('setTimer complete');
            onComplete();
            return;
        }
        else
        {
            if (displayBySeconde === 0) {
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
 * @param sio the Socket.IO server
 * @param socket The socket object for the connected client.
 */
exports.initApp = function(ioInstance, socketInstance){

    io = ioInstance;
    socket = socketInstance;

    myUser = new User(socket.id);
    appUsers.addUser(myUser);

    socket.emit('connected');

    // Host Events
    socket.on('userGeoPositionTaken', activateUserGeoPosition);
    socket.on('userPseudoSubmit', approveUserPseudo);
    socket.on('createGameRequested', createRoom);




    // socket.on('createRoomRequested', createRoom);
    socket.on('startQuizRequested', startQuizEngine);
    socket.on('hostNextRound', hostNextRound);

    // Player Events
    socket.on('playerJoinGame', playerJoinGame);
    socket.on('playerAnswer', playerAnswer);
    socket.on('playerRestart', playerRestart);
};

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

    searchUserNearRooms(socket.id);
}

function searchUserNearRooms(userId) {

    // Distance maximale admise entre la position de l'utilisateur et celle du créateur d'une partie pour considérer cette dernère comme proche de l'utilisateur.
    var maxDistance = 100;

    var myUser;
    var checkIsNearRoom;

    myUser = appUsers.getUser(socket.id);

    console.log('roomsCount:' + appRooms.count);

    if (appRooms.count === 0) {
        return;
    }

    checkIsNearRoom = function(myRoom) {

        var myMaster;
        var distance;
        var clientData;

        myMaster = appUsers.getUser(myRoom.masterId);
        if (myMaster.position !== {}) {
            distance = getDistance(myUser.position, myMaster.position);
            // if (distance <= maxDistance) {
                myUser.addNearRoom(myRoom.id, distance);
                console.log('searchUserNearRooms:' + myRoom.id + '/' + distance);
            // }
        }
    };

    appRooms.forEach(checkIsNearRoom);

    clientData = {
        nearRooms: myUser.getNearRooms()
    };

    socket.emit('userNearRoomsSearchCompleted', clientData);
}

function approveUserPseudo(data) {
    console.log('approveUserPseudo:' + data.userPseudo);
    return;

    var clientData;

    myUser = appUsers.getUser(socket.id);
    myUser.pseudo = data.userPseudo;

    console.log('nearRoomsCount:' + myUser.nearRoomsCount());

    clientData = {
        userPseudo: myUser.pseudo,
        nearRooms: myUser.getNearRooms()
    };

    socket.emit('userPseudoApproved', clientData);
}

/**
 * Create a room
 */
function createRoom() {
    console.log('createRoom socketId:' + socket.id);

    var myUser;
    var myRoom;
    var myPlayer;

    // Create a unique Socket.IO Room
    roomId = ((Math.random() * 100000) | 0).toString();

    // Join the Room and wait for the players
    socket.join(roomId);

    myRoom = new Room(roomId);
    myPlayer = new Player(socket.id);
    myRoom.masterId = myPlayer.socketId;
    myRoom.addPlayer(myPlayer);
    appRooms.addRoom(myRoom);

    myUser = appUsers.getUser(socket.id);
    myUser.addNearRoom(myRoom.id, 0);

    socket.emit('roomCreated', roomId);
}

/*
 * Start quiz engine
 * @param roomId
 */
function startQuizEngine(roomId) {
    console.log('startQuizEngine roomId/socketId:' + roomId + '/' + socket.id);

    var quizEngine = new QuizEngine(roomId, quiz, scenario);
    quizEngine.start();
}

/*
 * Start quiz
 * @param roomId
 */
global.startQuiz = function(roomId) {
    console.log('startQuiz' + roomId);

    io.sockets.in(roomId).emit('quizStarted', roomId);
};

/*
 * Start episode
 * @param roomId
 */
global.startEpisode = function(roomId) {
    console.log('startEpisode:' + roomId);

    // appRooms[roomId].currentScene = 0;
};

global.startQuestion = function(roomId, sceneId) {

    // startScene(roomId, currentScene);
    io.sockets.in(roomId).emit('questionStarted', roomId, sceneId);
};

global.startResponse = function(roomId, sceneId) {

    // startScene(roomId, currentScene);
    io.sockets.in(roomId).emit('responseStarted', roomId, sceneId);
};

/**
 * A player answered correctly. Time for the next word.
 * @param data Sent from the client. Contains the current round and gameId (room)
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
 * Attempt to connect them to the room that matches
 * the gameId entered by the player.
 * @param data Contains data entered via player's input - playerName and gameId.
 */
function playerJoinGame(data) {
    // console.log('playerJoinGame socketId:' + socket.id);

    // A reference to the player's Socket.IO socket object
    var sock = this;

    // Look up the room ID in the Socket.IO manager object.
    var room = socket.manager.rooms["/" + data.gameId];

    // If the room exists...
    if( room !== undefined ){
        // attach the socket id to the data object.
        data.mySocketId = sock.id;

        // Join the room
        sock.join(data.gameId);

        //console.log('Player ' + data.playerName + ' joining game: ' + data.gameId );

        // Emit an event notifying the clients that the player has joined the room.
        io.sockets.in(data.gameId).emit('playerJoinedRoom', data);

    } else {
        // Otherwise, send an error message back to the player.
        socket.emit('error',{message: "This room does not exist."} );
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

/**
 * Start question
 *
 * @param roomId
 * @param questionIndex
 */
function startScene(roomId, sceneIndex) {
    var sceneCount;
    var data;

    sceneCount = quiz.length;

    data = {
        sceneIndex: sceneIndex,
        sceneCount: sceneCount,
        sceneData: quiz[sceneIndex]
    };

    io.sockets.in(roomId).emit('startNewRound', data);
}
