( function( window, Backbone, $, _, Convatic, undefined ) {

	"use strict";
	var document = window.document;

	Convatic.Views.LoginPane = Backbone.View.extend( {

		el : '.login-pane',
		events : {
			'click #cv-login' : 'triggerLoginWindow'
		},

		initialize : function() {
			this.listenTo( this.model, 'change:current_user', this.render );
		},

        handleLoginMessage : function( message ) {
            var login_popup = this.model.get( 'login_popup' );

            if ( login_popup != null ) {
                login_popup.close();

                if ( message.current_user && message.current_user != 'false' ) {
                    this.model.setCurrentUser( message.current_user, true );
                }

                this.model.set( 'login_popup', null );
            }
        },

		triggerLoginWindow : function() {
			this.model.trigger( 'launchLoginWindow' );
        },

		render : function() {
			var current_user = this.model.get( 'current_user' );

			if ( current_user && current_user.password_status === 1 ) {
				this.$el.fadeIn();
			} else {
				this.$el.fadeOut();
			}

			return this;
		}

	} );

} )( window, Backbone, jQuery, _, Convatic );