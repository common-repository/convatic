( function( window, Backbone, $, _, Convatic, CV_Utils, cv_data, undefined ) {

	"use strict";
	var document = window.document;

	Convatic.Views.CommentForm = Backbone.View.extend( {

		el : '#respond',
		$el_comment_parent : null,
		$el_comment_reply_button : null,
		get_commenter_info_request : false,
		last_commenter_status : null,
		reply_commenter_status : false,
        login_popup : null,
        breakpoints : {
            'mobile' : 490
        },

		initialize : function() {
			this.initializeSubViews();

			this.$el_comment_parent = this.$el.find( '#comment_parent' );

			this.model.on( 'submit', _.bind( this.submitComment, this ) );
			this.model.on( 'newComment', _.bind( this.postCommentToServer, this ) );
            this.model.on( 'launchLoginWindow', _.bind( this.launchLoginWindow, this ) );
            this.model.on( 'launchPasswordWindow', _.bind( this.launchPasswordWindow, this ) );
            this.model.on( 'frameLoaded', _.bind( this.ifMobile, this ) )
			this.listenTo( this.model, 'change:valid_email_input', this.getCommenterInfo );
			this.listenTo( this.model, 'change:comment_form_target', this.handleReply );
            this.listenTo( this.model, 'change:new_comment', this.handleNewComment );
            this.listenTo( this.model, 'change:is_mobile', this.handleIsMobile );
            this.initializeSocket();

            window.cvModel = this.model;
		},

        ifMobile : function() {
            /*if ( this.$el.width() <= this.breakpoints.mobile ) {
                this.model.set( 'is_mobile', true );
            } else {
                this.model.set( 'is_mobile', false );
            }*/
        },

        handleIsMobile : function() {
            var is_mobile = this.model.get( 'is_mobile' );

            if ( is_mobile ) {
                this.$el.addClass( 'cv-mobile' );
            } else {
                this.$el.removeClass( 'cv-mobile' );
            }
        },

        launchLoginWindow : function( event ) {
            var left = ( screen.width / 2 ) - ( 350 / 2 );
            var top = ( screen.height / 2 ) - ( 329 / 2 );
            var login_popup = window.open( 'http://www.convatic.com/sso/login-placeholder/', 'cvlogin', 'width=350, height=350, top=' + top + ', left=' + left );
            this.model.set( 'login_popup', login_popup );
            var cv = this;

            var proxy = new easyXDM.Rpc( {
                local : cv_data.absolute_uri_path + '/js/plugins/transport/name.html',
                remote : 'http://www.convatic.com/sso/login-controller/',
                remoteHelper : 'http://www.convatic.com/static/js/transport/name.html',
                onReady : function() {
                    proxy.open( 'cvlogin' );
                }
            }, {
                remote : {
                    open : {},
                    postMessage : {}
                },
                local : {
                    postMessage : function( message ) {
                        cv.receiveMessage( message );
                    }
                }
            });
        },

        launchPasswordWindow : function( event ) {
            var current_user = this.model.get( 'current_user' );
            var valid_email_input = this.model.get( 'valid_email_input' );

            var email = ( current_user.email ) ? current_user.email : valid_email_input;

            var left = ( screen.width / 2 ) - ( 350 / 2 );
            var top = ( screen.height / 2 ) - ( 329 / 2 );
            var salt = ( new Date() ).getTime();
            var password_popup = window.open( 'http://www.convatic.com/sso/password/?salt=' + salt + '&email=' + email, 'cvpassword' + salt, 'width=550, height=372, top=' + top + ', left=' + left, false );
            this.model.set( 'password_popup', password_popup );
            var cv = this;

            var proxy = new easyXDM.Rpc( {
                local : '../../js/transport/name.html',
                remote : 'http://www.convatic.com/sso/password-controller/?salt=' + salt + '&email=' + email,
                remoteHelper : 'http://www.convatic.com/static/js/transport/name.html'
            }, {
                remote : {
                    open : {},
                    postMessage : {}
                },
                local : {
                    postMessage : function( message ) {
                        cv.receiveMessage( message );
                    }
                }
            });

            proxy.open( 'cvpassword' + salt );
        },

        initializeSocket : function() {
            var current_socket = this.model.get( 'socket' );

            var frame_container = document.getElementById( 'cv-frame-container' );

            if ( current_socket !== null ) {
                current_socket.destroy();
                frame_container.innerHTML = '';
            }

           var socket = new easyXDM.Socket( {
                remote : 'http://www.convatic.com/comment/embed/form/' + cv_data.site_id + '/#' + cv_data.post_url,
                container : frame_container,
                local : '../../js/transport/name.html',
                cv : this,
                props: {
                    'id' : 'cv-comment-frame',
                    scrolling : 'no'
                },
                onMessage : function( message ) {
                    this.cv.receiveMessage( message );
                },
               onReady : function() {
                   this.cv.model.trigger( 'frameLoaded' );

                   if ( current_socket !== null ) {
                       this.cv.model.trigger( 'reInitializeSocket' );
                   }
               }
            } );

            this.model.set( 'socket', socket );
        },

		handleNewComment : function() {
			var new_comment = this.model.get( 'new_comment' );

			if ( new_comment === null ) {
				this.$el_comment_parent.val( 0 );
				this.$el.insertAfter( $( '.cv-comments' ) );
                this.initializeSocket();
				if ( this.$el_comment_reply_button !== null ) {
					this.$el_comment_reply_button.html( cv_data.reply );
				}
			}
		},

		initializeSubViews : function() {
			this.email_pane_view = new Convatic.Views.EmailPane( {
				model : this.model
			} );

			this.login_pane_view = new Convatic.Views.LoginPane( {
				model : this.model
			} );

			this.name_pane_view = new Convatic.Views.NamePane( {
				model : this.model
			} );

			this.subscribe_pane_view = new Convatic.Views.SubscribePane( {
				model : this.model
			} );

			this.url_pane_view = new Convatic.Views.UrlPane( {
				model : this.model
			} );

			this.password_pane_view = new Convatic.Views.PasswordPane( {
				model : this.model
			} );

			this.comment_button_view = new Convatic.Views.CommentButton( {
				model : this.model
			} );

			this.comment_frame_view = new Convatic.Views.CommentFrame( {
				model : this.model
			} );
		},

		handleReply : function( event ) {
			var comment_id = this.model.get( 'comment_form_target' );

			this.reply_commenter_status = true;

			if ( comment_id !== 0 ) {

				this.$el_comment_parent.val( comment_id );

				this.$el.insertAfter( $( '.cv-commentlist #cv-div-comment-' + comment_id ) );

				if ( this.$el_comment_reply_button !== null ) {
					this.$el_comment_reply_button.html( cv_data.reply );
				}

				this.$el_comment_reply_button = $( '.cv-comment-reply-link[data-comment-id=' + comment_id + ']').html( cv_data.cancel_reply );
			} else {
				this.$el_comment_reply_button.html( cv_data.reply );

				this.$el_comment_parent.val( 0 );

				this.$el.insertAfter( $( '.cv-comments' ) );
			}

            this.initializeSocket();
		},

        handleCreatedCommentError : function( message ) {
            this.model.setCurrentUser( null, false );

            this.model.set( 'last_comment_id', 0 );

            this.model.trigger( 'commentCreatedError' );
            this.model.trigger( 'formError' );
        },

		handleCreatedComment : function( message ) {
			this.model.trigger( 'commentCreated' );

			var last_comment_id = this.model.get( 'last_comment_id' );

			if ( ! last_comment_id )
				return;

			$.ajax( {
				url : cv_data.ajaxurl,
				type : 'POST',
				data : {
					action : 'created_comment',
					cv_comment_id : message.comment_id,
					wp_comment_id : last_comment_id
				},
				success : _.bind( function( data ) {
					if ( data.success && data.html ) {
						var comment = {
							html : data.html,
							comment_parent : data.comment_parent
						};

						this.model.set( { 'new_comment' : comment } );
					}
				}, this ),
			 	dataType : "json"
			} );

			this.model.set( 'last_comment_id', 0 );
		},

		postCommentToServer : function() {
			var name = this.name_pane_view.$el_input.val();
			var url = this.url_pane_view.$el_input.val();
			var comment = this.model.get( 'comment_text' );
			var email = this.email_pane_view.$el_input.val();
			var comment_parent = this.model.get( 'comment_parent' );

			var message = {
                'type' : 'new_comment',
                'email' : email,
				'author' : name,
				'url' : url,
				'ip' : cv_data.ip,
				'content' : comment,
				'post_title' : cv_data.post_title,
				'post_url' : cv_data.post_url
            };

			this.comment_frame_view.postCommentToServer( message );			
		},

		submitComment : function( event ) {
			var form_errors = {};
			var errors = 0;

			var name = this.name_pane_view.$el_input.val();
			var comment_subscribe = ( this.subscribe_pane_view.$el_input.is( ':checked' ) ) ? 1 : 0;
			var url = this.url_pane_view.$el_input.val();
			var comment = this.model.get( 'comment_text' );
			var email = this.email_pane_view.$el_input.val();

			if ( ! name ) {
				form_errors.name = 'You must include a name with your comment.';
				errors++;
			}

			if ( ! comment ) {
				form_errors.comment = 'Your comment is empty.';
				errors++;
			}

			if ( ! email ) {
				form_errors.email = 'You need to provide a valid email.';
				errors++;
			}

			if ( errors ) {
				this.model.set( { 'form_errors' : form_errors } );
                this.model.trigger( 'formError' );
			} else {
				$.ajax( {
					url : cv_data.submit_comment_url,
				 	type : 'POST',
				 	async : false,
				 	data : {
						'comment' : comment,
						'email' : email,
						'author' : name,
						'comment_parent' : this.$el_comment_parent.val(),
						'url' : url,
						'comment_post_ID' : cv_data.post_id,
						'comment_subscribe' : comment_subscribe,
						'post_url' : cv_data.post_url,
						'post_title' : cv_data.post_title,
						'json_endpoint' : 1
					},
				 	success : _.bind( function( data ) {
				 		
				 		if ( data.comment_ID ) {
				 			this.model.set( { 'last_comment_id' : data.comment_ID } );
					 		this.model.trigger( 'newComment' );
					 		this.model.set( { 'form_errors' : null } );
					 	}

				 	}, this ),
				 	error: _.bind( function() {
				 		this.model.trigger( 'submitError' );
				 	}, this ),
				 	dataType : "json"
				} );
			}
		},

		handleCommenterStatusMessage : function( message ) {
            if ( message.current_user != 'false' ) {
				this.model.setCurrentUser( message.current_user, true );
			} else {
				this.model.setCurrentUser( null, false );
			}

			this.model.trigger( 'commentFormOpened' );

			this.open();
		},

		receiveMessage : function( message ) {

            message = CV_Utils.deparam( message );
			var message_type = message.type;

			if ( message_type == 'commenter_status' ) {
				if ( ! this.reply_commenter_status ) {
					this.handleCommenterStatusMessage( message );
				} else {
					this.reply_commenter_status = false;
				}
			} else if ( message_type == 'login' ) {
				this.login_pane_view.handleLoginMessage( message );
			} else if ( message_type == 'comment_change' ) {
				this.comment_frame_view.handleCommentChangeMessage( message );
			} else if ( message_type == 'comment_created' ) {
				this.handleCreatedComment( message );
			} else if ( message_type == 'add_password_complete' ) {
                this.password_pane_view.handleAddPasswordComplete( message );
            } else if ( message_type == 'comment_created_error' ) {
                this.handleCreatedCommentError( message );
            }
		},

		getCommenterInfo : function() {
			var valid_email_input = this.model.get( 'valid_email_input' );

			if ( this.get_commenter_info_request !== false ) {
				this.get_commenter_info_request.abort();
			}

			if ( valid_email_input !== false ) {

				if ( this.get_commenter_info_request !== false ) {
					this.get_commenter_info_request.abort();
				}

				this.get_commenter_info_request = $.ajax( {
					url : cv_data.ajaxurl,
					type : 'POST',
					data : {
						action : 'get_commenter_info',
						commenters : [ valid_email_input ],
						force_refresh : true, // we are going to force this commenter to be grabbed remotely
					},
				 	success : _.bind( function( data, textStatus, jqXHR ) {
				 		if ( data.completed && data.commenters ) {
					 		if ( data.commenters[valid_email_input] ) {
					 			this.model.setCurrentUser( data.commenters[valid_email_input], false );
					 		} else {
					 			this.model.setCurrentUser( false, false );
					 		}
				 		} else {
				 			this.model.setCurrentUser( null, false );
				 		}
			 		}, this ),
			 		error : _.bind( function( jqXHR, textStatus ) {
			 			if ( textStatus != 'abort' ) {
							this.model.setCurrentUser( false, false );
						}
			 		}, this ),
			 		dataType: "json"
				} );
			} else {
				this.model.setCurrentUser( null, false );
			}
		},

		open : function() {
            this.$el.show();
		},

		close : function() {
			this.$el.hide();
		}

	} );

} )( window, Backbone, jQuery, _, Convatic, CV_Utils, cv_data );
