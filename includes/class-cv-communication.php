<?php

/**
 * Communicate between Convatic and Convatic server
 */

class CV_Communication {

	private static $_instance;

	/**
	 * Setup actions and filters. This is a singleton.
	 *
	 * @since 0.1.0
	 * @return CV_Communication
	 */
	protected function __construct() {
		if ( cv_valid_api_key() ) {
			add_action( 'wp_insert_comment', array( $this, 'send_comment_to_server' ), 10, 2 );
			add_action( 'delete_comment', array( $this, 'delete_comment_from_server' ), 10, 1 );
		}
	}

	/**
	 * Initialize class and return an instance of it
	 *
	 * @since 0.1.0
	 * @return CV_Communication
	 */
	public static function init() {
		if ( ! isset( self::$_instance ) ) {

			self::$_instance = new CV_Communication;
		}

		return self::$_instance;
	}

	/**
	 * Delete comment from Convatic server
	 *
	 * @param int $comment_id
	 * @since 0.1.0
	 * @return bool
	 */
	public function delete_comment_from_server( $comment_id ) {
		$option = cv_get_option();

		if ( empty( $option['api_key'] ) )
			return false;

		$cv_comment_id = get_comment_meta( $comment_id, 'cv_comment_id', true );

		if ( empty( $cv_comment_id ) )
			return false;

		$response = wp_remote_request( CV_SERVER_DELETE_COMMENT_ENDPOINT . (int) $cv_comment_id . '/', array(
			'method' => 'GET',
			'headers' => array( 'Authorization' => 'Token ' . esc_attr( $option['api_key'] ) ),
	    ) );

	    do_action( 'cv_delete_comment_from_server', $comment_id );

	    return cv_ok_response( $response );
	}

	/**
	 * Vote for a Convatic comment
	 *
	 * @param int $comment_id - this is a CONVATIC comment id
	 * @param int $vote - 1 is +, 0 is -
	 * @since 0.1.0
	 * @return int
	 */
	public function comment_vote( $comment_id, $vote ) {
		$option = cv_get_option();

		if ( empty( $option['api_key'] ) )
			return false;

		if ( empty( $comment_id ) )
			return false;

		$response = wp_remote_request( CV_SERVER_VOTE_COMMENT_ENDPOINT . (double) $comment_id . '/', array(
			'method' => 'POST',
			'body' => array(
				'vote' => (int) $vote,
			),
			'headers' => array( 'Authorization' => 'Token ' . esc_attr( $option['api_key'] ) ),
	    ) );

	    $response_array = cv_parse_response( $response, array( 'rating' => false ) );

	    do_action( 'cv_comment_vote', $comment_id );

	    return $response_array['rating'];
	}

	/**
	 * Send comment info to Convatic server
	 *
	 * @param int $id
	 * @param object $comment
	 * @since 0.1.0
	 * @return bool
	 */
	public function send_comment_to_server( $id, $comment ) {
		$option = cv_get_option();

		if ( empty( $option['api_key'] ) )
			return false;

		$post_body = array(
			'email' => $comment->comment_author_email,
			'author' => $comment->comment_author,
			'url' => $comment->comment_author_url,
			'content' => $comment->comment_content,
			'ip' => $comment->comment_author_IP,
			'post_title' => get_the_title( $comment->comment_post_ID ),
			'post_url' => get_permalink( $comment->comment_post_ID ),
		);

		if ( ! empty( $comment->comment_parent ) ) {
			$cv_comment_parent = get_post_meta( $comment->comment_parent, 'cv_comment_id', true );

			if ( ! empty( $cv_comment_parent ) )
				$post_body['parent_id'] = (int) $cv_comment_parent;
		}

		if ( ! empty( $_POST['create_password'] ) && ! empty( $_POST['create_password_confirm'] ) ) {
			if ( $_POST['create_password'] == $_POST['create_password_confirm'] )
				$post_body['commenter_password'] = $_POST['create_password'];
		} elseif ( ! empty( $_POST['password'] ) ) {
			$post_body['commenter_password'] = $_POST['password'];
		}

		$response = wp_remote_post( CV_SERVER_NEW_COMMENT_ENDPOINT, array(
			'body' => $post_body,
			'headers' => array( 'Authorization' => 'Token ' . esc_attr( $option['api_key'] ) ),
	    ) );
	    
	    $response_array = cv_parse_response( $response, array( 'id' => 0 ) );

	    // We are going to have a cron job to look for failed comment transfers
	    update_comment_meta( $id, 'cv_comment_id', $response_array['id'] );
	    update_comment_meta( $id, 'cv_comment_rating', 0 );

	    do_action( 'cv_send_comment_to_server', $id, $response_array );

	    // We need to sync commenter info if we dont have his info
	    $commenter_info = cv_get_commenter_info( $comment->comment_author_email );

	    if ( empty( $commenter_info ) )
	    	update_post_meta( $comment->comment_post_ID, 'cv_last_commenter_sync', 0 );

	    return cv_ok_response( $response );
	}

	/**
	 * Check if api key is valid
	 *
	 * @param string $api_key
	 * @return int
	 */
	public function valid_api_key( $api_key ) {
		if ( empty( $api_key ) )
			return false;

		$response = wp_remote_request( CV_SERVER_VALID_API_ENDPOINT, array(
			'method' => 'POST',
			'timeout' => 30,
			'headers' => array(
				'Authorization' => 'Token ' . esc_attr( $api_key ),
			)
		) );

		// If we can't connect, we have to assume the key is invalid
	    if ( is_wp_error( $response ) )
	    	return false;

	    $response_array = cv_parse_response( $response, array( 'valid' => false, 'site_id' => 0 ) );

	    if ( $response_array['valid'] && ! empty( $response_array['site_id'] ) ) {
	    	return (int) $response_array['site_id'];
	    }

	    return false;
	}

	/**
	 * Check if api key is valid
	 *
	 * @param array $commenters
	 * @since 0.1.0
	 * @return bool|array
	 */
	public function get_commenter_info( $commenters ) {
		$option = cv_get_option();

		if ( empty( $option['api_key'] ) )
			return false;

		if ( ! is_array( $commenters ) )
			return false;

		// Format commenters to look like [ email => email, ... ]
		$commenters_formatted = array();
		foreach ( $commenters as $commenter ) {
			$commenters_formatted[esc_attr( $commenter )] = esc_attr( $commenter );
		}

		$response = wp_remote_post( CV_SERVER_COMMENTER_LOOKUP_ENDPOINT, array(
			'body' => $commenters_formatted,
			'headers' => array(
				'Authorization' => 'Token ' . esc_attr( $option['api_key'] ),
			)
	    ) );

	    $response_array = cv_parse_response( $response );

	    do_action( 'cv_get_commenter_info', $response_array, $commenters );

	    // If request was completed, return data, otherwise, return false
	    if ( cv_ok_response( $response ) )
	    	$response_return = $response_array;
	    else
	    	$response_return = false;

	    return apply_filters( 'cv_get_commenter_info', $response_return, $commenters );
	}
}

global $cv_communication;
$cv_communication = CV_Communication::init();

