<?php

/**
 * This file contains ajax actions for the plugin
 */

class CV_AJAX {

	private static $_instance;
	private $commenters;

	/**
	 * Setup actions and filters. This is a singleton.
	 *
	 * @since 0.1.0
	 * @return CV_AJAX
	 */
	protected function __construct() {
		add_action( 'wp_ajax_nopriv_get_commenter_info', array( $this, 'action_get_commenter_info' ) );
		add_action( 'wp_ajax_get_commenter_info', array( $this, 'action_get_commenter_info' ) );
		add_action( 'wp_ajax_nopriv_is_commenter_subscribed', array( $this, 'action_is_commenter_subscribed' ) );
		add_action( 'wp_ajax_is_commenter_subscribed', array( $this, 'action_is_commenter_subscribed' ) );
		add_action( 'wp_ajax_nopriv_created_comment', array( $this, 'action_created_comment' ) );
		add_action( 'wp_ajax_created_comment', array( $this, 'action_created_comment' ) );
		add_action( 'wp_ajax_nopriv_comment_vote', array( $this, 'action_comment_vote' ) );
		add_action( 'wp_ajax_comment_vote', array( $this, 'action_comment_vote' ) );
	}

	/**
	 * Vote for a comment
	 *
	 * @since 0.1.0
	 * @return void
	 */
	public function action_comment_vote() {
		$output = array();
		$output['completed'] = false;

		if ( isset( $_POST['vote'] ) && ! empty( $_POST['cv_comment_id'] ) && ! empty( $_POST['wp_comment_id'] ) ) {
			global $cv_communication;

			$rating = $cv_communication->comment_vote( (double) $_POST['cv_comment_id'], (int) $_POST['vote'] );
		
			if ( $rating != false ) {
				$output['rating'] = (double) $rating;
				update_comment_meta( $_POST['wp_comment_id'], 'cv_comment_rating', (double) $rating );
				$output['completed'] = true;
			}
		}

		wp_send_json( $output );
	}

	/**
	 * Associate a Convatic comment with a WP comment
	 *
	 * @since 0.1.0
	 * @return void
	 */
	public function action_created_comment() {
		$output = array();
		$output['completed'] = false;

		if ( ! empty( $_POST['wp_comment_id'] ) && ! empty( $_POST['cv_comment_id'] ) ) {
			
			$output['completed'] = true;
			$output['success'] = false;

			if ( update_comment_meta( $_POST['wp_comment_id'], 'cv_comment_id', (double) $_POST['cv_comment_id'] ) ) {
				$output['success'] = true;

				$comment = get_comment( $_POST['wp_comment_id'] );

				ob_start();

				$args = array(
					'max_depth' => '',
					'style' => 'ul',
					'avatar_size' => 32,
				);

				$GLOBALS['comment'] = $comment;

				cv_comment( $comment, $args, 1 );

				unset( $GLOBALS['comment'] );

				$output['html'] = ob_get_clean();
				$output['comment_parent'] = $comment->comment_parent;

			}
		}

		wp_send_json( $output );
	}

	/**
	 * Get commenter info for an array of emails
	 *
	 * @since 0.1.0
	 * @return void
	 */
	public function action_get_commenter_info() {
		$output = array();
		$output['completed'] = false;

		if ( ! empty( $_POST['commenters'] ) ) {
			global $cv_communication;

			$local_commenters = array();
			$not_found_commenters = array();

			foreach ( $_POST['commenters'] as $email ) {

				$local_commenter = null;

				if ( empty( $_POST['force_refresh'] ) )
					$local_commenter = cv_get_commenter_info( $email );

				if ( empty ( $local_commenter ) ) {
					$not_found_commenters[] = $email;
				} else {
					$local_commenters[$email] = $local_commenter;
				}

			}

			// Grab not found commenters from Convatic server
			$remote_commenters = array();

			if ( ! empty( $not_found_commenters ) ) {
				$remote_commenters = $cv_communication->get_commenter_info( $not_found_commenters );

				/**
				 * Let's cache these remote commenters
				 */

				$existing_commenter_args = array(
					'post_type' => 'cv_commenter',
					'posts_per_page' => apply_filters( 'cv_max_comments', 5000 ), // maximum of 5000 comments on one post
					'no_found_rows' => true,
					'cache_results' => false,

				);

				// Retrieve existing commenters that are in this post
				$this->commenters = $remote_commenters;

				add_filter( 'posts_where', array( $this, 'filter_post_names' ) );
				$existing_commenters = new WP_Query( $existing_commenter_args );
				remove_filter( 'posts_where', array( $this, 'filter_post_names' ) );

				$existing_commenters_by_email = array();

				// Reorganize existing commenters
				if ( $existing_commenters->have_posts() ) {
					while ( $existing_commenters->have_posts() ) {
						global $post;
						$existing_commenters->the_post();

						$existing_commenters_by_email[$post->post_name] = $post;
					}
				}

				// Either create or update existing commenters
				foreach ( $remote_commenters as $email => $info ) {
					$sanitized_email = sanitize_title( $email );


					$created_new_commenter = false;
					if ( ! empty( $existing_commenters_by_email[$sanitized_email] ) ) {

						$post_id = $existing_commenters_by_email[$sanitized_email]->ID;
					} else {
						$args = array(
							'post_name' => $email,
							'post_type' => 'cv_commenter',
							'post_content' => '',
							'post_status' => 'publish',
						);

						$post_id = wp_insert_post( $args );
						$created_new_commenter = true;

						var_dump( $info );
					}

					if ( $post_id ) {
						update_post_meta( $post_id, 'cv_score', (int) $info['score'] );
						update_post_meta( $post_id, 'cv_email', sanitize_text_field( $email ) );
						update_post_meta( $post_id, 'cv_total_comments', (int) $info['total_comments'] );
						update_post_meta( $post_id, 'cv_url', esc_url_raw( $info['url'] ) );
						update_post_meta( $post_id, 'cv_name', sanitize_text_field( $info['name'] ) );

						// If the commenter already exists, let's update it's record in the shallow cache
						if ( ! $created_new_commenter ) {
							$commenter_info = get_transient( '_cv_commenter_info' );

							// Only update the shallow cache, if the commenter is actually IN the shallow cache
							if ( isset( $commenter_info[$email] ) ) {
								$commenter_info[$email] = array(
									'email' => sanitize_text_field( $email ),
									'score' => (int) $info['score'],
									'total' => (int) $info['total_comments'],
									'name' => sanitize_text_field( $info['name'] ),
									'url' => esc_url_raw( $info['url'] ),
								);

								set_transient( '_cv_commenter_info', $commenter_info );
							}
						}
					}
				}

				wp_reset_postdata();

				/**
				 * END remote commenter caching stuff
				 */
			}
			
			// If $remote_commenters is false, then the request couldn't complete
			if ( is_array( $remote_commenters ) ) {
				$output['commenters'] = array_merge( $local_commenters, $remote_commenters );
				$output['completed'] = true;
			}
		}

		wp_send_json( $output );
	}

	/**
	 * Get commenter info for an array of emails
	 *
	 * @since 0.1.0
	 * @return void
	 */
	public function action_is_commenter_subscribed() {
		$output = array();
		$output['completed'] = false;

		if ( ! empty( $_POST['commenters'] ) && ! empty( $_POST['post_id'] ) ) {
			
			$commenters = array();
			$subscribed = get_post_meta( $_POST['post_id'], 'cv_comment_subscription' );

			foreach ( $_POST['commenters'] as $email ) {
				if ( in_array( $email, $subscribed ) )
					$commenters[$email] = 1;
				else
					$commenters[$email] = 0;
			}
			
			$output['commenters'] = $commenters;
			$output['completed'] = true;
		}

		wp_send_json( $output );
	}

	/**
	 * Initialize class and return an instance of it
	 *
	 * @since 0.1.0
	 * @return CV_AJAX
	 */
	public static function init() {
		if ( ! isset( self::$_instance ) ) {

			self::$_instance = new CV_AJAX;
		}

		return self::$_instance;
	}

	/**
	 * Modify WP_Query SQL to account for multiple post names
	 *
	 * @param string $where
	 * @return string
	 */
	public function filter_post_names( $where = '' ) {
		if ( ! empty ( $this->commenters ) && is_array( $this->commenters ) ) {
			$where .= " AND ( ";
			$i = 0;
			foreach ( $this->commenters as $email => $info ) {
				$i++;
				if ( $i > 1 ) $where .= ' OR ';
				$where .= " post_name='" . sanitize_title( $email ) . "' ";
			}
			$where .= " ) ";
		}

		return $where;
	}

}

CV_AJAX::init();