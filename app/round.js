'use strict';

var _ = require('../lib/underscore/underscore-min');

module.exports = Round;

function Round(numberQuiz) {

	var that = this;

	numberQuiz = numberQuiz || 2;

    this.themeVotes = [];
	this.quiz = {};
	this.users = {};
    this.usersCount = 0;
    // Valeur -1 importante puisque cette variable est utilisée
    // pour démarrer automatiquement la manche
    this.usersWaited = -1;

    this.addUser = addUser;
    this.resetThemeVote = resetThemeVote;
    this.addThemeVote = addThemeVote;
    this.getThemeVotesCount = getThemeVotesCount;
    this.getWinnerThemeIndex = getWinnerThemeIndex;

    resetThemeVote();

    function addUser(user) {

        var myUser = _.findWhere(that.users, {socketId: user.socketId});

        if (_.isUndefined(myUser) === true) {
            myUser = user;
            that.users[user.socketId] = myUser;
            this.usersCount++;
        }

        return myUser;
    }

    function resetThemeVote() {
        that.themeVotes = [];
        for (var i = 0; i < numberQuiz; i++) {
            that.themeVotes.push(0);
        }        
    }

    function addThemeVote(themeIndex) {
    	that.themeVotes[themeIndex] += 1;
    }

    function getThemeVotesCount() {

    	var count,
            i;

        count = 0;

		for (i = 0; i < numberQuiz; i++) {
			count += that.themeVotes[i];
		}

    	return count;
    }

    function getWinnerThemeIndex() {

    	var maxList,
    		maxValue,
    		curValue,
    		index,
            i;

    	maxList = [];
    	maxValue = -1;
    	for (i = 0; i < numberQuiz; i++) {
    		curValue = that.themeVotes[i];
    		if (curValue > maxValue) {
    			maxValue = curValue;
    			maxList = [i];
    		} else if (curValue === maxValue) {
    			maxList.push(i);
    		}
    	}

    	if (maxList.length === 1) {
    		index = maxList[0]; 
    	} else {
    		index = maxList[Math.floor(Math.random() * maxList.length)];	
    	}

    	return index;
    }
}
