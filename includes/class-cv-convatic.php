<?php
/**
 * Define plugin constants
 */
define( 'CV_SERVER_NEW_COMMENT_ENDPOINT', 'http://www.convatic.com/api/comment/create/' );
define( 'CV_SERVER_DELETE_COMMENT_ENDPOINT', 'http://www.convatic.com/api/comment/delete/' );
define( 'CV_SERVER_VOTE_COMMENT_ENDPOINT', 'http://www.convatic.com/api/comment/vote/' );
define( 'CV_SERVER_COMMENTER_LOOKUP_ENDPOINT', 'http://www.convatic.com/api/commenter/lookup/' );

define( 'CV_SERVER_VALID_API_ENDPOINT', 'http://www.convatic.com/api/valid/' );
define( 'CV_OPTION_NAME', 'convatic' );

global $cv_option_defaults;
$cv_option_defaults = array( 'api_key' => '', 'sync_window' => 5, 'cache_size' => 500, 'site_id' => 0 );

/**
 * Include dependencies
 */
require_once( 'cv-functions.php' );
require_once( 'class-cv-cpts.php' );
require_once( 'class-cv-communication.php' );
require_once( 'class-cv-ajax.php' );

class CV_Convatic {

	private static $_instance;

	/**
	 * Setup actions and filters. This is a singleton.
	 *
	 * @since 0.1.0
	 * @return CV_Convatic
	 */
	protected function __construct() {
		add_action( 'admin_menu', array( $this, 'action_admin_menu' ) );
		add_action( 'admin_init', array( $this, 'action_admin_init' ) );

		// Only use plugin if valid API key
		
		if ( cv_valid_api_key() && ! wp_is_mobile() ) {
			add_filter( 'comments_template', array( $this, 'filter_comments_template' ) );
			add_action( 'wp_enqueue_scripts', array( $this, 'action_enqueue_styles' ) );
            add_action( 'wp_print_scripts', array( $this, 'action_print_scripts' ) );
			add_action( 'wp_enqueue_scripts', array( $this, 'action_enqueue_scripts' ) );
			add_action( 'comment_form_logged_in', array( $this, 'filter_comment_form_logged_in' ) );
			add_filter( 'comment_form_defaults', array( $this, 'filter_comment_form_defaults' ), 100, 1 );
			add_action( 'wp_insert_comment', array( $this, 'action_process_comment_subscription' ), 10, 2 );
			add_action( 'comment_form', array( $this, 'action_comment_form' ), 100, 0 );
			add_action( 'set_comment_cookies', array( $this, 'action_set_comment_cookies' ), 100, 2 );
			add_action( 'pre_comment_on_post', array( $this, 'action_pre_comment_on_post' ), 10, 1 );
			add_action( 'comment_unapproved_to_approved', array( $this, 'action_approved_comment' ), 10, 1 );
            add_action( 'wp_head', array( $this, 'add_ie_html5_shim' ), 0 );
		} else {
			add_action( 'admin_notices', array( $this, 'action_admin_notices' ) );
		}
	}

    /**
     * Output easyXDM in the header. We use this action because of json2.js
     *
     * @since 0.1.0
     * @return void
     */
    function action_print_scripts() {
    ?>
        <script type="text/javascript" src="<?php echo plugins_url( 'js/plugins/transport/easyXDM.min.js', dirname( __FILE__ ) ); ?>"></script>
        <script>easyXDM.DomHelper.requiresJSON("<?php echo plugins_url( 'js/plugins/transport/json2.js', dirname( __FILE__ ) ); ?>");</script>
    <?php
    }

	/**
	 * Notify users that they need to configure the plugin.
	 *
	 * @since 0.1.0
	 * @return void
	 */
	public function action_admin_notices() {
	?>
		<div class="updated" id="cv-configuration-warning">
			<p><?php _e( 'Convatic needs to be <a href="' . admin_url( 'edit-comments.php?page=convatic.php' ) . '">setup</a> before commenting will work.', 'convatic' ); ?></p>
		</div>
	<?php
	}

	/**
	 * Notfy users of comments transitioning from unapproved to approved
	 *
	 * @param object $comment
	 * @since 0.1.0
	 * @return void
	 */
	public function action_approved_comment( $comment ) {
		$this->send_comment_notifications( $comment );
	}

	/**
	 * Trick WP into thinking the user is logged out. We need this so WP doesn't insert the logged in
	 * user's name and email into the comment.
	 *
	 * @param int $comment_id
	 * @since 0.1.0
	 * @return void
	 */
	public function action_pre_comment_on_post( $comment_id ) {
		global $current_user;

		$current_user = null;
		wp_set_current_user( 0 );
	}

	/**
	 * This is kind of hacky. We are using this final action in wp-comments-post.php to output JSON then exit.
	 *
	 * @param object $comment
	 * @param object $user
	 * @since 0,1
	 * @return void
	 */
	public function action_set_comment_cookies( $comment, $user ) {

		if ( empty( $_POST['json_endpoint'] ) )
			return;

		echo json_encode( $comment );
		exit;
	}

	/**
	 * Filter out logged in as text
	 *
	 * @param string $value
	 * @since 0.1.0
	 * @return string
	 */
	public function filter_comment_form_logged_in( $value ) {
		return '';
	}

	/**
	 * Send out all comment notifications for a post
	 *
	 * @param object $comment
	 * @since 0.1.0
	 * @return void
	 */
	private function send_comment_notifications( $comment ) {
		$subscriptions = (array) get_post_meta( $comment->comment_post_ID, 'cv_comment_subscription', false );

		if ( ! empty( $subscriptions ) ) {
			foreach ( $subscriptions as $s ) {
				$mail_subject = sprintf( __( 'New Comment on %s at %s', 'convatic' ), get_the_title( $comment->comment_post_ID ), get_bloginfo( 'name' ) );
				$mail_body = sprintf( __( '"%s"' . "\n\n" . 'View the full post here: %s#comment-%d', 'convatic' ), $comment->comment_content, get_permalink( $comment->comment_post_ID ), $comment->comment_ID );
				wp_mail( $s, $mail_subject, $mail_body );
			}
		}
	}

	/**
	 * Process new comment email subscriptions
	 *
	 * @param int $comment_id
	 * @param object $comment
	 * @since 0.1.0
	 * @return void
	 */
	public function action_process_comment_subscription( $comment_id, $comment ) {
		
		// Notify current subscribers
		if ( $comment->comment_approved === 1 ) {
			$this->send_comment_notifications( $comment );
		}

		// Check if email exists just in case
		if ( ! empty( $comment->comment_author_email ) ) {

			if ( ! empty( $_POST['comment_subscribe'] ) ) {
				$subscriptions = (array) get_post_meta( $comment->comment_post_ID, 'cv_comment_subscription', false );
				
				// Add new subscriber
				$exists = false;
				foreach ( $subscriptions as $s ) {
					if ( $s == $comment->comment_author_email )
						$exists = true;
				}

				if ( ! $exists )
					add_post_meta( $comment->comment_post_ID, 'cv_comment_subscription', $comment->comment_author_email );

			} else {
				// Unsubscribe if email is subscribed
				delete_post_meta( $comment->comment_post_ID, 'cv_comment_subscription', $comment->comment_author_email );
			}
		}

	}

	/**
	 * Rebuild comment form
	 *
	 * @param array $defaults
	 * @since 0.1.0
	 * @return array
	 */
	public function filter_comment_form_defaults( $defaults ) {
		$defaults['comment_notes_before'] = '';

		$option = cv_get_option();

		ob_start();
	?>
		<div class="cv-comment-form-comment">
            <div id="cv-frame-container"></div>
			<div class="comment-field-bottom">
				<div id="cv-email-pane">
					<div class="logged-out"> 
						<input placeholder="<?php _e( '* Email', 'convatic' ); ?>" id="email" name="email" type="text" aria-required="true" />
					</div>
                    <div class="logged-in">
                        <span class="cv-pre-email"><?php _e( 'You are logged in as ', 'convatic' ); ?></span>
                        <span class="email"></span>
                        <a class="logout"><?php _e( '(logout)', 'convatic' ); ?></a>
                    </div>
				</div>
	<?php

		$defaults['comment_field'] = ob_get_clean();

		$defaults['comment_notes_after'] = '';

		return $defaults;
	}

	/**
	 * Output lower part of comment form
	 *
	 * @since 0.1.0
	 * @return void
	 */
	public function action_comment_form() {

	?>
			</div>
		</div>
		
		<div class="cv-comment-fields">
            <div class="login-button-wrapper login-pane cv-right">
                <input type="button" value="<?php _e( 'Login', 'convatic' ); ?>" id="cv-login" />
            </div>
            <div class="fixed-name-holder name-pane cv-right"><?php _e( 'Posting as', 'convatic' ); ?> <span class="current-name">{name}</span> <a class="edit-name">(<?php _e( 'Edit', 'convatic' ); ?>)</a></div>
            <div class="edit-name-holder name-pane cv-right">
                <input placeholder="<?php _e( 'Name', 'convatic' ); ?>" id="author" name="author" type="text" aria-required="true" />
            </div>
            <div class="cv-subscribe-pane cv-right">
                <label for="cv_comment_subscribe">
                    <input id="cv_comment_subscribe" type="checkbox" name="cv_comment_subscribe" value="1" />
                    <?php _e( 'Notify me of new comments', 'convatic' ); ?>
                </label>
            </div>

            <div class="cv-login-message login-pane cv-left">
                <?php _e( 'This email requires you to login. <a href="http://www.convatic.com/accounts/password_reset"  class="forgot-password">Forget your password?</a>', 'convatic' ); ?>
            </div>

            <div class="url-holder url-pane cv-left">
                <input placeholder="<?php _e( 'Website', 'convatic' ); ?>" id="url" name="url" type="text" />
            </div>
            <div class="cv-add-site-holder url-pane cv-left">
                <a class="add-site"><?php _e( '+ Add your website', 'convatic' ); ?></a>
            </div>
            <div class="edit-site-holder url-pane cv-left">
                <a class="current-site"><?php _e( 'Link', 'convatic' ); ?></a> <a class="edit-site">(<?php _e( 'Edit', 'convatic' ); ?>)</a>
            </div>

            <div class="cv-password-message password-pane cv-left">
                <div class="no-password">
                    <?php _e( "This email isn't associated with a password. However, you can <a class='add-password'>add a password</a> to make sure no one else posts as you.", 'convatic' ); ?>
                </div>
                <div class="added-password">
                    <?php _e( "The password you entered will not go into effect until you click the confirmation link emailed to you.", 'convatic' ); ?>
                </div>
            </div>
		</div>
	<?php
	}

	/**
	 * Enqueue front end styles
	 *
	 * @since 0.1.0
	 * @return void
	 */
	public function action_enqueue_styles() {
		if ( ! is_single() )
			return;

		if ( file_exists( STYLESHEETPATH . '/convatic/css/convatic.css' ) )
			$css_url = get_stylesheet_directory_uri() . '/convatic/css/convatic.css';
		elseif ( file_exists( STYLESHEETPATH . '/convatic/convatic.css' ) )
			$css_url = get_stylesheet_directory_uri(). '/convatic/convatic.css';
		elseif ( file_exists( TEMPLATEPATH . '/convatic/css/convatic.css' ) )
			$css_url = get_template_directory_uri() . '/convatic/css/convatic.css';
		elseif ( file_exists( TEMPLATEPATH . '/convatic/convatic.css' ) )
			$css_url = get_template_directory_uri(). '/convatic/convatic.css';
		else {
			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				$css_url = plugins_url( 'build/css/convatic.css', dirname( __FILE__ ) );
			} else {
				$css_url = plugins_url( 'build/css/convatic.css', dirname( __FILE__ ) );
			}
		}

		$css_url = apply_filters( 'cv_stylesheet_url', $css_url );

		wp_enqueue_style( 'cv-app', $css_url, '1.0' );
	}

    /**
     * Add HTML5 shim for IE
     *
     * @since 0.1.0
     * @return void
     */
    public function add_ie_html5_shim () {
        if ( ! is_single() )
            return;

        echo '<!--[if lt IE 9]>';
        echo '<script src="http://html5shim.googlecode.com/svn/trunk/html5.js"></script>';
        echo '<![endif]-->';
    }

	/**
	 * Enqueue front end scripts
	 *
	 * @since 0.1.0
	 * @return void
	 */
	public function action_enqueue_scripts() {
		if ( ! is_single() )
			return;

		global $post;

		$option = cv_get_option();

		/**
		 * We are keeping track of the last time we synced commenter info in post meta for each post,
		 * if enough time has elapsed, we will pass a var to JS which will do the sync and post back to PHP
		 * which will save the commenter info in the options table.
		 */
		$last_commenter_sync = get_post_meta( $post->ID, 'cv_last_commenter_sync', true );
		$commenter_sync = false;
		if ( empty( $last_commenter_sync ) ) {
			update_post_meta( $post->ID, 'cv_last_commenter_sync', time() );
			$commenter_sync = true;
		} else {
			if ( ( time() - $last_commenter_sync ) >= ( $option['sync_window'] * 60 ) ) {
				update_post_meta( $post->ID, 'cv_last_commenter_sync', time() );
				$commenter_sync = true;
			}
		}

		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            wp_enqueue_script( 'cv-jquery-cookie', plugins_url( 'js/plugins/jquery.cookie.js', dirname( __FILE__ ) ), array( 'backbone', 'jquery' ), '1.0', true );
            wp_enqueue_script( 'cv-expanding', plugins_url( 'js/plugins/jquery.expanding.js', dirname( __FILE__ ) ), array( 'backbone', 'jquery' ), '1.0', true );
            wp_enqueue_script( 'cv-placeholders', plugins_url( 'js/plugins/placeholders.js', dirname( __FILE__ ) ), array( 'backbone', 'jquery' ), '1.0', true );
            wp_enqueue_script( 'cv-app', plugins_url( 'build/js/app-concat.js', dirname( __FILE__ ) ), array( 'backbone', 'jquery' ), '1.0', true );
		} else {
            wp_enqueue_script( 'cv-jquery-cookie', plugins_url( 'build/js/jquery.cookie.min.js', dirname( __FILE__ ) ), array( 'backbone', 'jquery' ), '1.0', true );
            wp_enqueue_script( 'cv-expanding', plugins_url( 'build/js/jquery.expanding.min.js', dirname( __FILE__ ) ), array( 'backbone', 'jquery' ), '1.0', true );
            wp_enqueue_script( 'cv-placeholders', plugins_url( 'build/js/placeholders.min.js', dirname( __FILE__ ) ), array( 'backbone', 'jquery' ), '1.0', true );
            wp_enqueue_script( 'cv-app', plugins_url( 'build/js/app-concat.min.js', dirname( __FILE__ ) ), array( 'backbone', 'jquery' ), '1.0', true );
		}

        $parsed_plugin_url = parse_url( plugins_url( '', dirname( __FILE__ ) ) );

		$local_array = array(
			'post_id' => $post->ID,
            'site_id' => (int) $option['site_id'],
			'post_title' => get_the_title( $post->ID ),
			'post_url' => get_permalink( $post->ID ),
			'commenter_lookup_endpoint' => CV_SERVER_COMMENTER_LOOKUP_ENDPOINT,
			'ip' => $_SERVER['REMOTE_ADDR'],
			'ajaxurl' => admin_url( 'admin-ajax.php' ),
			'do_commenter_sync' => $commenter_sync,
			'submit_comment_url' => home_url( 'wp-comments-post.php' ),
			'cancel_reply' => __( 'Cancel Reply', 'convatic' ),
			'spinner_img' => home_url( 'wp-includes/images/wpspin.gif' ), 
			'reply' => __( 'Reply', 'convatic' ),
			'no_author' => __( 'Please add a name to this comment.', 'convatic' ),
			'no_comment' => __( 'Please add a comment.', 'convatic' ),
            'absolute_uri_path' => $parsed_plugin_url['path'],
            'desktop_submit_text' => __( 'Post Comment', 'convatic' ),
            'mobile_submit_text' => __( 'Comment', 'convatic' ),
		);

		wp_localize_script( 'cv-app', 'cv_data', $local_array );
	}

	/**
	 * Return convatic comments.php path or theme convatic/comments.php if it exists
	 *
	 * @since 0.1.0
     * @param string $file
	 * @return string
	 */
	public function filter_comments_template( $file ) {
		if ( file_exists( STYLESHEETPATH . '/convatic/comments.php' ) )
			return STYLESHEETPATH . '/convatic/comments.php';
		elseif ( file_exists( TEMPLATEPATH . '/convatic/comments.php' ) )
			return TEMPLATEPATH . '/convatic/comments.php';
		elseif ( file_exists( dirname( __FILE__ ) . '/template/comments.php' ) )
			return dirname( __FILE__ ) . '/template/comments.php';
		else
			return $file;
	}

	/**
	 * Add options page
	 *
	 * @since 0.1.0
	 * @return void
	 */
	public function action_admin_menu() {
		add_submenu_page( 'edit-comments.php', __( 'Convatic', 'convatic' ), __( 'Convatic', 'convatic' ), 'manage_options', 'convatic.php', array( $this, 'screen_options' ) );
	}

	/**
	 * Register setting and sanitization callback
	 * 
	 * @since 0.1.0
	 * @return void
	 */
	public function action_admin_init() {
		register_setting( CV_OPTION_NAME, CV_OPTION_NAME, array( $this, 'sanitize_options' ) );
	}

	/**
     * Sanitize options
     * 
     * @param array $options
     * @since 0.1.0
     * @return array
     */
	public function sanitize_options( $options ) {
		global $cv_option_defaults;
		
		$current_options = cv_get_option();

		$new_options = array();

		foreach ( $cv_option_defaults as $option_key => $option_default_value ) {

			if ( isset( $options[$option_key] ) )
				$new_options[$option_key] = sanitize_text_field( $options[$option_key] );
			else
				$new_options[$option_key] = $option_default_value;
		}

		// Reset valid API cache
		$site_id = cv_valid_api_key( $new_options['api_key'], true );
		$new_options['site_id'] = (int) $site_id;

		return $new_options;
	}

	/**
	 * Initialize class and return an instance of it
	 *
	 * @since 0.1.0
	 * @return CV_Convatic
	 */
	public static function init() {
		if ( ! isset( self::$_instance ) ) {

			self::$_instance = new CV_Convatic;
		}

		return self::$_instance;
	}

	/**
	 * Output settings for Convatic
	 *
	 * @since 0.1.0
	 * @return void
	 */
	public function screen_options() {
		global $cv_communication;

		$option = cv_get_option();
    ?>
        <div class="wrap">
			<h2><?php _e( 'Convatic', 'convatic' ); ?></h2>
			
			<form action="options.php" method="post">
				<?php settings_fields( CV_OPTION_NAME ); ?>
				<h3><?php _e( 'General Settings', 'convatic' ); ?></h3>
				<table class="form-table">
					<tbody>
						<tr>
							<th scope="row"><label for="cv_api_key"><?php _e( 'Convatic Site Key:', 'convatic' ); ?></label></th>
							<td>
								<input type="text" id="cv_api_key" name="<?php echo CV_OPTION_NAME; ?>[api_key]" value="<?php echo esc_attr( $option['api_key'] ); ?>" /> 
								<?php if ( cv_valid_api_key() ) : ?><img src="<?php echo plugins_url( 'includes/template/img/check-icon.png', dirname( __FILE__ ) ); ?>"><?php else: ?><img src="<?php echo plugins_url( 'includes/template/img/x-icon.png', dirname( __FILE__ ) ); ?>"><?php endif; ?><br />
								<?php echo _e( "<a href='http://convatic.com/register' target='_blank'>Don't have a site key? Get one for free.</a>" ); ?>
							</td>
						</tr>
					</tbody>
				</table>

				<h3><?php _e( 'Display', 'convatic' ); ?></h3>
				<table class="form-table">
					<tbody>
						<tr>
							<th scope="row"><label for="cv_pagination"><?php _e( 'Comment Pagination:', 'convatic' ); ?></label></th>
							<td>
								<?php printf( __( 'You can enable pagination in the WordPress <a href="%s">discussion settings page</a>.', 'convatic' ), admin_url( 'options-discussion.php' ) ); ?>
							</td>
						</tr>
					</tbody>
				</table>

				<h3><?php _e( "Advanced (Don't understand? Don't touch)", 'convatic' ); ?></h3>
				<table class="form-table">
					<tbody>
						<tr>
							<th scope="row"><label for="cv_sync_window"><?php _e( 'Sync Window (minutes):', 'convatic' ); ?></label></th>
							<td>
								<input type="text" id="cv_sync_window" size="10" name="<?php echo CV_OPTION_NAME; ?>[sync_window]" value="<?php echo absint( $option['sync_window'] ); ?>" /> 
								<?php _e( 'Commenter info will be synced from the Convatic server on this interval.' ); ?>
							</td>
						</tr>
						<tr>
							<th scope="row"><label for="cv_cache_size"><?php _e( 'Cache Size:', 'convatic' ); ?></label></th>
							<td>
								<input type="text" id="cv_cache_size" size="10" name="<?php echo CV_OPTION_NAME; ?>[cache_size]" value="<?php echo absint( $option['cache_size'] ); ?>" /> 
							</td>
						</tr>
					</tbody>
				</table>
				<?php submit_button(); ?>
			</form>
		</div>
	<?php
	}

}
global $convatic;
$convatic = CV_Convatic::init();

