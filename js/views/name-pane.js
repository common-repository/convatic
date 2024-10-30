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