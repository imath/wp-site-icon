<?php

function add_site_icon_size( $id, array $args ) {
	$sizes = WP_Site_Icon_Sizes::get_instance();

	return $sizes->add( $id, $args );
}

function get_site_icon_data() {
	return get_option( 'site_icon_data', array() );
}

function get_site_icon_url() {
	$data = get_site_icon_data();

	if ( empty( $data ) ) {
		return false;
	}

	$att_id = end( $data );

	if ( ! $attachment = get_post( $att_id ) ) {
		return false;
	}

	list( $src, $width, $height ) = wp_get_attachment_image_src( $attachment->ID, 'full' );

	return $src;
}

function get_site_icon_sizes() {
	$sizes = WP_Site_Icon_Sizes::get_instance();

	return $sizes->get_all();
}
