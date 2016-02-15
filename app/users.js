'use strict';

var _ = require('../lib/underscore/underscore-min');

module.exports = Users;

function Users() {

    var users = {};

    this.count = 0;

    this.addUser = function(user) {

        var myUser = this.getUser(user.socketId);

        if (_.isUndefined(myUser)) {
            this.count++;
            users[user.socketId] = user;
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
        this.count--;
        delete users[socketId];
    };

    this.userPseudoIsAvailable = function(userPseudo) {
        // TODO
        return true;
    };
}
