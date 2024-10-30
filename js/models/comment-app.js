( function( window, Backbone, $, _, Convatic, undefined ) {

	"use strict";
	var document = window.document;

	Convatic.Models.CommentApp = Backbone.Model.extend( {

		defaults : function() {
			return {
				'current_user' : null,
				'comment_text' : '',
				'current_user_authorized' : false,
				'valid_email_input' : false,
				'last_comment_id' : 0,
				'comment_form_target' : 0,
				'new_comment' : null,
				'form_errors' : null,
                'socket' : null,
                'login_popup' : null,
                'password_popup' : null,
                'is_mobile' : false
			};
		},

		setCurrentUser : function( current_user, authorized ) {
			if ( current_user && current_user.email ) {
				$.cookie( 'cv_current_user', current_user.email, { expires: 7 } );
			}
			
			this.set( { 'current_user' : current_user, 'current_user_authorized' : authorized } );
		}

	} );

} )( window, Backbone, jQuery, _, Convatic );
