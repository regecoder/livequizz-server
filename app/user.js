'use strict';

module.exports = User;

function User(socketId, pseudo) {

    var nearGames = [];

    this.socketId = socketId;
    this.pseudo = pseudo;
    this.position = {};
    this.game = {};

    this.initGame = initGame;
    this.initRound = initRound;

    function initGame() {
        this.game = {
            rounds: []
        };
    }

    function initRound(roundIndex) {
        this.game.rounds[roundIndex] = {};
    }

    this.addNearGame = function(gameId, distance) {

        var i;
        var count;
        var myNearGame;

        count = nearGames.length;
        for (i = 0; i < count; i++) {
            if (nearGames[i].id === gameId) {
                break;
            }
        }
        if (i >= count) {
            myNearGame = {
                id: gameId,
                distance: distance
            };
            nearGames.push(myNearGame);
        }

        nearGames.sort(function(a, b) {
                return a.distance - b.distance;
        });
    };

    this.nearGamesCount = function() {

        return nearGames.length;
    };

    this.getnearGames = function() {

        return nearGames;
    };

    this.getNearGame = function(index) {

        return nearGames[index];
    };

    this.clearNearGame = function() {

        nearGames = [];
    };
}
