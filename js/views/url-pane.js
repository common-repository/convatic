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
