jQuery(function(){

    'use strict';

    /**
     * All the code relevant to Socket.IO is collected in the IO namespace.
     */
    var IO = {

        /**
         * This is called when the page is displayed. It connects the Socket.IO client
         * to the Socket.IO server
         */
        init: function() {
            IO.socket = io.connect();
            IO.bindEvents();
        },

        /**
         * While connected, Socket.IO will listen to the following events emitted
         * by the Socket.IO server, then run the appropriate function.
         */
        bindEvents : function() {
            IO.socket.on('connected', IO.connected );
            IO.socket.on('userNearRoomsSearchCompleted', IO.userNearRoomsSearchCompleted );
            IO.socket.on('userPseudoApproved', IO.userPseudoApproved );


            IO.socket.on('roomCreated', IO.roomCreated );
            IO.socket.on('playerJoinedRoom', IO.playerJoinedRoom );
            IO.socket.on('quizStarted', IO.quizStarted);
            IO.socket.on('questionStarted', IO.questionStarted);
            IO.socket.on('responseStarted', IO.responseStarted);
            IO.socket.on('startNewRound', IO.startNewRound);
            IO.socket.on('hostCheckAnswer', IO.hostCheckAnswer);
            IO.socket.on('gameOver', IO.gameOver);
            IO.socket.on('error', IO.error );
            IO.socket.on('timerTick', IO.timerTick);
        },

        /**
         * The client is successfully connected!
         */
        connected : function() {
            // console.log('connected socketId:' + IO.socket.socket.sessionid)
            App.takeUserGeoPosition();
        },

        userNearRoomsSearchCompleted: function(userNearRooms) {
            console.log('userNearRoomsSearchCompleted:' + userNearRooms.length);
            // var myContainer = $('#nearRooms');
            // for (var i = 0; i < userNearRooms.length; i++) {
            //     myContainer.append('<div>' + userNearRooms[i].id + '/' + userNearRooms[i].distance + '</div>');
            // }
        },

        userPseudoApproved: function(data) {
            console.log('userPseudoApproved:' + data.userPseudo);
            App.user.pseudo = data.userPseudo;
            App.displaySelectRoomScreen(data);
        },

        /**
         * New room opened
         * @param data
         */
        roomCreated : function(roomId) {
            // console.log('roomCreated:' + IO.socket.socket.sessionid);
            App.Host.prepareRoom(roomId);
        },

        /**
         * A player has successfully joined the game.
         * @param data {{playerName: string, gameId: int, mySocketId: int}}
         */
        playerJoinedRoom : function(data) {
            // console.log('connected playerJoinedRoom:' + IO.socket.socket.sessionid)
            // When a player joins a room, do the updateWaitingScreen funciton.
            // There are two versions of this function: one for the 'host' and
            // another for the 'player'.
            //
            // So on the 'host' browser window, the App.Host.updateWiatingScreen function is called.
            // And on the player's browser, App.Player.updateWaitingScreen is called.
            App[App.userRole].playerJoinedRoom(data);
        },

        /**
         * New quiz Started
         * @param data
         */
        quizStarted : function(roomId) {
            console.log('quizStarted:' + roomId);
            App[App.userRole].quizStarted(roomId);
        },

        questionStarted : function(roomId, sceneId) {
            console.log('questionStarted:' + roomId + '/' + sceneId);
            App[App.userRole].questionStarted(roomId, sceneId);
        },

        responseStarted : function(roomId, sceneId) {
            console.log('responseStarted:' + roomId + '/' + sceneId);
            App[App.userRole].responseStarted(roomId, sceneId);
        },

        /**
         * timer tick
         * @param data
         */
        timerTick : function(sequenceName, totalLength, currentLength) {
            App[App.userRole].timerTick(sequenceName, totalLength, currentLength);
        },

        /**
         * A new set of words for the round is returned from the server.
         * @param data
         */
        startNewRound : function(data) {
            // Update the current round
            App.currentRound = data.roundId;

            // Change the word for the Host and Player
            App[App.userRole].startNewRound(data);
        },

        roundPreviewCompleted: function(gameId) {
            App[App.userRole].roundPreviewCompleted(gameId);
        },

        /**
         * A player answered. If this is the host, check the answer.
         * @param data
         */
        hostCheckAnswer : function(data) {
            if(App.userRole === 'Host') {
                App.Host.checkAnswer(data);
            }
        },

        /**
         * Let everyone know the game has ended.
         * @param data
         */
        gameOver : function(data) {
            App[App.userRole].endGame(data);
        },

        /**
         * An error has occurred.
         * @param data
         */
        error : function(data) {
            alert(data.message);
        }
    };

    var App = {

        user: {
            pseudo: null
        },


        /**
         * Keep track of the gameId, which is identical to the ID
         * of the Socket.IO Room used for the players and host to communicate
         *
         */
        roomId: 0,

        /**
         * This is used to differentiate between 'Host' and 'Player' browsers.
         */
        userRole: '',   // 'Player' or 'Host'

        /**
         * The Socket.IO socket object identifier. This is unique for
         * each player and host. It is generated when the browser initially
         * connects to the server when the page loads for the first time.
         */
        // mySocketId: '',

        /**
         * Identifies the current round. Starts at 0 because it corresponds
         * to the array of word data stored on the server.
         */
        currentRound: 0,

        /* *************************************
         *                Setup                *
         * *********************************** */

        /**
         * This runs when the page initially loads.
         */
        init: function () {
            App.cacheElements();
            App.bindEvents();
            App.displayStartScreen();
            // App.showIntroScreen();

            // Initialize the fastclick library
            FastClick.attach(document.body);
        },

        getSocketId: function() {
            return IO.socket.socket.sessionid;
        },

        /**
         * Create references to on-screen elements used throughout the game.
         */
        cacheElements: function () {
            App.$doc = $(document);

            // Templates
            App.screen = $('#screen');
            App.startTemplate = 'start';
            App.selectRoomTemplate = 'select_room';

            App.$gameArea = $('#gameArea');
            App.$templateIntroScreen = $('#intro-screen-template').html();
            App.$roomTemplate = $('#room-template').html();
            App.$templateJoinGame = $('#join-game-template').html();
            App.$quizmasterQuizTemplate = $('#quizmaster-quiz-template').html();
            App.$quizmasterQuestionTemplate = $('#quizmaster-question-template').html();
            App.$quizmasterResponseTemplate = $('#quizmaster-response-template').html();
            App.$playerQuestionTemplate = $('#player-question-template').html();
            App.$playerResponseTemplate = $('#player-response-template').html();
            App.$playerQuizTemplate = $('#player-quiz-template').html();
        },

        /**
         * Create some click handlers for the various buttons that appear on-screen.
         */
        bindEvents: function () {

            // Start screen
            App.$doc.on('click', '#pseudo-submit-button', App.submitPseudo);

            // Select game screen
            // App.$doc.on('click', '#join-game-button', App.joinGame);
            App.$doc.on('click', '#create-game-button', App.requestCreateGame);

            // Host
            App.$doc.on('click', '#btnCreateGame', App.Host.requestCreateRoom);
            App.$doc.on('click', '#btnStartGame',App.Host.requestStartQuiz);

            // Player
            App.$doc.on('click', '#btnJoinGame', App.Player.onJoinClick);
            App.$doc.on('click', '#btnStart',App.Player.onPlayerStartClick);
            App.$doc.on('click', '.btnAnswer',App.Player.onPlayerAnswerClick);
            App.$doc.on('click', '#btnPlayerRestart', App.Player.onPlayerRestart);
            App.$doc.on('click', '#btnStartQuizz',App.Host.requestStartQuiz);
        },

        submitPseudo: function() {
            console.log('submitPseudo');

            var data = {
                userPseudo : $('#pseudo').val()
            };

            IO.socket.emit('userPseudoSubmitted', data);
        },

        requestCreateGame: function () {
            console.log('requestCreateGame');

            IO.socket.emit('createGameRequested');
        },


        /**
         * Geolocation
         */

         takeUserGeoPosition: function() {

            var options;

            if (navigator.geolocation) {
                options = {desiredAccuracy: 20, maxWait: 5000};
                navigator.geolocation.getAccurateCurrentPosition(positionSuccess, positionError, positionProgress, options);
            }

            function sendPosition(position) {

                var myPosition;

                myPosition = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };

                $('#map').text('Position:' + myPosition.latitude + '/' + myPosition.longitude + '/' + myPosition.accuracy);

                IO.socket.emit('userGeoPositionTaken', myPosition);
            }

            function positionSuccess(position) {
                sendPosition(position);
            }

            function positionError(error) {
                var errors = {
                    1: "Authorization fails", // permission denied
                    2: "Can\'t detect your location", //position unavailable
                    3: "Connection timeout" // timeout
                };
            }

            function positionProgress(position) {
                sendPosition(position);
            }
        },

        getScreen: function (templateName, context) {

            var template;
            var header;

            template = getTemplate(templateName);
            header = getTemplate('header', true);
            // console.log('header:' + header);
            Handlebars.registerPartial('header', header);

            return template(context);

            function getTemplate(templateName, isPartial) {
                // console.log('getTemplate:' + templateName + '/' + isPartial);

                isPartial = isPartial || false;

                if (Handlebars.templates === undefined || Handlebars.templates[templateName] === undefined) {
                    $.ajax({
                        url: 'templates/' + templateName + '.hbs',
                        async: false,
                        success: function(data) {
                            if (Handlebars.templates === undefined) {
                                Handlebars.templates = {};
                            }
                            if (isPartial === false) {
                                Handlebars.templates[templateName] = Handlebars.compile(data);
                            } else {
                                Handlebars.templates[templateName] = data;
                            }
                        }
                    });
                }
                return Handlebars.templates[templateName];
            }
        },

        renderTemplate: function(html) {
            // console.log('renderTemplate' + html);
            App.screen.html(html);
        },

        displayStartScreen: function() {

            var html;

            html = App.getScreen(App.startTemplate, {title: "Live quizz"});
            App.renderTemplate(html);
        },

        displaySelectRoomScreen: function(data) {

            var html;
            var screenData;

            screenData = {
                userPseudo: App.user.pseudo,
                userNearRooms: data.nearRooms
            };

            html = App.getScreen(App.selectRoomTemplate, screenData);
            App.renderTemplate(html);
        },

        /**
         * Show the intro Screen
         */
        showIntroScreen: function() {

            App.$gameArea.html(App.$templateIntroScreen);
            App.doTextFit('.title');
        },


        /* *******************************
           *         HOST CODE           *
           ******************************* */
        Host : {

            /**
             * Contains references to player data
             */
            players : [],

            /**
             * Flag to indicate if a new game is starting.
             * This is used after the first game ends, and players initiate a new game
             * without refreshing the browser windows.
             */
            isNewGame : false,

            /**
             * Keep track of the number of players that have joined the game.
             */
            numPlayersInRoom: 0,

            /**
             * A reference to the correct answer for the current round.
             */
            currentCorrectAnswer: '',

            /**
             * Handler for the "Start" button on the Title Screen.
             */
            requestCreateRoom: function () {

                // console.log('Clicked "Create A Game"');
                IO.socket.emit('createRoomRequested');
            },

            requestStartQuiz: function () {
                // console.log('Clicked "Start A Game"');
                IO.socket.emit('startQuizRequested', App.gameId);
                // IO.socket.emit('hostStartGame', App.gameId);
            },

            /**
             * Prepare a new room
             * @param data{{ gameId: int, mySocketId: * }}
             */
            prepareRoom: function (roomId) {
console.log('prepareRoom:' + roomId);

                App.gameId = roomId;
                // App.mySocketId = App.getSocketId();
                // App.userRole = 'Host';
                // App.Host.numPlayersInRoom = 0;
                App.Host.players = [];
                // App.Player.pseudo = 'admin';

                App.Host.displayRoomScreen(roomId);

                // console.log("Game started with ID: " + App.gameId + ' by host: ' + App.mySocketId);
            },

            /**
             * Show the Host screen containing the game URL and unique game ID
             */
            displayRoomScreen : function(roomId) {

            var html;
            var screenData;

            screenData = {
                userPseudo: App.user.pseudo,
                roomId: roomId
            };

            html = App.getScreen('rooms', screenData);
            App.renderTemplate(html);






                // // Fill the game screen with the appropriate HTML
                // App.$gameArea.html(App.$roomTemplate);

                // // Display the URL on screen
                // $('#gameURL').text(window.location.href);
                // App.doTextFit('#gameURL');

                // // Show the gameId / room id on screen
                // $('#spanNewGameCode').text(App.gameId);

            },

            /**
             * Update the Host screen when the first player joins
             * @param data{{playerName: string}}
             */
            playerJoinedRoom: function(data) {

                var i;
                var playersCount;
                var socketId;

                // console.log(data);
                // If this is a restarted game, show the screen.
                if ( App.Host.isNewGame ) {
                    App.Host.displayRoomScreen();
                }

                socketId = App.getSocketId();
                playersCount = App.Host.players.length;
                for (i = 0; i < playersCount; i++) {
                    // console.log('data.mySocketId' + data.mySocketId + '/' + App.Host.players[i].mySocketId)
                    if (socketId == App.Host.players[i].socketId) {
                        return;
                    };
                };

                App.Host.players.push(data);
                App.Host.numPlayersInRoom += 1;

                App.$gameArea.html(App.$templateJoinGame);
                $('#template-timer').html('10');

                $('#debug-page').html('Player ' + data.playerName + ' joined the game.');

            },

            /**
             * quizmaster : new quiz started
             */
            quizStarted : function(roomId) {
                // console.log('quizStarted template');
                App.$gameArea.html(App.$quizmasterQuizTemplate);
                $('#template-timer').html('10');
            },

            questionStarted : function(roomId, sceneId) {
                console.log('questionStarted:' + roomId + '/' + sceneId);
                App.$gameArea.html(App.$quizmasterQuestionTemplate);
                $('#template-timer').html('10');
            },

            responseStarted : function(roomId, sceneId) {
                console.log('responseStarted:' + roomId + '/' + sceneId);
                App.$gameArea.html(App.$quizmasterResponseTemplate);
                $('#template-timer').html('10');
            },






            /**
             * quizmaster : timer tick
             */
            timerTick : function(sequenceName, totalLength, currentLength) {
                $('#template-timer').html(currentLength);
            },

            /**
             * Show the word for the current round on screen.
             * @param data{{round: *, word: *, answer: *, list: Array}}
             */
            startNewRound : function(data) {

                // Update the data for the current round
                App.Host.currentCorrectAnswer = data.quizItem.question.goodAnswer;
                App.Host.currentRound = data.roundIndex;


                // Insert the new word into the DOM
                // $('#hostWord').text(data.quizItem.question.text);
                // App.doTextFit('#hostWord');

                $('#gameArea').empty();

                var $roundInfo;
                $roundInfo = $('<div/>');
                $roundInfo.html(data.roundIndex + '/' + data.roundTotal);
                $('#gameArea').append($roundInfo);
                $roundInfo = $('<div/>');
                $roundInfo.html(App.Host.numPlayersInRoom + '/' + App.Host.players.length);
                $('#gameArea').append($roundInfo);

                var $players = $('<ul/>').attr('id','players');
                // console.log('App.Host.players:' + App.Host.players)
                $.each(App.Host.players, function(index, player){
                    $players.append($('<li/>').html(index + '/' + player.playerName + '/' + player.socketId));
                });
                $('#gameArea').append($players);
            },

            roundPreviewCompleted: function(gameId) {},

            /**
             * Check the answer clicked by a player.
             * @param data{{round: *, playerId: *, answer: *, gameId: *}}
             */
            checkAnswer : function(data) {
                // Verify that the answer clicked is from the current round.
                // This prevents a 'late entry' from a player whos screen has not
                // yet updated to the current round.
                if (data.round === App.currentRound){

                    // Get the player's score
                    var $pScore = $('#' + data.playerId);

                    // Advance player's score if it is correct
                    if( App.Host.currentCorrectAnswer === data.answer ) {
                        // Add 5 to the player's score
                        $pScore.text( +$pScore.text() + 5 );

                        // Advance the round
                        App.currentRound += 1;

                        // Prepare data to send to the server
                        var data = {
                            gameId : App.gameId,
                            roundId : App.currentRound
                        };

                        // Notify the server to start the next round.
                        IO.socket.emit('hostNextRound', data);

                    } else {
                        // A wrong answer was submitted, so decrement the player's score.
                        $pScore.text( +$pScore.text() - 3 );
                    }
                }
            },


            /**
             * All 10 rounds have played out. End the game.
             * @param data
             */
            endGame : function(data) {
                // Get the data for player 1 from the host screen
                var $p1 = $('#player1Score');
                var p1Score = +$p1.find('.score').text();
                var p1Name = $p1.find('.playerName').text();

                // Get the data for player 2 from the host screen
                var $p2 = $('#player2Score');
                var p2Score = +$p2.find('.score').text();
                var p2Name = $p2.find('.playerName').text();

                // Find the winner based on the scores
                var winner = (p1Score < p2Score) ? p2Name : p1Name;
                var tie = (p1Score === p2Score);

                // Display the winner (or tie game message)
                if(tie){
                    $('#hostWord').text("It's a Tie!");
                } else {
                    $('#hostWord').text( winner + ' Wins!!' );
                }
                App.doTextFit('#hostWord');

                // Reset game data
                App.Host.numPlayersInRoom = 0;
                App.Host.players = [];
                App.Host.isNewGame = true;
            },

            /**
             * A player hit the 'Start Again' button after the end of a game.
             */
            restartGame : function() {
                App.$gameArea.html(App.$roomTemplate);
                $('#spanNewGameCode').text(App.gameId);
            }
        },


        /* *****************************
           *        PLAYER CODE        *
           ***************************** */

        Player : {

            /**
             * A reference to the socket ID of the Host
             */
            hostSocketId: '',

            /**
             * The player's name entered on the 'Join' screen.
             */
            pseudo: '',

            /**
             * Click handler for the 'JOIN' button
             */
            onJoinClick: function () {
                // console.log('Clicked "Join A Game"');

                // Display the Join Game HTML on the player's screen.
                App.$gameArea.html(App.$templateJoinGame);
            },

            /**
             * The player entered their name and gameId (hopefully)
             * and clicked Start.
             */
            onPlayerStartClick: function() {
                // console.log('Player clicked "Start"');

                // collect data to send to the server
                var data = {
                    gameId : +($('#inputGameId').val()),
                    playerName : $('#inputPlayerName').val() || 'who are you ?'
                };

                // Send the gameId and playerName to the server
                IO.socket.emit('playerJoinGame', data);

                // Set the appropriate properties for the current player.
                App.userRole = 'Player';
                App.Player.pseudo = data.playerName;
            },

            /**
             *  Click handler for the Player hitting a word in the word list.
             */
            onPlayerAnswerClick: function() {
                // console.log('Clicked Answer Button');
                var $btn = $(this);      // the tapped button
                var answer = $btn.val(); // The tapped word

                // Send the player info and tapped word to the server so
                // the host can check the answer.
                var data = {
                    gameId: App.gameId,
                    playerId: App.getSocketId(),
                    answer: answer,
                    round: App.currentRound
                }
                IO.socket.emit('playerAnswer',data);
            },

            /**
             *  Click handler for the "Start Again" button that appears
             *  when a game is over.
             */
            onPlayerRestart : function() {
                var data = {
                    gameId : App.gameId,
                    playerName : App.Player.pseudo
                }
                IO.socket.emit('playerRestart',data);
                App.currentRound = 0;
                $('#gameArea').html("<h3>Waiting on host to start new game.</h3>");
            },

            /**
             * Display the waiting screen for player
             * @param data
             */
            playerJoinedRoom : function(data) {
                // if(App.getSocketId() === data.mySocketId){
                    App.userRole = 'Player';
                    App.gameId = data.gameId;

                App.$gameArea.html(App.$templateJoinGame);
                $('#template-timer').html('10');

                    $('#debug-page').html('Joined Game ' + data.gameId + '/' + 'En attente de démarrage du quizz');
                // }
            },

            /**
             * player : new quiz started
             */
            quizStarted : function(roomId) {
                console.log('quizStarted:' + roomId);
                App.$gameArea.html(App.$playerQuizTemplate);
                $('#template-timer').html('10');
            },

            questionStarted : function(roomId, sceneId) {
                console.log('questionStarted:' + roomId + '/' + sceneId);
                App.$gameArea.html(App.$playerQuestionTemplate);
                $('#template-timer').html('10');
            },

            responseStarted : function(roomId, sceneId) {
                console.log('responseStarted:' + roomId + '/' + sceneId);
                App.$gameArea.html(App.$playerResponseTemplate);
                $('#template-timer').html('10');
            },





            /**
             * player : timer tick
             */
            timerTick : function(sequenceName, totalLength, currentLength) {
                $('#template-timer').html(currentLength);

            },

            /**
             * Show the list of words for the current round.
             * @param data{{round: *, word: *, answer: *, list: Array}}
             */
            startNewRound : function(data) {
                var str;
                var $mySelector;
                var $myButton;

                var $roundInfo;
                $roundInfo = $('<div style="font-size: 24px; text-align: center;" />');
                $roundInfo.html((data.roundIndex + 1) + '/' + data.roundTotal + '/' +data.quizItem.question.text);

                var $list = $('<ul/>').attr('id','ulAnswers');

                // Insert a list item for each word in the word list
                // received from the server.
                $.each(data.quizItem.question.answer, function(index, text){
                    $mySelector = $('<li/>').attr('id', 'answer' + index);
                    $myButton = $('<button/>')
                                    .addClass('btnAnswer')
                                    .addClass('btn')
                                    .val(this.text)
                                    .html(this.text);
                    if (index > 1) {
                        $myButton.css('visibility', 'hidden');
                    }


                    $list
                        .append($mySelector)
                            .append($myButton);
                });

                $('#gameArea').empty();

                    $('#gameArea').append($roundInfo);
                    $('#gameArea').append($('<div class="debug_line"/>')).html((data.roundIndex + 1) + '/' + data.roundTotal + '/' +data.quizItem.question.text);
                $('#gameArea').append($list);

                // Insert the list onto the screen.
                // $('#gameArea').html($roundInfo);
            },

            roundPreviewCompleted: function(gameId) {
                $('#ulAnswers button').css('visibility', 'visible');
            },

            /**
             * Show the "Game Over" screen.
             */
            endGame : function() {
                $('#gameArea')
                    .html('<div class="gameOver">Game Over!</div>')
                    .append(
                        // Create a button to start a new game.
                        $('<button>Start Again</button>')
                            .attr('id','btnPlayerRestart')
                            .addClass('btn')
                            .addClass('btnGameOver')
                    );
            }
        },


        /* **************************
                  UTILITY CODE
           ************************** */

        /**
         * Display the countdown timer on the Host screen
         *
         * @param $el The container element for the countdown timer
         * @param startTime
         * @param callback The function to call when the timer ends.
         */
        countDown : function( $el, startTime, callback) {

            // Display the starting time on the screen.
            $el.text(startTime);
            App.doTextFit('#hostWord');

            // console.log('Starting Countdown...');

            // Start a 1 second timer
            var timer = setInterval(countItDown,1000);

            // Decrement the displayed timer value on each 'tick'
            function countItDown(){
                startTime -= 1;
                $el.text(startTime);
                App.doTextFit('#hostWord');

                if( startTime <= 0 ){
                    // console.log('Countdown Finished.');

                    // Stop the timer and do the callback.
                    clearInterval(timer);
                    callback();
                    return;
                }
            }
        },

        /**
         * Make the text inside the given element as big as possible
         * See: https://github.com/STRML/textFit
         *
         * @param el The parent element of some text
         */
        doTextFit : function(el) {
            // textFit(
            //     $(el)[0],
            //     {
            //         alignHoriz:true,
            //         alignVert:false,
            //         widthOnly:true,
            //         reProcess:true,
            //         maxFontSize:80
            //     }
            // );
        }

    };

    IO.init();
    App.init();

}($));
