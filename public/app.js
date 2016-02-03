var livequizzApp = {
    folders: {
        app: 'app',
        styles: 'assets/styles',
        images: 'assets/images'
    }
};

(function($, window, document, app) {

    'use strict';

    // On charge d'abord Onsen UI, puis jQuery
    // Cet ordre est nécessaire pour le fonctionnement de l'application
    ons.bootstrap();
    ons.ready(function() {
        $(document).ready(init);
    });

    var init = function () {

        app.socket = io.connect();
        // On lie la variable html du navigateur Onsen UI à son équivalent javascript
        app.onsNavigator = ons_navigator;
        showScreen(app.userPseudoScreen);
    };

    var showScreen = function(screen) {
        screen.init();
        screen.display();
    };

    app.getScreenViewFile = function(magicName) {
        return app.folders.app + '/' + magicName + '.html';
    };

})(jQuery, window, document, livequizzApp);
