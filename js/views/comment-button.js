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