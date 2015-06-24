(function( $, wp, _ ) {

	if ( ! wp || ! wp.customize ) { return; }
	var api = wp.customize;

	/**
	 * Extends the doCrop function to use a custom ajax action
	 */
	wp.media.controller.siteIconCropper = wp.media.controller.Cropper.extend( {
		doCrop: function( attachment ) {
			return wp.ajax.post( 'site-icon-crop', {
				nonce: attachment.get( 'nonces' ).edit,
				id: attachment.get( 'id' ),
				cropDetails: attachment.get( 'cropDetails' )
			} );
		}
	} );


	/**
	 * wp.customize.SiteIconTool.CurrentView
	 *
	 * Displays the currently selected icon, or a placeholder in lack
	 * thereof.
	 *
	 * Instantiate with model wp.customize.SiteIconTool.currentIcon.
	 *
	 * @constructor
	 * @augments wp.Backbone.View
	 */
	api.SiteIconTool.CurrentView = wp.Backbone.View.extend({
		template: wp.template('site-icon-current'),

		initialize: function() {
			this.listenTo( this.model, 'change', this.render );
			this.render();
		},

		render: function() {
			this.$el.html( this.template( this.model.toJSON() ) );
			this.setPlaceholder();
			this.setButtons();
			return this;
		},

		getHeight: function() {
			var image = this.$el.find( 'img' ),
				saved, height, iconImageData;

			if ( image.length ) {
				this.$el.find('.inner').hide();
			} else {
				this.$el.find('.inner').show();
				return 40;
			}

			/*saved = this.model.get( 'savedHeight' );
			height = image.height() || saved;*/

			// happens at ready
			//if ( ! height ) {
				iconImageData = api.get().site_icon_data;

				if ( iconImageData && iconImageData.width && iconImageData.height ) {
					// hardcoded container width
					height = 192 / iconImageData.width * iconImageData.height;
				}
				else {
					// fallback for when no image is set
					height = 192;
				}
			//}

			return height;
		},

		setPlaceholder: function(_height) {
			var height = _height || this.getHeight();
			this.model.set( 'savedHeight', height );
			this.$el
				.add(this.$el.find('.placeholder'))
				.height(height);
		},

		setButtons: function() {
			var elements = $( '#customize-control-site_icon .actions .remove' );
			if ( this.model.get( 'choice' ) ) {
				elements.show();
			} else {
				elements.hide();
			}
		}
	});


	/**
	 * wp.customize.SiteIconTool.ChoiceView
	 *
	 * Represents a choosable site icon image, be it user-uploaded,
	 * theme-suggested or a special Randomize choice.
	 *
	 * Takes a wp.customize.SiteIconTool.ImageModel.
	 *
	 * Manually changes model wp.customize.SiteIconTool.currentIcon via the
	 * `select` method.
	 *
	 * @constructor
	 * @augments wp.Backbone.View
	 */
	api.SiteIconTool.ChoiceView = wp.Backbone.View.extend({
		template: wp.template( 'site-icon-choice' ),

		className: 'icon-view',

		events: {
			'click .choice,.random': 'select',
			'click .close': 'removeImage'
		},

		initialize: function() {
			var properties = [
				this.model.get('icon').url,
				this.model.get('choice')
			];

			this.listenTo( this.model, 'change:selected', this.toggleSelected );

			if ( _.contains( properties, api.get().site_icon ) ) {
				api.SiteIconTool.currentIcon.set( this.extendedModel() );
			}
		},

		render: function() {
			this.$el.html( this.template( this.extendedModel() ) );

			this.toggleSelected();
			return this;
		},

		toggleSelected: function() {
			this.$el.toggleClass( 'selected', this.model.get( 'selected' ) );
		},

		extendedModel: function() {
			var c = this.model.get( 'collection' );
			return _.extend( this.model.toJSON(), {
				type: c.type
			} );
		},

		getHeight: api.SiteIconTool.CurrentView.prototype.getHeight,

		setPlaceholder: api.SiteIconTool.CurrentView.prototype.setPlaceholder,

		select: function() {
			this.preventJump();
			this.model.save();
			api.SiteIconTool.currentIcon.set( this.extendedModel() );
		},

		preventJump: function() {
			var container = $( '.wp-full-overlay-sidebar-content' ),
				scroll = container.scrollTop();

			_.defer( function() {
				container.scrollTop(scroll);
			} );
		},

		removeImage: function(e) {
			e.stopPropagation();
			this.model.destroy();
			this.remove();
		}
	});


	/**
	 * wp.customize.SiteIconTool.ChoiceListView
	 *
	 * A container for ChoiceViews. These choices should be of one same type:
	 * user-uploaded site icons.
	 *
	 * Takes a wp.customize.SiteIconTool.ChoiceList.
	 *
	 * @constructor
	 * @augments wp.Backbone.View
	 */
	api.SiteIconTool.ChoiceListView = wp.Backbone.View.extend({
		initialize: function() {
			this.listenTo(this.collection, 'add', this.addOne);
			this.listenTo(this.collection, 'remove', this.render);
			this.listenTo(this.collection, 'sort', this.render);
			this.listenTo(this.collection, 'change', this.toggleList);
			this.render();
		},

		render: function() {
			this.$el.empty();
			this.collection.each(this.addOne, this);
			this.toggleList();
		},

		addOne: function(choice) {
			var view;
			choice.set({ collection: this.collection });
			view = new api.SiteIconTool.ChoiceView({ model: choice });
			this.$el.append(view.render().el);
		},

		toggleList: function() {
			var title = this.$el.parents().prev( '.customize-control-title' );

			if ( this.collection.shouldHideTitle() ) {
				title.hide();
			} else {
				title.show();
			}
		}
	});


	/**
	 * wp.customize.SiteIconTool.CombinedList
	 *
	 * Aggregates wp.customize.SiteIconTool.ChoiceList collections (or any
	 * Backbone object, really) and acts as a bus to feed them events.
	 *
	 * @constructor
	 * @augments wp.Backbone.View
	 */
	api.SiteIconTool.CombinedList = wp.Backbone.View.extend( {
		initialize: function( collections ) {
			this.collections = collections;
			this.on( 'all', this.propagate, this );
		},
		propagate: function( event, arg ) {
			_.each(this.collections, function( collection ) {
				collection.trigger( event, arg );
			} );
		}
	} );

})( jQuery, window.wp, _ );
