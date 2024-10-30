( function( window, Backbone, $, _, Convatic, undefined ) {

	"use strict";
	var document = window.document;

	Convatic.Views.CommentFrame = Backbone.View.extend( {

		el : '#cv-comment-frame',

		initialize : function() {
            this.$el.attr( 'src', this.$el.attr( 'src' ) + '#' + encodeURIComponent( document.location.href ) );
			this.model.on( 'initLogout', _.bind( this.initLogout, this ) );
			this.listenTo( this.model, 'change:form_errors', this.handleError );
			this.model.on( 'commentCreated', _.bind( this.handleCreatedComment, this ) );
            this.model.on( 'reInitializeSocket', _.bind( this.syncCommentText, this ) );
		},

        syncCommentText : function() {
            var comment_text = this.model.get( 'comment_text' );

            if ( comment_text ) {
                var socket = this.model.get( 'socket' );
                var message = {
                    'type' : 'comment_text',
                    'comment_text' : comment_text
                };

                socket.postMessage( $.param( message ) );
            }

        },

		handleError : function() {
			var form_errors = this.model.get( 'form_errors' );

			if ( ! form_errors ) {
				this.$el.removeClass( 'cv-error' );
			} else if ( form_errors.comment ) {
				this.$el.addClass( 'cv-error' );
			}
		},

		handleCreatedComment : function() {
			this.setCommentText( '' );
		},

		initLogout : function() {
            var socket = this.model.get( 'socket' );
			var message = {
                'type' : 'logout'
            };

			socket.postMessage( $.param( message ) );
			this.model.trigger( 'logoutComplete' );
		},

		postCommentToServer : function( message ) {
            var socket = this.model.get( 'socket' );
			socket.postMessage( $.param( message ) );
		},

		handleCommentChangeMessage : function( message ) {
			this.setCommentText( message.comment_text );
		},

		setCommentText : function( comment_text ) {
			this.model.set( 'comment_text', comment_text );
		}

	} );

} )( window, Backbone, jQuery, _, Convatic );