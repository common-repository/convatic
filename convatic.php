<?php
/*
Plugin Name: Convatic
Plugin URI: http://www.convatic.com
Description: Convatic is a revolutionary social commenting system for websites. This plugin overlays and plays nicely with themes and other plugins. Convatic promotes and engages visitors turning websites into vibrant communities.
Author: Convatic
Version: 0.1.0
Author URI: http://www.convatic.com
*/

require_once( dirname( __FILE__ ) . '/includes/class-cv-convatic.php' );

/**
 * Do stuff on plugin activation
 *
 * @since 0.1.0
 * @return void
 */
function cv_activation() {
	
	/**
	 * Jetpack automatically adds to notification fields to the comment form. These
	 * fields are not compadible with the plugin. Let's disable them.
	 */
	update_option( 'stc_enabled', 0 );
	update_option( 'stb_enabled', 0 );
}
register_activation_hook( __FILE__, 'cv_activation' );