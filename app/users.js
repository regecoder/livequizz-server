'use strict';

var _ = require('../lib/underscore/underscore-min');

module.exports = Users;

function Users() {

    var users = {};

    this.count = 0;

    this.addUser = function(user) {

        var myUser = this.getUser(user.socketId);

        if (_.isUndefined(myUser) === true) {
            users[user.socketId] = user;
            this.count++;
            myUser = users[user.socketId];
        } else {
            myUser = user;
        }

        return  myUser;
    };

    this.getUser = function(socketId) {
        return users[socketId];
    };

    this.removeUser = function(socketId) {
        delete users[socketId];
        this.count--;
    };

    this.forEach = function(callback) {
        for (var key in users) {
            if (users.hasOwnProperty(key)) {
                callback(users[key]);
            }
        }
    };

    this.userPseudoIsAvailable = function(userPseudo) {
        // TODO
        return true;
    };
}
