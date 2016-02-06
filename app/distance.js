// distance between 2 positions
// uses 'Spherical Law of Cosines' formula
// http://www.movable-type.co.uk/scripts/latlong.html

'use strict';

module.exports = distance;

function distance(position1, position2) {

    var earthRadius = 6371000;

    var degreeToRadian = function (degree) {
        return degree * Math.PI / 180;
    };

    return Math.acos(Math.sin(degreeToRadian(position1.latitude)) * Math.sin(degreeToRadian(position2.latitude)) + Math.cos(degreeToRadian(position1.latitude)) * Math.cos(degreeToRadian(position2.latitude)) * Math.cos(degreeToRadian(position2.longitude - position1.longitude))) * earthRadius;
}
