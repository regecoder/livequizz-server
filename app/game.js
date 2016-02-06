'use strict';

module.exports = Game;

function Game(gameId) {

    var players = {};

    this.id = gameId;
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
}
