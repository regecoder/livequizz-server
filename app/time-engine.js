'use strict';

module.exports = TimeEngine;

function TimeEngine(gameId, scenario, Timer, scope, io, _) {

    this.start = start;

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
            curSequenceStep = sequenceStep + i.toString() + '/';
            if (_.isUndefined(curSequence.scene) === true) {
                if (_.isUndefined(typeof curSequence.action) === false && curSequence.action !== '') {
                    curSequence.sequenceStep = curSequenceStep;
                    console.log(curSequence.sequenceStep + '/' + curSequence.action);
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
        console.log('quizEngine start');

        var sequencesCount,
            sequenceIndex;

        sequencesCount = sequences.length;
        sequenceIndex = 0;

        io.sockets.in(gameId).emit('timeEngineStart');

        startSequence(sequenceIndex);

        function startSequence(sequenceIndex) {

            var curSequence,
                myTimer,
                timerOnTick,
                timerOnComplete;

            curSequence = sequences[sequenceIndex];
            io.sockets.in(gameId).emit('timeEngineSequenceStart', curSequence);
            // Execute action
            scope[curSequence.action].call(scope, gameId, curSequence);

            sequenceIndex++;

            if (_.isUndefined(typeof curSequence.ration) === true || _.isNaN(curSequence.duration) === true || curSequence.duration === 0) {
                if (sequenceIndex === sequencesCount) {
                    io.sockets.in(gameId).emit('timeEngineSequenceComplete', curSequence);
                    io.sockets.in(gameId).emit('timeEngineComplete');
                } else {
                    io.sockets.in(gameId).emit('timeEngineSequenceComplete', curSequence);
                    startSequence(sequenceIndex);
                }
            } else {
                timerOnTick = function(totalLength, curLength) {
                    console.log('quizEngine tick:' + curLength + '/' + totalLength);
                    io.sockets.in(gameId).emit('timeEngineSequenceTick', curSequence, totalLength, curLength);
                };
                if (sequenceIndex === sequencesCount) {
                    timerOnComplete = function() {
                        io.sockets.in(gameId).emit('timeEngineSequenceComplete', curSequence);
                        io.sockets.in(gameId).emit('timeEngineComplete');
                    };
                } else {
                    timerOnComplete = function() {
                        io.sockets.in(gameId).emit('timeEngineSequenceComplete', curSequence);
                        startSequence(sequenceIndex);
                    };
                }
                console.log('QuizEngine start timer');
                myTimer = new Timer((curSequence.duration * 1000), 'countdown', timerOnComplete, timerOnTick);
                myTimer.start();
            }
        }
    }
}
