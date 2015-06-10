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
	api.SiteIconTool.ImageModel = Backbone.Model.extend({
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
			this.on('hide', this.hide, this);
		},

		hide: function() {
			this.set('choice', '');
			api('site_icon').set('remove-icon');
			api('site_icon_data').set('remove-icon');
		},

		save: function() {
			if (this.get('icon').defaultName) {
				api('site_icon').set(this.get('icon').url);
				api('site_icon_data').set(this.get('icon').defaultName);
			} else {
				api('site_icon').set(this.get('icon').url);
				api('site_icon_data').set(this.get('icon'));
			}

			api.SiteIconTool.combinedList.trigger('control:setImage', this);
		}
	});


	/**
	 * wp.customize.SiteIconTool.ChoiceList
	 *
	 * @constructor
	 * @augments Backbone.Collection
	 */
	api.SiteIconTool.ChoiceList = Backbone.Collection.extend({
		model: api.SiteIconTool.ImageModel,

		// Ordered from most recently used to least
		comparator: function(model) {
			return -model.get('icon').timestamp;
		},

		initialize: function() {
			var current = api.SiteIconTool.currentIcon.get('choice').replace(/^https?:\/\//, '');

			// Overridable by an extending class
			if (!this.type) {
				this.type = 'uploaded';
			}

			// Overridable by an extending class
			if (typeof this.data === 'undefined') {
				this.data = _wpCustomizeSiteIcon.uploads;
			}

			this.on('control:setImage', this.setImage, this);
			this.on('control:removeImage', this.removeImage, this);

			_.each(this.data, function(elt, index) {
				if (!elt.attachment_id) {
					elt.defaultName = index;
				}

				if (typeof elt.timestamp === 'undefined') {
					elt.timestamp = 0;
				}

				this.add({
					icon: elt,
					choice: elt.url.split('/').pop(),
					selected: current === elt.url.replace(/^https?:\/\//, '')
				}, { silent: true });
			}, this);

		},

		shouldHideTitle: function() {
			return true;
		},

		setImage: function(model) {
			this.each(function(m) {
				m.set('selected', false);
			});

			if (model) {
				model.set('selected', true);
			}
		},

		removeImage: function() {
			this.each(function(m) {
				m.set('selected', false);
			});
		}
	});


	/**
	 * wp.customize.SiteIconTool.DefaultsList
	 *
	 * @constructor
	 * @augments wp.customize.SiteIconTool.ChoiceList
	 * @augments Backbone.Collection
	 */
	api.SiteIconTool.DefaultsList = api.SiteIconTool.ChoiceList.extend({
		initialize: function() {
			this.type = 'default';
			this.data = _wpCustomizeSiteIcon.defaults;
			api.SiteIconTool.ChoiceList.prototype.initialize.apply(this);
		}
	});

})( jQuery, window.wp );
