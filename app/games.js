'use strict';

module.exports = Games;

function Games() {

    var games = {};

    this.count = 0;

    this.addGame = function(game) {
        this.count++;
        games[game.id] = game;
    };

    this.getGame = function(gameId) {
        return games[gameId];
    };

    this.removeGame = function(gameId) {
        this.count--;
        delete games[gameId];
    };

    this.forEach = function(callback) {
        for (var key in games) {
            if (games.hasOwnProperty(key)) {
                callback(games[key]);
            }
        }
    };
}
