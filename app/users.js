'use strict';

module.exports = Users;

function Users() {

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
}
