'use strict';

var _ = require('../lib/underscore/underscore-min');

module.exports = Game;

function Game(gameId, ownerUser) {

    var that = this;

    // Debug: Nécessité de rendre publique users
    // $stateParams ne gère que les attributs statiques

    this.users = {};

    this.id = gameId;
    this.ownerUser = ownerUser;
    this.usersCount = 0;

    // 'waiting', 'started'
    this.status = null;
    this.quizEngine = {};
    this.rounds = [];

    this.roundIndex = null;

    this.forEachUser = forEachUser;

    function forEachUser(callback) {
        for (var key in that.users) {
            if (that.users.hasOwnProperty(key)) {
                callback(that.users[key]);
            }
        }        
    }

    this.addUser = function(user) {

        var myUser = _.findWhere(that.users, {socketId: user.socketId});

        if (_.isUndefined(myUser)) {
            myUser = user;
            that.users[user.socketId] = myUser;
            this.usersCount++;
        }

        return myUser;
    };

    this.getUser = function(socketId) {
        return that.users[socketId];
    };

    this.removeUser = function(socketId) {
        delete that.users[socketId];
        this.usersCount--;
    };
}
