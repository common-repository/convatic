( function( $, window ) {
	var CV_Utils = function() {

		/**
		 * Returns true if an email is valid
		 */
		this.valid_email = function( email ) { 
			var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
			return re.test( email );
		};

        this.deparam = function( params, coerce ) {
            var obj = {},
            coerce_types = { 'true': !0, 'false': !1, 'null': null };

            // Iterate over all name=value pairs.
            $.each( params.replace( /\+/g, ' ' ).split( '&' ), function(j,v){
                var param = v.split( '=' ),
                    key = decodeURIComponent( param[0] ),
                    val,
                    cur = obj,
                    i = 0,
                    keys = key.split( '][' ),
                    keys_last = keys.length - 1;

                if ( /\[/.test( keys[0] ) && /\]$/.test( keys[ keys_last ] ) ) {
                     // Remove the trailing ] from the last keys part.
                    keys[ keys_last ] = keys[ keys_last ].replace( /\]$/, '' );

                    keys = keys.shift().split('[').concat( keys );

                    keys_last = keys.length - 1;
                } else {
                    keys_last = 0;
                }

                if ( param.length === 2 ) {
                    val = decodeURIComponent( param[1] );

                    // Coerce values.
                    if ( coerce ) {
                        val = val && !isNaN(val)            ? +val              // number
                            : val === 'undefined'             ? undefined         // undefined
                            : coerce_types[val] !== undefined ? coerce_types[val] // true, false, null
                            : val;                                                // string
                    }

                    if ( keys_last ) {
                        for ( ; i <= keys_last; i++ ) {
                            key = keys[i] === '' ? cur.length : keys[i];
                            cur = cur[key] = i < keys_last ? cur[key] || ( keys[i+1] && isNaN( keys[i+1] ) ? {} : [] ) : val;
                        }

                    } else {

                        if ( $.isArray( obj[key] ) ) {
                            // val is already an array, so push on the next value.
                            obj[key].push( val );

                        } else if ( obj[key] !== undefined ) {
                            // val isn't an array, but since a second value has been specified,
                            // convert val into an array.
                            obj[key] = [ obj[key], val ];

                        } else {
                            obj[key] = val;
                        }
                    }

                } else if ( key ) {
                    obj[key] = coerce ? undefined : '';
                }
            } );

            return obj;
        };
	};

	window.CV_Utils = new CV_Utils();
} )( jQuery, window );
( function( window, $, _, Backbone, undefined ) {

	"use strict";
	var document = window.document;

	function Convatic() {

		var _Models = {};

		var _Routers = {};

		var _Views = {};

		return {
			Models : _Models,
			Routers : _Routers,
			Views : _Views
		};
	}

	window.Convatic = new Convatic();

} )( window, jQuery, _, Backbone );
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
( function( window, Backbone, $, _, Convatic, undefined ) {

	"use strict";
	var document = window.document;

	Convatic.Views.CommentButton = Backbone.View.extend( {

		el : '#submit',
		$spinner_image : null,

		events : {
			"click" : 'submit'
		},

		initialize : function() {
			this.$el.prop( 'disabled', true );
			this.model.on( 'newComment', _.bind( this.disable, this ) );
            this.model.on( 'commentCreated', _.bind( this.enable, this ) );
            this.model.on( 'commentCreatedError', _.bind( this.enable, this ) );
			this.model.on( 'commentRendered', _.bind( this.hideSpinner, this ) );
            this.model.on( 'submitError', _.bind( this.hideSpinner, this ) );
            this.model.on( 'formError', _.bind( this.hideSpinner, this ) );
            this.listenTo( this.model, 'change:is_mobile', this.handleIsMobile );
			this.listenTo( this.model, 'change:current_user', this.render );

			this.$spinner_image = $( '<img class="cv-spinner" src="' + cv_data.spinner_img + '" width="16" height="16" />' );
			this.$el.before( this.$spinner_image );
		},

        handleIsMobile : function() {
            var is_mobile = this.model.get( 'is_mobile' );

            if ( is_mobile ) {
                this.$el.val( cv_data.mobile_submit_text );
            } else {
                this.$el.val( cv_data.desktop_submit_text );
            }
        },

		disable : function() {
			this.$el.prop( 'disabled', true );
		},

		enable : function() {
			this.$el.prop( 'disabled', false );
		},

		render : function() {
			var current_user = this.model.get( 'current_user' );

			if ( current_user !== null ) {
				if ( current_user && current_user.password_status === 1 ) {
					this.disable();
				} else {
					this.enable();
				}
				
			} else {
				this.disable();
			}

			return this;
		},

		showSpinner : function() {
			this.$spinner_image.animate( { 'opacity' : 1 }, 'slow' );
		},

		hideSpinner : function() {
			this.$spinner_image.animate( { 'opacity' : 0 }, 'slow' );
		},

		submit : function( event ) {
			this.showSpinner();
			
			this.model.trigger( 'submit' );

			event.preventDefault();
		}

	} );

} )( window, Backbone, jQuery, _, Convatic );
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
( function( window, Backbone, $, _, Convatic, undefined ) {

	"use strict";
	var document = window.document;

	Convatic.Views.NamePane = Backbone.View.extend( {

		el : '.name-pane',
		$el_edit_text : null,
		$el_input_holder : null,
		$el_input : null,

		events : {
			'click .edit-name' : 'editName',
		},

		initialize : function() {
			this.listenTo( this.model, 'change:current_user', this.render );
			this.listenTo( this.model, 'change:form_errors', this.handleError );

			this.$el_edit_text = this.$el.filter( '.fixed-name-holder' );
			this.$el_input_holder = this.$el.filter( '.edit-name-holder' );
			this.$el_input = this.$el.find( '#author' );
		},

		handleError : function() {
			var form_errors = this.model.get( 'form_errors' );

			if ( ! form_errors ) {
				this.$el_input.removeClass( 'cv-error' );
			} else if ( form_errors.name ) {
				this.$el_input.addClass( 'cv-error' );
			}
		},

		editName : function() {
			this.$el_input_holder.show();
			this.$el_edit_text.hide();
		},

		render : function() {
			var current_user = this.model.get( 'current_user' );
			var current_user_authorized = this.model.get( 'current_user_authorized' );

			if ( current_user !== null ) {

				this.$el_edit_text.find( 'span' ).html( current_user.name );
				this.$el_input.val( current_user.name );

				if ( current_user === false ) {
					this.$el_input_holder.show();
					this.$el_edit_text.hide();
				} else {

					if ( current_user.password_status !== 1 ) {
						if ( current_user.name ) {
							this.$el_input_holder.hide();
							this.$el_edit_text.show();
						} else {
							this.$el_edit_text.hide();
							this.$el_input_holder.show();
						}
					} else {
						if ( current_user_authorized ) {
							if ( current_user.name ) {
								this.$el_input_holder.hide();
								this.$el_edit_text.show();
							} else {
								this.$el_edit_text.hide();
								this.$el_input_holder.show();
							}
						} else {
							this.$el_input_holder.hide();
							this.$el_edit_text.hide();
						}
					}

				}

			} else {
				this.$el_input_holder.hide();
				this.$el_edit_text.hide();
			}

			return this;
		},

	} );

} )( window, Backbone, jQuery, _, Convatic );
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
( function( window, Backbone, $, _, Convatic, undefined ) {

	"use strict";
	var document = window.document;

	Convatic.Views.UrlPane = Backbone.View.extend( {

		el : '.url-pane',
		$el_edit_text : null,
		$el_add_text : null,
		$el_input_holder : null,
		$el_input : null,

		events : {
			'click .add-site' : 'editSite',
			'click .edit-site' : 'editSite',
		},

		initialize : function() {
			this.listenTo( this.model, 'change:current_user', this.render );

			this.$el_edit_text = this.$el.filter( '.edit-site-holder' );
			this.$el_add_text = this.$el.filter( '.cv-add-site-holder' );
			this.$el_input_holder = this.$el.filter( '.url-holder' );
			this.$el_input = this.$el.find( '#url' );
		},

		editSite : function() {
			this.$el_add_text.hide();
			this.$el_edit_text.hide();
			this.$el_input_holder.show();
		},

		render : function() {
			var current_user = this.model.get( 'current_user' );
			var current_user_authorized = this.model.get( 'current_user_authorized' );

			if ( current_user !== null ) {

				this.$el_edit_text.find( '.current-site' ).attr( 'href', current_user.url );
				this.$el_input.val( current_user.url );

				if ( current_user === false ) {
					this.$el_add_text.show();
					this.$el_input_holder.hide();
					this.$el_edit_text.hide();
				} else {

					if ( current_user.password_status !== 1 ) {
						if ( current_user.url ) {
							this.$el_edit_text.show();
							this.$el_input_holder.hide();
							this.$el_add_text.hide();
						} else {
							this.$el_add_text.show();
							this.$el_input_holder.hide();
							this.$el_edit_text.hide();
						}
					} else {
						if ( current_user_authorized ) {
							if ( current_user.url ) {
								this.$el_add_text.hide();
								this.$el_input_holder.hide();
								this.$el_edit_text.show();
							} else {
								this.$el_add_text.hide();
								this.$el_edit_text.hide();
								this.$el_input_holder.hide();
							}
						} else {
							this.$el_add_text.hide();
							this.$el_edit_text.hide();
							this.$el_input_holder.hide();
						}
					}

				}

			} else {
				this.$el_input_holder.hide();
				this.$el_edit_text.hide();
				this.$el_add_text.hide();
			}

			return this;
		},

	} );

} )( window, Backbone, jQuery, _, Convatic );

( function( Convatic, window, $, undefined ) {

	"use strict";
	var document = window.document;

	$( document ).ready( function() {

		new Convatic.Views.CommentApp();

	} );

} )( Convatic, window, jQuery );