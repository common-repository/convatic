( function( window, Backbone, $, _, Convatic, undefined ) {

	"use strict";
	var document = window.document;

	Convatic.Views.CommentApp = Backbone.View.extend( {

		el : '#convatic',

		initialize : function() {
			this.initializeSubViews();
		},

		initializeSubViews : function() {
			this.comment_app_model = new Convatic.Models.CommentApp();

			this.comment_form_view = new Convatic.Views.CommentForm( {
				model : this.comment_app_model
			} );

			this.comment_list_view = new Convatic.Views.CommentList( {
				model : this.comment_app_model
			} );
		}

	} );

} )( window, Backbone, jQuery, _, Convatic );