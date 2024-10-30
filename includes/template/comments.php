<div id="convatic">
	<section class="cv-comments <?php if ( 1 > get_comments_number() ) : ?>cv-no-comments<?php endif; ?>">
		<div class="cv-list-header">
			<div class="cv-left">
				<span class="cv-comment-number"><?php comments_number( '0', '1', '%' ); ?></span> comments
			</div>

			<div class="cv-right">
				<a href="#respond">Leave a comment</a>
			</div>
		</div>
			
		<div class="cv-commentlist" id="cv-commentlist">
			<?php
			wp_list_comments( array(
				'style' => 'div',
				'max_depth' => '',
				'avatar_size' => 32,
				'callback' => apply_filters( 'cv_comment_callback', 'cv_comment' )
			) );
			?>
		</div>

		<?php if ( 0 < get_comments_number() && cv_is_paged_comments() ) : ?>
			<div class="cv-navigation">
				<?php paginate_comments_links(); ?>
			</div>
		<?php endif; ?>
			
	</section>

	<?php comment_form( array( 'fields' => array() ) ); ?>
</div>