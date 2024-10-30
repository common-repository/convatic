( function( window, Backbone, $, _, Convatic, undefined ) {

	"use strict";
	var document = window.document;

	Convatic.Views.PasswordPane = Backbone.View.extend( {

		el : '.password-pane',
		$el_no_password : null,
		$el_added_password : null,
		add_password_popup : null,
		events : {
			'click .add-password' : 'handleAddPassword'
		},

		initialize : function() {
			this.$el_no_password = this.$el.find( '.no-password' );
			this.$el_added_password = this.$el.find( '.added-password' );

			this.listenTo( this.model, 'change:current_user', this.render );
			this.model.on( 'addPasswordComplete', _.bind( this.handleAddPasswordComplete, this ) );
		},

		handleAddPasswordComplete : function( message ) {
			this.$el_no_password.hide();
			this.$el_added_password.show();

            var password_popup = this.model.get( 'password_popup' );

            if ( password_popup != null ) {
                password_popup.close();

                this.model.set( 'password_popup', null );
            }
		},

		handleAddPassword : function() {
            this.model.trigger( 'launchPasswordWindow' );
		},

		render : function() {
			var current_user = this.model.get( 'current_user' );

			if ( current_user != null && ( current_user == false || current_user.has_active_password != 1 ) ) {
				this.$el_no_password.show();
				this.$el_added_password.hide();
			} else {
				this.$el_no_password.hide();
				this.$el_added_password.hide();
			}

			return this;
		}

	} );

} )( window, Backbone, jQuery, _, Convatic );