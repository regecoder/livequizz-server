'use strict';

module.exports = TimeEngine;

function TimeEngine(gameClone, scenario, Timer, scope, io, _) {

    this.start = start;

    var gameId = gameClone.id;

    var sequences;

    sequences = getSequencesList(scenario);

    function getSequencesList(scenario) {

        var sequences,
            scenarioItemsCount,
            i;

        sequences = [];
        scenarioItemsCount = scenario.length;
        for (i = 0; i < scenarioItemsCount; i++) {
            treatSequence(scenario[i], sequences, _);
        }

        return sequences;
    }

    function treatSequence(sequence, sequences, _, sequenceStep) {

        sequenceStep = sequenceStep  || '';

        var sceneItemsCount,
            curSequence,
            curSequenceStep,
            loop,
            i, j;

        loop = parseInt((sequence.loop || '1'), 10);
        for (i = 0; i < loop; i++) {
            curSequence = _.clone(sequence);
            if (sequenceStep !== '') {
                sequenceStep += '|';
            }
            curSequenceStep = sequenceStep + i.toString();
            if (_.isUndefined(curSequence.scene) === true) {
                if (_.isUndefined(typeof curSequence.action) === false && curSequence.action !== '') {
                    curSequence.sequenceStep = curSequenceStep;
                    // console.log(curSequence.sequenceStep + '/' + curSequence.action);
                    sequences.push(curSequence);
                    }
            } else {
                sceneItemsCount = curSequence.scene.length;
                for (j = 0; j < sceneItemsCount; j++) {
                    treatSequence(curSequence.scene[j], sequences, _, curSequenceStep);
                }
            }
        }
    }

    function start() {
        // console.log('quizEngine start');

        var sequencesCount,
            sequenceIndex;

        sequencesCount = sequences.length;
        sequenceIndex = 0;

        io.sockets.in(gameId).emit('TEStart');

        startSequence(sequenceIndex);

        function startSequence(sequenceIndex) {

            var curSequence,
                myTimer,
                timerOnTick,
                timerOnComplete,
                curStepIndex;

            curSequence = sequences[sequenceIndex];
            // Permet d'obtenir facilement l'index de la question en cours
            curStepIndex = getStepIndex(curSequence.sequenceStep);
            io.sockets.in(gameId).emit(curSequence.action + 'TEStart', curStepIndex);
            // Execute action
            scope[curSequence.action].call(scope, gameClone, curStepIndex);

            sequenceIndex++;

            if (_.isUndefined(typeof curSequence.duration) === true || _.isNaN(

                curSequence.duration) === true || curSequence.duration === 0) {
                if (sequenceIndex === sequencesCount) {
                    io.sockets.in(gameId).emit(curSequence.action + 'TEComplete', curStepIndex);
                    io.sockets.in(gameId).emit('TEComplete');
                } else {
                    io.sockets.in(gameId).emit(curSequence.action + 'TEComplete', curStepIndex);
                    startSequence(sequenceIndex);
                }
            
            } else {
                
                timerOnTick = function(totalTime, currentTime) {
                    var data = {
                        stepIndex: curStepIndex,
                        currentTime: currentTime,
                        totalTime: totalTime
                    };
                    console.log(curSequence.action + ' tick:' + currentTime + '/' + totalTime);
                    io.sockets.in(gameId).emit(curSequence.action + 'TETick', data);
                };
                if (sequenceIndex === sequencesCount) {
                    timerOnComplete = function() {
                        io.sockets.in(gameId).emit(curSequence.action + 'TEComplete', curStepIndex);
                        io.sockets.in(gameId).emit('TEComplete');
                    };
                } else {
                    timerOnComplete = function() {
                        io.sockets.in(gameId).emit(curSequence.action + 'TEComplete', curStepIndex);
                        startSequence(sequenceIndex);
                    };
                }

                myTimer = new Timer((curSequence.duration * 1000), 'countdown', timerOnComplete, timerOnTick);
                myTimer.start();
            }
        }

        // Fonction à revoir car elle ne renvoie que le premier niveau de l'étape en cours.
        // Suffisant pour livequizz
        function getStepIndex(sequenceStep) {
            return parseInt(sequenceStep.substr(0, 1), 10);
        }
    }
}
