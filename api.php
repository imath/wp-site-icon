<?php

function add_site_icon_size( $id, array $args ) {
	$sizes = WP_Site_Icon_Sizes::get_instance();

	return $sizes->add( $id, $args );
}

function get_site_icon_data() {
	return get_option( 'site_icon_data', '' );
}

function get_site_icon_url() {
	$data = get_site_icon_data();

	if ( empty( $data ) ) {
		return false;
	}

	if ( ! $attachment = get_post( $data['attachment_id'] ) ) {
		return false;
	}

	list( $src, $width, $height ) = wp_get_attachment_image_src( $attachment->ID, 'favicon-192' );

	return $src;
}

function get_site_icon_sizes() {
	$sizes = WP_Site_Icon_Sizes::get_instance();

	return $sizes->get_all();
}

/**
 * Mimic Custom_Image_Header->get_uploaded_header_images() + get_uploaded_header_images()
 * to fetch previously uploaded site icons
 *
 * @return array the list of attachments used as site icons
 */
function get_uploaded_site_icons() {
	$site_icons = array();

	// @todo caching
	$icons = get_posts( array(
		'post_type'  => 'attachment',
		'meta_key'   => '_wp_attachment_context',
		'meta_value' => 'site-icon',
		'orderby'    => 'none',
		'nopaging'   => true
	) );

	if ( empty( $icons ) ) {
		return array();
	}

	foreach ( (array) $icons as $icon ) {
		$url = esc_url_raw( wp_get_attachment_url( $icon->ID ) );
		$icon_data = wp_get_attachment_metadata( $icon->ID );
		$icon_index = basename( $url );
		$site_icons[ $icon_index ] = array(
			'attachment_id' => $icon->ID,
			'url'           => $url,
			'thumbnail_url' => $url,
		);

		if ( isset( $icon_data['width'] ) ) {
			$site_icons[ $icon_index ]['width'] = $icon_data['width'];
		}

		if ( isset( $icon_data['height'] ) ) {
			$site_icons[ $icon_index ]['height'] = $icon_data['height'];
		}

		// Attachment Meta
		$icon_meta = get_post_meta( $icon->ID );

		$site_icons[ $icon_index ]['timestamp'] = '';
		if ( isset( $icon_meta['_wp_attachment_site_icon_last_used'] ) ) {
			$site_icons[ $icon_index ]['timestamp'] = $icon_meta['_wp_attachment_site_icon_last_used'];
		}

		$site_icons[ $icon_index ]['alt_text'] = '';
		if ( isset( $icon_meta['_wp_attachment_image_alt'] ) ) {
			$site_icons[ $icon_index ]['alt_text'] = $icon_meta['_wp_attachment_image_alt'];
		}
	}

	return $site_icons;
}
