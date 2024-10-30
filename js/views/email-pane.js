( function( window, Backbone, $, _, Convatic, CV_Utils, undefined ) {

	"use strict";
	var document = window.document;

	Convatic.Views.EmailPane = Backbone.View.extend( {

		el : '#cv-email-pane',
        $el_logged_in : null,
		$el_logged_out : null,
		$el_input : null,
		
		events : {
			'keyup #email' : 'validateEmail',
			'click .logout' : 'handleLogout'
		},

		initialize : function() {
            this.$el_logged_in = this.$el.find( '.logged-in' );
			this.$el_logged_out = this.$el.find( '.logged-out' );
			this.$el_input = this.$el.find( '#email' );
			this.listenTo( this.model, 'change:current_user', this.render );
			this.listenTo( this.model, 'change:form_errors', this.handleError );
			this.model.on( 'logoutComplete', _.bind( this.empty, this ) );
			this.model.on( 'commentFormOpened', _.bind( this.commentFormOpened, this ) );
		},

		commentFormOpened : function() {
			var current_user = this.model.get( 'current_user' );
			var current_user_authorized = this.model.get( 'current_user_authorized' );

			if ( this.$el_input.val() && ! current_user && ! current_user_authorized ) {
				this.validateEmail();
			}
		},

		handleError : function() {
			var form_errors = this.model.get( 'form_errors' );

			if ( ! form_errors ) {
				this.$el_input.removeClass( 'cv-error' );
			} else if ( form_errors.email ) {
				this.$el_input.addClass( 'cv-error' );
			}
		},

		handleLogout : function() {
			this.model.trigger( 'initLogout' );
		},

		empty : function() {
			this.$el_input.val( '' );
		},

		validateEmail : function( event ) {
			if ( this.$el_input.val().length > 4 && CV_Utils.valid_email( this.$el_input.val() ) ) {
				this.model.set( { 'valid_email_input' : this.$el_input.val() } );
			} else {
				this.model.set( { 'valid_email_input' : false } );
			}
		},

		render : function() {
			var current_user = this.model.get( 'current_user' );
			var current_user_authorized = this.model.get( 'current_user_authorized' );

			if ( current_user_authorized && current_user != null ) {
				this.$el_logged_out.hide();
                this.$el_logged_in.show();
                this.$el_logged_in.find( 'span.email' ).html( current_user.email );
				this.$el_input.val( current_user.email );
			} else {
                this.$el_logged_in.hide();
				this.$el_logged_out.show();

				if ( this.$el_input.val().length > 4 && CV_Utils.valid_email( this.$el_input.val() ) ) {
					this.model.set( { 'valid_email_input' : this.$el_input.val() } );
				} else {
					this.model.set( { 'valid_email_input' : false } );
				}
			}

			return this;
		}

	} );

} )( window, Backbone, jQuery, _, Convatic, CV_Utils );