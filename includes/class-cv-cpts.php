<?php

/**
 * Register new Convatic CPT's
 */
class CV_CPTS {
	private static $_instance;

	/**
	 * Setup actions and filters. This is a singleton.
	 *
	 * @since 0.1.0
	 * @return CV_CPTS
	 */
	protected function __construct() {
		add_action( 'init', array( $this, 'action_register_commenter' ) );
	}

	/**
	 * Registers post type for commenter
	 *
	 * @since 0.1.0
	 * @return void
	 */
	public function action_register_commenter() {
		$commenter_args = array(
		  'public' => false,
		  'query_var' => false,
		  'rewrite' => false,
		  'capability_type' => 'post',
		  'has_archive' => false,
		  'hierarchical' => false,
		  'can_export' => true,
		);
		$commenter_args = apply_filters( 'cv_cpt_args', $commenter_args );
		register_post_type( 'cv_commenter', $commenter_args );
	}

	/**
	 * Initialize class and return an instance of it
	 *
	 * @since 0.1.0
	 * @return CV_CPTS
	 */
	public static function init() {
		if ( ! isset( self::$_instance ) ) {

			self::$_instance = new CV_CPTS;
		}

		return self::$_instance;
	}
}

CV_CPTS::init();