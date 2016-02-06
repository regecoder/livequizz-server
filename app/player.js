'use strict';

module.exports = Player;

function Player(socketId) {

    this.socketId = socketId;
    this.score = 0;
}
