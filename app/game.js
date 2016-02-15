'use strict';

module.exports = Game;

function Game(gameId, ownerUser) {

    var users = {};

    this.id = gameId;
    this.ownerUser = ownerUser;
    this.currentScene = null;
    this.usersCount = 0;

    this.addUser = function(User) {
        this.usersCount++;
        users[User.socketId] = User;
    };

    this.getUser = function(socketId) {
        return users[socketId];
    };

    this.removeUser = function(socketId) {
        this.usersCount--;
        delete users[socketId];
    };
}
