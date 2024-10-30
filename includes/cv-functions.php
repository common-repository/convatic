<?php

/**
 * A wrapper for get_option that returns the plugins option
 *
 * @since 0.1.0
 * @return array
 */
function cv_get_option() {
	global $cv_option_defaults;

	$option = get_option( CV_OPTION_NAME, $cv_option_defaults );
	$option = wp_parse_args( $option, $cv_option_defaults );
	return $option;
}

/**
 * Parse Convatic API response and merge it with optional default arg array
 *
 * @param array $response
 * @param array $defaults
 * @since 0.1.0
 * @return array
 */
function cv_parse_response( $response, $defaults = array() ) {
	if ( ! is_wp_error( $response ) && is_array( $response ) && ! empty( $response['body'] ) ) {
		return wp_parse_args( json_decode( $response['body'], true ), $defaults );
	}

	return $defaults;
}

/**
 * Determine if a request response is valid or not
 *
 * @param array $response
 * @return bool
 */
function cv_ok_response( $response ) {
	if ( is_array( $response ) && ! empty( $response['response'] ) ) {
		if ( ! empty( $response['response']['code'] ) ) {
			$code = (int) $response['response']['code'];

			if ( $code >= 200 && $code < 300 )
				return true;
		}
	}

	return false;
}

/**
 * Get commenter info for a particular email from local DB
 *
 * @param string $email
 * @since 0.1.0
 * @return array
 */
function cv_get_commenter_info( $email ) {
	$commenter_info = get_transient( '_cv_commenter_info' );

	if ( ! isset( $commenter_info[$email] ) ) {
		$option = cv_get_option();

		$commenter_query = new WP_Query( array( 'posts_per_page' => 1, 'no_found_rows' => true, 'post_type' => 'cv_commenter', 'name' => sanitize_title( $email ) ) );
		
		if ( $commenter_query->have_posts() ) {
			while ( $commenter_query->have_posts() ) {
				$commenter_query->the_post();

				$total = get_post_meta( get_the_ID(), 'cv_total_comments', true );
				$score = get_post_meta( get_the_ID(), 'cv_score', true );
				$name = get_post_meta( get_the_ID(), 'cv_name', true );
				$url = get_post_meta( get_the_ID(), 'cv_url', true );

				// Move a commenter off the cache
				if ( count( $commenter_info ) >= $option['cache_size'] ) {
					array_shift( $commenter_info );
				}

				// Add a new commenter to the cache
				$commenter_info[$email] = array(
					'email' => esc_attr( $email ),
					'score' => (int) $score,
					'total' => (int) $total,
					'name' => esc_attr( $name ),
					'url' => esc_url_raw( $url ),
				);
			
				break;
			}
		}

		wp_reset_postdata();

		set_transient( '_cv_commenter_info', $commenter_info );
	}

	if ( ! empty( $commenter_info ) && is_array( $commenter_info ) && isset( $commenter_info[$email] ) ) {
		return $commenter_info[$email];
	}

	return array();
}

/**
 * Get commenter score by email from local DB
 *
 * @param string $email
 * @since 0.1.0
 * @return int
 */
function cv_get_commenter_score( $email ) {
	$commenter_info = cv_get_commenter_info( $email );

	if ( isset( $commenter_info['score'] ) ) {
		return (int) $commenter_info['score'];
	}

	return 50;
}

/**
 * Get commenter name by email from local DB
 *
 * @param string $email
 * @since 0.1.0
 * @return string
 */
function cv_get_commenter_name( $email ) {
	$commenter_info = cv_get_commenter_info( $email );

	if ( isset( $commenter_info['name'] ) ) {
		return esc_attr( $commenter_info['name'] );
	}

	return '';
}

/**
 * Get commenter score by email from local DB
 *
 * @param string $email
 * @since 0.1.0
 * @return string
 */
function cv_get_commenter_url( $email ) {
	$commenter_info = cv_get_commenter_info( $email );

	if ( isset( $commenter_info['url'] ) ) {
		return esc_url_raw( $commenter_info['url'] );
	}

	return '';
}

/**
 * Get commenter total comments by email from cache
 *
 * @param string $email
 * @since 0.1.0
 * @return int
 */
function cv_get_commenter_total_comments( $email ) {
	$commenter_info = cv_get_commenter_info( $email );

	if ( isset( $commenter_info['total'] ) ) {
		return (int) $commenter_info['total'];
	}

	return 0;
}

/**
 * Check whether API key is valid
 *
 * @param boolean $force_refresh
 * @since 0.1.0
 * @return int
 */
function cv_valid_api_key( $api_key = '', $force_refresh = false ) {
	if ( $force_refresh )
		delete_transient( 'cv_valid_api_key' );

	if ( $force_refresh || false === ( $site_id = get_transient( 'cv_valid_api_key' ) ) ) {
		global $cv_communication;

		$option = cv_get_option();

		$site_id = CV_Communication::valid_api_key( $api_key );

		set_transient( 'cv_valid_api_key', (int) $site_id );
	}

	return (int) $site_id;
}

/**
 * Checks if a comment has been sent to convatic. This can be used to detect pre-convatic comments
 *
 * @param int $comment_id
 * @since 0.1.0
 * @return bool
 */
function cv_is_cv_comment( $comment_id ) {
	$cv_comment_id = get_comment_meta( (int) $comment_id, 'cv_comment_id', true );
	return ( ! empty( $cv_comment_id ) );
}

/**
 * Returns true if comment pagination is enabled
 *
 * @since 0.1.0
 * @return bool
 */
function cv_is_paged_comments() {
	$page_comments = get_option( 'page_comments' );
	return ( ! empty( $page_comments ) );
}


/**
 * Display an individual comment
 *
 * @param object $comment
 * @param array $args
 * @param int $depth Depth of comment.
 * @since 0.1.0
 * @return void
 */
function cv_comment( $comment, $args, $depth ) {
	$show_avatars = get_option( 'show_avatars' );
	$cv_id = get_comment_meta( $comment->comment_ID, 'cv_comment_id', true );
?>

	<div <?php comment_class( empty( $args['has_children'] ) ? '' : 'parent' ); ?> id="comment-<?php comment_ID(); ?>" data-comment-id="<?php comment_ID(); ?>">
		<div id="cv-div-comment-<?php comment_ID(); ?>" class="cv-comment-body <?php if ( ! $show_avatars ) : ?>no-avatar<?php endif; ?>">


			<div id="cv-comment-<?php echo (int) $cv_id; ?>"></div>

			<?php if ( $show_avatars ) : ?>
				<div class="cv-comment-author">
					<?php if ( 0 != $args['avatar_size'] ) echo get_avatar( $comment, 45 ); ?>
				</div>
			<?php endif; ?>

			<div class="cv-comment-right">
				<div class="cv-comment-header">
					<div class="cv-author-name">
						<?php if ( cv_is_cv_comment( $comment->comment_ID ) ) : ?>
							<a href="javascript:void(0);" class="minimized"><?php comment_author(); ?></a>
							<div class="cv-author-details">
								<a href="javascript:void(0);" class="close">&times;</a>
								<?php
								comment_author_link();
								$total_comments = (int) cv_get_commenter_total_comments( get_comment_author_email() );
								if ( $total_comments == 0 )
									$total_comments = 1;
								?>
								<div>
									<span class="cv-commenter-score" data-cv-commenter-email="<?php comment_author_email(); ?>"><?php echo cv_get_commenter_score( get_comment_author_email() ); ?></span> 
									<span class="cv-comment-score-max">/ 100 over <span class="cv-total-comments" data-cv-commenter-email="<?php comment_author_email(); ?>"><?php echo $total_comments; ?></span> comments</span>
								</div>
							</div>
						<?php else : ?>
							<?php comment_author_link(); ?>
						<?php endif; ?>
					</div> 
					<span class="cv-date">- <?php comment_date(); ?> at <?php comment_time(); ?></span> </a><?php edit_comment_link( __( '(Edit)' ), '&nbsp;&nbsp;', '' );?>
				</div>

				<div class="cv-comment-text">
					<?php comment_text(); ?>
					<?php if ( '0' == $comment->comment_approved ) : ?>
						<p class="comment-awaiting-moderation"><em><?php _e( 'Your comment is awaiting moderation.', 'convatic' ) ?></em></p>
					<?php endif; ?>
				</div>
				<div class="cv-comment-footer">
					<?php if ( cv_is_cv_comment( $comment->comment_ID ) ) : ?>
						<div>
							<span class="cv-comment-rating" data-cv-comment-id="<?php echo (int) $cv_id; ?>">
								<?php echo (int) get_comment_meta( $comment->comment_ID, 'cv_comment_rating', true ); ?>
							</span> 
						</div>
						<div>
							<a href="javascript:void(0);" class="cv-comment-vote-action cv-vote-up" data-cv-commenter-email="<?php comment_author_email(); ?>" data-cv-comment-vote-action="1" data-wp-comment-id="<?php comment_ID(); ?>" data-cv-comment-id="<?php echo (int) $cv_id; ?>"></a> | 
							<a href="javascript:void(0);" class="cv-comment-vote-action cv-vote-down" data-cv-commenter-email="<?php comment_author_email(); ?>" data-cv-comment-vote-action="0" data-wp-comment-id="<?php comment_ID(); ?>" data-cv-comment-id="<?php echo (int) $cv_id; ?>"></a>  
						</div>
					<?php endif; ?>

					<div>
						<a rel="nofollow" data-comment-id="<?php comment_ID(); ?>" class="cv-comment-reply-link">Reply</a>
					</div>
					<div>
						<a class="cv-twitter" onclick="window.open('http://twitter.com/share?text=<?php echo urlencode( '"' . get_comment_text() . '" - ' . get_comment_author() ); ?>&url=<?php the_permalink(); ?>', 'twitter_share', 'height=320, width=640, toolbar=no, menubar=no, scrollbars=no, resizable=no, location=no, directories=no, status=no');" href="javascript:void(0);"><span>Twitter</span></a>
						<a class="cv-facebook" onclick="window.open('http://www.facebook.com/sharer.php?s=100&p[title]=<?php echo urlencode( '"' . get_comment_text() . '" - ' . get_comment_author() ); ?>&p[url]=<?php the_permalink(); ?>', 'facebook_share', 'height=320, width=640, toolbar=no, menubar=no, scrollbars=no, resizable=no, location=no, directories=no, status=no');" href="javascript:void(0);"><span>Facebook</span></a>
					</div>
				</div>

			</div>

			<div class="reply"></div>
		
		</div>
<?php
}

