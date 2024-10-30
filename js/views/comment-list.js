( function( window, Backbone, $, _, Convatic, undefined ) {

	"use strict";
	var document = window.document;

	Convatic.Views.CommentList = Backbone.View.extend( {

		el : '.cv-comments',
		$el_comment_list : null,
		$comment_parent : null,
		$comment_number : null,

		events : {
			'click .cv-comment-reply-link' : 'handleReply',
			'click .cv-author-name' : 'handleProfileShow',
			'click .cv-author-name .cv-author-details .close' : 'handleProfileClose'
		},

		initialize : function() {
			this.$el_comment_list = this.$el.find( '.cv-commentlist' );
			this.$comment_parent = this.$el.find( '#comment_parent' );
			this.$comment_number = this.$el.find( '.cv-list-header .cv-comment-number' );
			this.$el.on( 'click', '.cv-comment-vote-action', _.bind( this.handleVote, this ) );
			this.listenTo( this.model, 'change:new_comment', _.bind( this.handleNewComment, this ) );
            this.listenTo( this.model, 'change:is_mobile', this.handleIsMobile );
			this.render();

			if ( cv_data.do_commenter_sync ) {
				this.sync();
			}
		},

        handleIsMobile : function() {
            var is_mobile = this.model.get( 'is_mobile' );

            if ( is_mobile ) {
                this.$el.addClass( 'cv-mobile' );
            } else {
                this.$el.removeClass( 'cv-mobile' );
            }
        },

		sync : function() {
			var emails = {};

			// First get all the emails so we can do this in one API request
			this.$el.find( '.cv-commenter-score' ).each( function() {

				var email = $( this ).attr( 'data-cv-commenter-email' );

				if ( email ) {
					emails[email] = email;
				}

			} );

			// Grab latest commenter information
			$.ajax( {
				url: cv_data.ajaxurl,
			 	type: 'POST',
			 	data: {
			 		action : 'get_commenter_info',
			 		force_refresh : true,
			 		commenters : emails
			 	},
			 	success: _.bind( function( data ) {
			 		if ( data.completed && data.commenters ) {
			 			
				 		// Let's update with the new commenter scores
				 		$.each( data.commenters, _.bind( function( email, commenter ) {
				 			if ( commenter.score ) {
				 				this.$el.find( '.cv-commenter-score[data-cv-commenter-email="' + email + '"]' ).html( commenter.score );
				 			}

				 			if ( commenter.total_comments ) {
				 				this.$el.find( '.cv-total-comments[data-cv-commenter-email="' + email + '"]' ).html( commenter.total_comments );
				 			}
				 		}, this ) );
				 	}
			 	}, this ),
			 	dataType: "json"
			} );
		},

		handleProfileShow : function( event ) {
			$( '.cv-author-details' ).hide();

			$( event.target ).parent().find( '.cv-author-details' ).show();
		},

		handleProfileClose : function( event ) {
			$( event.target ).parent().hide();
		},

		handleNewComment : function() {
			var new_comment = this.model.get( 'new_comment' );

			if ( new_comment != null ) {

				if ( this.$el_comment_list.children().length < 1 ) {
					$( '.cv-no-comments' ).removeClass( 'cv-no-comments' );
				}

				var $new_comment = $( new_comment.html );
				
				if ( parseInt( new_comment.comment_parent ) >= 1 ) {
					var $parent_comment = $( '#comment-' + new_comment.comment_parent );
			 		if ( $parent_comment.length ) {
						var $parent_comment_children = $( '#comment-' + new_comment.comment_parent + ' > div.children' );

						if ( ! $parent_comment_children.length ) {
							$parent_comment_children = $( '<div class="children">' );
							$parent_comment_children.appendTo( $parent_comment );
						}

						$parent_comment_children.append( $new_comment );
					}
				} else {
					this.$el_comment_list.append( $new_comment );
				}

				this.model.set( 'new_comment', null );

				this.$comment_number.html( ( parseInt( this.$comment_number.html() ) + 1 ) );

				// Scroll to new comment
				$( 'html, body' ).animate( {
					scrollTop: $new_comment.offset().top
				}, 'fast' );

				this.model.trigger( 'commentRendered' );
			}
		},

		handleReply : function( event ) {
			var comment_form_target = this.model.get( 'comment_form_target' );
			var new_target = event.originalEvent.target.getAttribute( 'data-comment-id' );
			if ( new_target == comment_form_target ) {
				new_target = 0;
			}

			this.model.set( { 'comment_form_target' : new_target } );
		},

		handleVote : function( event ) {
	 		var vote_action = event.originalEvent.target.getAttribute( 'data-cv-comment-vote-action' );
	 		var cv_comment_id = event.originalEvent.target.getAttribute( 'data-cv-comment-id' );
	 		var wp_comment_id = event.originalEvent.target.getAttribute( 'data-wp-comment-id' );
	 		var commenter_email = event.originalEvent.target.getAttribute( 'data-cv-commenter-email' );
	 		
	 		if ( commenter_email != undefined && commenter_email != $.cookie( 'cv_current_user' ) ) {
		 		if ( '1' == vote_action || '0' == vote_action ) {
		 			var cookie_key = 'cv_voted_on_' + cv_comment_id;

		 			// Check to see if this person has already voted
		 			if ( ! $.cookie( cookie_key ) ) {

		 				// Set cookie to say this person has voted
			 			$.cookie( cookie_key, 1, { expires: 7 } );
			 			$.ajax( {
					 		url: cv_data.ajaxurl,
					 		type: 'POST',
					 		data: {
					 			action : 'comment_vote',
					 			vote : vote_action,
					 			cv_comment_id : cv_comment_id,
					 			wp_comment_id : wp_comment_id
					 		},
					 		success: _.bind( function( data, textStatus, jqXHR ) {
					 			if ( data.rating ) {
					 				// Update front end with new rating number
					 				this.$el.find( '.cv-comment-rating[data-cv-comment-id=' + cv_comment_id + ']' ).html( data.rating );
								}
					 		}, this ),
					 		dataType: 'json'
					 	} );
		 			}
		 		}
		 	}
		},

		render : function() {
			this.open();
			return this;
		},

		open : function() {
			this.$el.show();
		},

		close : function() {
			this.$el.hide();
		}

	} );

} )( window, Backbone, jQuery, _, Convatic );