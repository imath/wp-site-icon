<?php

/**
 * Site Icon Control class.
 */
class WP_Customize_Site_Icon_Control extends WP_Customize_Image_Control {
	public $type = 'site-icon';
	public $uploaded_icons;

	/**
	 * @param WP_Customize_Manager $manager
	 */
	public function __construct( WP_Customize_Manager $manager ) {
		parent::__construct( $manager, 'site_icon', array(
			'label'    => __( 'Site Icon' ),
			'settings' => array(
				'default' => 'site_icon',
				'data'    => 'site_icon_data',
			),
			'section'  => 'site_icon',
			'get_url'  => 'get_site_icon_url',
		) );
	}

	public function enqueue() {
		/**
		 * Enqueue the media editor
		 */
		wp_enqueue_media();

		/**
		 * Stylesheet may need to be improved
		 */
		wp_enqueue_style( 'site-icon-style', plugins_url( 'css/style.css', __FILE__ ), array(
			'imgareaselect'
		) );

		/**
		 * Enqueue the site icon model
		 */
		wp_enqueue_script( 'site-icon-model', plugins_url( 'js/model.js', __FILE__ ), array(
			'customize-models',
		) );

		/**
		 * Enqueue the site icon control
		 */
		wp_enqueue_script( 'site-icon-control', plugins_url( 'js/control.js', __FILE__ ), array(
			'customize-controls', 'site-icon-model',
		) );

		/**
		 * Enqueue the site icon views
		 * Without wp-backbone, there's a js error
		 */
		wp_enqueue_script( 'site-icon-views', plugins_url( 'js/views.js', __FILE__ ), array(
			'wp-backbone', 'site-icon-control',
		) );

		$sizes = get_site_icon_sizes();
		$max   = end( $sizes );

		$this->prepare_control();

		wp_localize_script( 'customize-views', '_wpCustomizeSiteIcon', array(
			'data' => array(
				'width'         => absint( $max['size'] ),
				'height'        => absint( $max['size'] ),
				'currentImgSrc' => $this->get_current_image_src(),
			),
			'nonces' => array(
				'add'    => wp_create_nonce( 'icon-add' ),
				'remove' => wp_create_nonce( 'icon-remove' ),
			),
			/* Get the previously uploaded site icons */
			'uploads'  => $this->uploaded_icons
		) );

		parent::enqueue();
	}

	public function print_icon_template() {
		?>
		<script type="text/template" id="tmpl-site-icon-choice">
			<# if ( data.type === 'uploaded' ) { #>
				<div class="dashicons dashicons-no close"></div>
			<# } #>

			<button type="button" class="choice thumbnail"
				data-customize-image-value="{{{data.icon.url}}}"
				data-customize-icon-image-data="{{JSON.stringify(data.icon)}}">
				<span class="screen-reader-text"><?php _e( 'Set icon' ); ?></span>
				<img src="{{{data.icon.thumbnail_url}}}" alt="">
			</button>
		</script>

		<script type="text/template" id="tmpl-site-icon-current">
			<# if ( data.choice ) { #>

				<img src="{{{data.icon.thumbnail_url}}}" alt="{{{data.icon.alt_text || data.icon.description}}}" tabindex="0"/>

			<# } else { #>

				<div class="placeholder">
					<div class="inner">
						<span>
							<?php _e( 'No icon set' ); ?>
						</span>
					</div>
				</div>

			<# } #>
		</script>
		<?php
	}

	/**
	 * Get the previously uploaded site icons
	 * @uses get_uploaded_site_icons() (api.php)
	 */
	public function prepare_control() {
		$this->uploaded_icons = get_uploaded_site_icons();
	}

	public function get_current_image_src() {
		$src = $this->value();

		if ( isset( $this->get_url ) ) {
			$src = call_user_func( $this->get_url );
		}

		return $src;
	}

	public function render_content() {
		$this->print_icon_template();
		$visibility = $this->get_current_image_src() ? '' : ' style="display:none" ';
		$sizes = get_site_icon_sizes();
		$max   = end( $sizes );
		?>
		<div class="customize-control-content">
			<p class="customizer-section-intro">
				<?php printf( __( 'An icon size of <strong>%d &times; %d</strong> pixels is recommended.' ), $max['size'], $max['size'] ); ?>
			</p>
			<div class="current">
				<span class="customize-control-title">
					<?php _e( 'Current icon' ); ?>
				</span>
				<div class="container">
				</div>
			</div>
			<div class="actions">
				<?php /* translators: Hide as in hide site icon via the Customizer */ ?>
				<button type="button"<?php echo $visibility ?> class="button remove"><?php _ex( 'Remove icon', 'custom site icon' ); ?></button>
				<?php /* translators: New as in add new site icon via the Customizer */ ?>
				<button type="button" class="button new"><?php _ex( 'Add new icon', 'site icon image' ); ?></button>
				<div style="clear:both"></div>
			</div>
			<div class="choices">
				<span class="customize-control-title icon-previously-uploaded">
					<?php _ex( 'Previously uploaded', 'custom icons' ); ?>
				</span>
				<div class="uploaded">
					<div class="list">
					</div>
				</div>
			</div>
		</div>
		<?php
	}
}
