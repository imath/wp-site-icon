<?php

class WP_Site_Icon_Sizes {
	protected $sizes = array();

	public function __construct() {
		foreach ( array( 16, 32, 96, 192 ) as $size ) {
			$this->add( "favicon-{$size}", array(
				'label'            => __( 'Favicon %s' ),
				'size'             => $size,
				'scalable'         => true,
				'display_callback' => array( $this, 'display_favicon' ),
			) );
		}

		foreach ( array( 120, 152 ) as $size ) {
			$this->add( "touch-icon-{$size}", array(
				'label'            => __( 'Touch Icon %s' ),
				'size'             => $size,
				'scalable'         => true,
				'display_callback' => array( $this, 'display_touch_icon' ),
			) );
		}
	}

	public function add( $id, array $args ) {
		$this->sizes[ $id ] = $args;
		return true;
	}

	public function remove( $id ) {
		if ( isset( $this->sizes[ $id ] ) ) {
			unset( $this->sizes[ $id ] );
			return true;
		} else {
			return false;
		}
	}

	public function sort_sizes( $a, $b ) {
		$a = intval( preg_replace( '/[^0-9]+/', '', $a ), 10 );
		$b = intval( preg_replace( '/[^0-9]+/', '', $b ), 10 );

		if ( $a === $b ) {
			$r = 0;
		} elseif ( $a > $b ) {
			$r = 1;
		} else {
			$r = -1;
		}

		return $r;
	}

	public function get_all() {
		// We need to sort the array so that the bigger dimension is at the end
		uksort( $this->sizes, array( $this, 'sort_sizes' ) );
		return $this->sizes;
	}

	public function display_favicon( $size, $src, WP_Post $attachment ) {
		$mime_type = explode( '/', get_post_mime_type( $attachment ) );

		$icon = sprintf( '<link rel="icon" sizes="%1$dx%1$d" href="%2$s" type="image/%3$s">',
			absint( $size ),
			esc_url_raw( $src ),
			esc_attr( $mime_type[1] )
		);
		return $icon;
	}

	public function display_touch_icon( $size, $src, WP_Post $attachment ) {
		$icon1x = sprintf( '<link rel="apple-touch-icon-precomposed" sizes="%1$dx%1$d" href="%2$s">',
			absint( $size ) / 2,
			esc_url( $src )
		);
		$icon2x = sprintf( '<link rel="apple-touch-icon-precomposed" sizes="%1$dx%1$d" href="%2$s">',
			absint( $size ),
			esc_url( $src )
		);
		return $icon1x . $icon2x;
	}

	/**
	 * Singleton.
	 *
	 * @return WP_Site_Icon_Sizes Site Icon Sizes instance.
	 */
	public static function get_instance() {
		static $instance;

		if ( ! isset( $instance ) ) {
			$instance = new WP_Site_Icon_Sizes;
		}

		return $instance;
	}

}
