/* globals _wpCustomizeSiteIcon, _ */
(function( $, wp ) {
	var api = wp.customize;
	api.SiteIconTool = {};

	/**
	 * wp.customize.SiteIconTool.ImageModel
	 *
	 * This is where saves via the Customizer API are abstracted away.
	 *
	 * @constructor
	 * @augments Backbone.Model
	 */
	api.SiteIconTool.ImageModel = Backbone.Model.extend( {
		defaults: function() {
			return {
				icon: {
					attachment_id: 0,
					url: '',
					timestamp: _.now(),
					thumbnail_url: ''
				},
				choice: '',
				selected: false
			};
		},

		initialize: function() {
			this.on( 'hide', this.hide, this );
		},

		hide: function() {
			this.set('choice', '');
			api('site_icon').set('remove-icon');
			api('site_icon_data').set('remove-icon');
		},

		destroy: function() {
			var data = this.get( 'icon' ),
				curr = api.SiteIconTool.currentIcon.get('icon').attachment_id;

			// If the image we're removing is also the current site icon, unset
			// the latter
			if ( curr && data.attachment_id === curr ) {
				api.SiteIconTool.currentIcon.trigger( 'hide' );
			}

			wp.ajax.post( 'site-icon-remove', {
				nonce: _wpCustomizeSiteIcon.nonces.remove,
				wp_customize: 'on',
				attachment_id: data.attachment_id
			});

			this.trigger( 'destroy', this, this.collection );
		},

		save: function() {
			if ( this.get( 'icon' ).defaultName ) {
				api( 'site_icon' ).set( this.get('icon').url );
				api( 'site_icon_data' ).set( this.get('icon').defaultName );
			} else {
				api( 'site_icon' ).set( this.get( 'icon' ).url );
				api( 'site_icon_data' ).set( this.get( 'icon' ) );
			}

			//Commenting for now
			api.SiteIconTool.combinedList.trigger( 'control:setImage', this );
		},

		importImage: function() {
			var data = this.get( 'icon' );
			if ( data.attachment_id === undefined ) {
				return;
			}

			wp.ajax.post( 'site-icon-add', {
				nonce: _wpCustomizeSiteIcon.nonces.add,
				wp_customize: 'on',
				attachment_id: data.attachment_id
			} );
		},
	} );


	/**
	 * wp.customize.SiteIconTool.ChoiceList
	 *
	 * @constructor
	 * @augments Backbone.Collection
	 */
	api.SiteIconTool.ChoiceList = Backbone.Collection.extend({
		model: api.SiteIconTool.ImageModel,

		// Ordered from most recently used to least
		comparator: function( model ) {
			return -model.get( 'icon' ).timestamp;
		},

		initialize: function() {
			var current = api.SiteIconTool.currentIcon.get( 'choice' ).replace( /^https?:\/\//, '' );

			// Overridable by an extending class
			if ( ! this.type ) {
				this.type = 'uploaded';
			}

			// Overridable by an extending class
			if ( typeof this.data === 'undefined' ) {
				this.data = _wpCustomizeSiteIcon.uploads;
			}

			this.on( 'control:setImage', this.setImage, this );
			this.on( 'control:removeImage', this.removeImage, this );

			_.each( this.data, function( elt, index ) {
				if (! elt.attachment_id ) {
					elt.defaultName = index;
				}

				if ( typeof elt.timestamp === 'undefined' ) {
					elt.timestamp = 0;
				}

				this.add( {
					icon: elt,
					choice: elt.url.split( '/' ).pop(),
					selected: current === elt.url.replace( /^https?:\/\//, '' )
				}, { silent: true } );
			}, this );

		},

		shouldHideTitle: function() {
			return this.size() < 1;
		},

		setImage: function( model ) {
			this.each( function( m ) {
				m.set('selected', false );
			} );

			if ( model ) {
				model.set('selected', true );
			}
		},

		removeImage: function() {
			this.each( function( m ) {
				m.set('selected', false );
			} );
		}
	} );

})( jQuery, window.wp );
