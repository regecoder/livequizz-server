'use strict';

var _ = require('../lib/underscore/underscore-min');

module.exports = Game;

function Game(gameId, ownerUser, quizEngine) {

    var that = this;

    // Debug: Nécessité de rendre publique users
    // $stateParams ne gère que les attributs statiques

    this.id = gameId;
    this.ownerUser = ownerUser;

    this.users = {};
    this.usersCount = 0;

    // 'waiting', 'started'
    this.status = null;
    this.quizEngine = quizEngine;
    this.rounds = [];

    this.roundIndex = -1;

    this.forEachUser = forEachUser;

    this.createRound = createRound;
    this.addUserToRound = addUserToRound;
    this.getUsersOfRound = getUsersOfRound;

    function forEachUser(callback) {
        for (var key in that.users) {
            if (that.users.hasOwnProperty(key)) {
                callback(that.users[key]);
            }
        }        
    }

    this.addUser = function(user) {

        var myUser = _.findWhere(that.users, {socketId: user.socketId});

        if (_.isUndefined(myUser) === true) {
            myUser = user;
            that.users[user.socketId] = myUser;
            that.usersCount++;
        }

        return myUser;
    };

    this.getUser = function(socketId) {
        return that.users[socketId];    
    };

    this.removeUser = function(socketId) {
        delete that.users[socketId];
        that.usersCount--;
    };

    function createRound(roundIndex, newRound) {
        that.rounds[roundIndex] = newRound;
    }

    function addUserToRound(roundIndex, myUser) {
        that.rounds[roundIndex].addUser(myUser);
    }

    function getUsersOfRound(roundIndex) {
        return that.rounds[roundIndex].users;
    }
}
