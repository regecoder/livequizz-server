// self-adjusting timer
// http://www.sitepoint.com/creating-accurate-timers-in-javascript/
//
// duration: durée en ms
// resolution: nombre de pulsations par s
// oninstance: callback sur la pulsation
// oncomplete: callback à la fin
//
// type: realtime, seconde, countdown

'use strict';

module.exports = Timer;

function Timer(duration, type, onComplete, onTick)
{
    var resolution = 5;

    var steps = (duration / 100) * (resolution / 10),
        speed = duration / steps,
        count = 0,
        countBySeconde = 0,
        durationBySeconde = duration / 1000,
        timeout;

    this.start = function () {
        var start = new Date().getTime();
        timeout = setTimeout(tick, speed, start);
        console.log('timer start');
    };

    this.stop = function () {
        clearTimeout(timeout);
        console.log('timer stop');
    };

    function tick(start) {

        var diff;

        count++;
        if (type === 'realtime') {
            if (typeof onTick === 'function') {
                onTick(steps, count);
            }
        } else {
            diff = parseInt((new Date().getTime() - start) / 1000, 10);
            if (count === 1 || diff > countBySeconde) {
                countBySeconde = diff;
                if (type === 'countdown') {
                    diff = (durationBySeconde) - diff;
                }
                if (typeof onTick === 'function') {
                    onTick(durationBySeconde, diff);
                }
            }
        }

        if (count === steps) {
            console.log('timer complete');
            onComplete();
            return;
        } else {
            diff = (new Date().getTime() - start) - (count * speed);
            setTimeout(tick, (speed - diff), start);
        }
    }
}
