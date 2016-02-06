'use strict';

module.exports = routes;

function routes(app, root) {
    app.get('/', function(req, res) {
        res.sendfile(root + '/public/index.html');
    });

    app.get('*', function(req, res) {
        res.redirect('/');
    });
}
