'use strict';

module.exports = Round;

function Round(numberQuiz) {

	var that = this;

	var i;

	numberQuiz = numberQuiz || 2;

    this.themeVotes = [];
	for (i = 0; i < numberQuiz; i++) {
		this.themeVotes.push(0);
	}

	this.quiz = {};

    this.addThemeVote = addThemeVote;
    this.getThemeVotesCount = getThemeVotesCount;
    this.getWinnerThemeIndex = getWinnerThemeIndex;

    function addThemeVote(themeIndex) {
    	that.themeVotes[themeIndex] += 1;
    }

    function getThemeVotesCount() {

    	var count = 0;

		for (i = 0; i < numberQuiz; i++) {
			count += that.themeVotes[i];
		}

    	return count;
    }

    function getWinnerThemeIndex() {

    	var maxList,
    		maxValue,
    		curValue,
    		index;

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
