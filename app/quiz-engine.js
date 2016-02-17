'use strict';

var fs = require('fs');
var _ = require('../lib/underscore/underscore-min');

var config = require('../config/quiz-engine-config.json');

module.exports = QuizEngine;

function QuizEngine() {

    var that = this;

    var allQuizFilesList = [],
        usedQuizFilesList = [];

    this.quizList = [];

    this.loadQuizList = loadQuizList;

    loadAllQuizFilesList();

    this.debug = function() {
        console.log('QuizEngine allQuizFilesList:' + allQuizFilesList);
        console.log('QuizEngine usedQuizFilesList:' + usedQuizFilesList);
    };

    // DEBUG: Le chargement des quiz ne se fait pas dynamiquement :
    // Les modifications dans les fichiers ne sont prises en compte
    // qu'après le redémarrage du serveur
    function loadQuizList(numberQuiz) {

        var newQuizFile,
            newQuiz,
            i;

        numberQuiz = numberQuiz || 2;
      
        that.quizList = [];

        for (i = 0; i < numberQuiz; i++) {
            newQuizFile = getNewQuizFile();
            newQuiz = loadQuiz(newQuizFile);
            that.quizList.push(newQuiz);
        }
    }

    function loadAllQuizFilesList() {

        fs.readdir('./quiz', function(err, files) {
            if (err) {
                console.error('QuizEngine: Failed for getQuizFiles: ' + err);
            }

            files
                .filter(function(file) {
                    return file.substr(0, 4) === 'quiz';
                })
                .sort(function(file1, file2){
                    return file1 < file2 ? -1 : 1;
                })
                .forEach(function(file) {
                    allQuizFilesList.push(file);
                });
        });
    }

    function loadQuiz(quizFile) {
        // DEBUG: Le chargement ne se fait pas dynamiquement :
        // Les modifications dans les fichiers ne sont prises en compte
        // qu'après le redémarrage du serveur
        return require( '../quiz/' + quizFile);
    }

    function getNewQuizFile() {

        var myNewList,
            newQuizFile;

        newQuizFile = '';
        do {
            myNewList = _.difference(allQuizFilesList, usedQuizFilesList);
            if (myNewList.length === 0) {
                usedQuizFilesList = [];
            } else {
                if (config.mode === 'random') {
                    newQuizFile = _.sample(myNewList);
                } else {
                    newQuizFile = myNewList[0];
                }
            }
        } while (newQuizFile === '');
        usedQuizFilesList.push(newQuizFile);

        return newQuizFile;
    }
}
