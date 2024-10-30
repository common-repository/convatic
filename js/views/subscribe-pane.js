( function( window, Backbone, $, _, Convatic, undefined ) {

	"use strict";
	var document = window.document;

	Convatic.Views.SubscribePane = Backbone.View.extend( {

		el : '.cv-subscribe-pane',
		$el_input : null,
		subscribed_request : false,

		initialize : function() {
			this.$el_input = this.$el.find( '#cv_comment_subscribe' );
			this.listenTo( this.model, 'change:current_user', this.render );
		},

		populateSubscribeBox : function() {
			if ( this.subscribed_request != false ) {
				this.subscribed_request.abort();
			}

			var current_user = this.model.get( 'current_user' );
			var valid_email_input = this.model.get( 'valid_email_input' );

			var input_email = ( current_user.email ) ? current_user.email : valid_email_input;

			this.subscribed_request = $.ajax( {
				url : cv_data.ajaxurl,
				type : 'POST',
				data : {
					action : 'is_commenter_subscribed',
					nonce: cv_data.is_commenter_subscribed_nonce,
					commenters : [ input_email ],
					post_id: cv_data.post_id
				},
				success : _.bind( function( data ) {
				 	if ( data.completed && data.commenters[input_email] ) {
						this.$el_input.prop( 'checked', true );
					} else {
						this.$el_input.prop( 'checked', false );
					}
			 	}, this ),
			 	dataType: "json"
			} );
		},

		render : function() {
			var current_user = this.model.get( 'current_user' );
			var current_user_authorized = this.model.get( 'current_user_authorized' );

			if ( current_user !== null ) {
				if ( current_user === false ) {
					this.populateSubscribeBox();
					this.$el.show();
				} else {
					if ( current_user.password_status !== 1 ) {
						this.populateSubscribeBox();
						this.$el.show();
					} else {
						if ( current_user_authorized ) {
							this.populateSubscribeBox();
							this.$el.show();
						} else {
							this.$el.hide();
						}
					}
				}
			} else {
				this.$el.hide();
			}

			return this;
		}

	} );

} )( window, Backbone, jQuery, _, Convatic );