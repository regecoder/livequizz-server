(function($, window, document, app) {

    'use strict';

    app.userPseudoScreen = {

            // Le magicName est utilisé pour accéder au dossier associé
            // A manipuler avec précaution
            // view: magicName/magicName.html
            // script: magicName/magicName.js
            magicName: 'user_pseudo/user_pseudo',

            // transition: {
            //     animation: 'slide'
            // },

            init: function() {
                $(document).on('click', '#submit-button', this.submit);
            },

            display: function() {
                var view = app.getScreenViewFile(this.magicName);
                app.onsNavigator.pushPage(view);
            },

            submit: function() {
                var data = {
                    userPseudo : $('#pseudo-input').val()
                };
                app.onsNavigator.pushPage('index2.html', data);
                // var data = {
                //     userPseudo : $('#pseudo-input').val()
                // };
                // app.socket.emit('userPseudoSubmit', data);
            },
    };

})(jQuery, window, document, livequizzApp);
