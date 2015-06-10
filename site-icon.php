<?php
/*
Plugin Name: Site Icon
Description: An admin UI for setting a site icon used for favicons and touch icons.
Version:     1.0.0
Plugin URI:  https://github.com/johnbillion/wp-site-icon
Author:      John Blackbourn

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

*/

class WP_Site_Icon {

	/**
	 * Class constructor.
	 */
	private function __construct() {

		require_once dirname( __FILE__ ) . '/sizes.php';
		require_once dirname( __FILE__ ) . '/api.php';

		add_action( 'customize_register',     array( $this, 'action_customize_register' ) );
		add_action( 'admin_bar_menu',         array( $this, 'action_admin_bar_menu' ) );
		add_action( 'wp_head',                array( $this, 'action_wp_head' ), 999 );
		add_action( 'wp_ajax_site-icon-crop', array( $this, 'ajax_icon_crop' ) );

	}

	public function action_customize_register( WP_Customize_Manager $wp_customize ) {

		require_once dirname( __FILE__ ) . '/control.php';

		$wp_customize->add_section( 'site_icon', array(
			'title'       => __( 'Site Icon' ),
			'description' => __( 'The site icon is used for the favicon and touch icons on your site. Your theme may also display the site icon.' ),
			'priority'    => 60,
		) );

		$wp_customize->add_setting( 'site_icon_data', array(
			'type'    => 'option',
			'default' => array(),
		) );

		$wp_customize->add_control( new WP_Customize_Site_Icon_Control( $wp_customize ) );

	}

	/**
	 * Adds a Site Icon sub-menu to the admin bar.
	 *
	 * @param WP_Admin_Bar $wp_admin_bar The admin bar object
	 */
	public function action_admin_bar_menu( WP_Admin_Bar $wp_admin_bar ) {

		if ( ! current_user_can( 'customize' ) ) {
			return;
		}

		$current_url   = ( is_ssl() ? 'https://' : 'http://' ) . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
		$customize_url = add_query_arg( 'url', urlencode( $current_url ), wp_customize_url() );

		$wp_admin_bar->add_menu( array(
			'parent' => 'appearance',
			'id'     => 'customize-site-icon',
			'title'  => __( 'Site Icon' ),
			'href'   => add_query_arg( urlencode( 'autofocus[control]' ), 'site_icon', $customize_url ),
			'meta'   => array(
				'class' => 'hide-if-no-customize',
			),
		) );

	}

	public function action_wp_head() {

		$icon_data = get_site_icon_data();

		if ( empty( $icon_data ) ) {
			return;
		}

		foreach ( get_site_icon_sizes() as $icon ) {

			if ( isset( $icon_data[ $icon['size'] ] ) ) {
				$attachment = get_post( $icon_data[ $icon['size'] ] );
				list( $src, $width, $height ) = wp_get_attachment_image_src( $attachment->ID, 'full' );
			} else {
				// @TODO find closest size and use as a fallback:
				continue;
			}

			echo call_user_func( $icon['display_callback'], $icon['size'], $src, $attachment );
		}

	}

	/**
	 * Gets attachment uploaded by Media Manager, crops each size, then saves each as a
	 * new attachment. Returns JSON-encoded array of object details.
	 */
	public function ajax_icon_crop() {
		check_ajax_referer( 'image_editor-' . $_POST['id'], 'nonce' );

		if ( ! current_user_can( 'edit_theme_options' ) ) {
			wp_send_json_error();
		}

		$attachment_id = absint( $_POST['id'] );
		$crop_details  = $_POST['cropDetails'];

		if ( ! wp_attachment_is_image( $attachment_id ) ) {
			wp_send_json_error();
		}

		if ( $crop_details['width'] !== $crop_details['height'] ) {
			wp_send_json_error();
		}

		$objects = array();
		$meta    = wp_get_attachment_metadata( $attachment_id );

		foreach ( get_site_icon_sizes() as $id => $args ) {

			$cropped = wp_crop_image(
				$attachment_id,
				(int) $crop_details['x1'],
				(int) $crop_details['y1'],
				(int) $crop_details['width'],
				(int) $crop_details['height'],
				(int) $args['size'],
				(int) $args['size']
			);

			if ( ! $cropped || is_wp_error( $cropped ) ) {
				wp_send_json_error( array(
					'message' => __( 'Image could not be processed. Please go back and try again.' ),
				) );
			}

			/** This filter is documented in wp-admin/custom-header.php */
			$cropped = apply_filters( 'wp_create_file_in_uploads', $cropped, $attachment_id ); // For replication

			$object = $this->create_attachment_object( $cropped, $attachment_id );

			unset( $object['ID'] );

			$new_attachment_id = $this->insert_attachment( $object, $cropped );

			$object['attachment_id'] = $new_attachment_id;
			$object['width']         = $dimensions['dst_width'];
			$object['height']        = $dimensions['dst_height'];

			$objects[] = $object;

		}

		wp_send_json_success( $objects );
	}

	/**
	 * Create an attachment 'object'.
	 *
	 * @param string $cropped              Cropped image URL.
	 * @param int    $parent_attachment_id Attachment ID of parent image.
	 *
	 * @return array Attachment object.
	 */
	final public function create_attachment_object( $cropped, $parent_attachment_id ) {
		$parent     = get_post( $parent_attachment_id );
		$parent_url = $parent->guid;
		$url        = str_replace( basename( $parent_url ), basename( $cropped ), $parent_url );
		$size       = @getimagesize( $cropped );
		$mime_type  = ( $size ) ? $size['mime'] : 'image/jpeg';

		$object = array(
			'ID'             => $parent_attachment_id,
			'post_title'     => basename( $cropped ),
			'post_content'   => $url,
			'post_mime_type' => $mime_type,
			'guid'           => $url,
			'context'        => 'site-icon',
		);

		return $object;
	}

	/**
	 * Insert an attachment and its metadata.
	 *
	 * @param array  $object  Attachment object.
	 * @param string $cropped Cropped image URL.
	 *
	 * @return int Attachment ID.
	 */
	final public function insert_attachment( $object, $cropped ) {
		$attachment_id = wp_insert_attachment( $object, $cropped );
		$metadata      = wp_generate_attachment_metadata( $attachment_id, $cropped );
		wp_update_attachment_metadata( $attachment_id, $metadata );
		return $attachment_id;
	}

	/**
	 * Singleton.
	 *
	 * @return WP_Site_Icon Site Icon instance.
	 */
	public static function get_instance() {
		static $instance;

		if ( ! isset( $instance ) ) {
			$instance = new WP_Site_Icon;
		}

		return $instance;
	}

}

WP_Site_Icon::get_instance();
