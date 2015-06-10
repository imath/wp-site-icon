/* globals _wpCustomizeSiteIcon, _wpMediaViewsL10n */
(function( exports, $ ){
	var api = wp.customize;

	/**
	 * @class
	 * @augments wp.customize.Control
	 * @augments wp.customize.Class
	 */
	api.SiteIconControl = api.Control.extend({
		ready: function() {
			this.btnRemove = $('#customize-control-site_icon .actions .remove');
			this.btnNew    = $('#customize-control-site_icon .actions .new');

			_.bindAll(this, 'openMedia', 'removeImage');

			this.btnNew.on( 'click', this.openMedia );
			this.btnRemove.on( 'click', this.removeImage );

			api.SiteIconTool.currentIcon = this.getInitialIcon();

			new api.SiteIconTool.CurrentView({
				model: api.SiteIconTool.currentIcon,
				el: '#customize-control-site_icon .current .container'
			});

			new api.SiteIconTool.ChoiceListView({
				collection: api.SiteIconTool.UploadsList = new api.SiteIconTool.ChoiceList(),
				el: '#customize-control-site_icon .choices .uploaded .list'
			});

			api.SiteIconTool.combinedList = api.SiteIconTool.CombinedList = new api.SiteIconTool.CombinedList([
				api.SiteIconTool.UploadsList
			]);
		},

		/**
		 * Returns a new instance of api.SiteIconTool.ImageModel based on the currently
		 * saved site icon (if any).
		 *
		 * @returns {Object} Options
		 */
		getInitialIcon: function() {
			if ( ! api.get().site_icon || ! api.get().site_icon_data || _.contains( [ 'remove-icon' ], api.get().site_icon ) ) {
				return new api.SiteIconTool.ImageModel();
			}

			// Get the matching uploaded image object.
			var currentIconObject = _.find( _wpCustomizeSiteIcon.uploads, function( imageObj ) {
				return ( imageObj.attachment_id === api.get().site_icon_data.attachment_id );
			} );
			// Fall back to raw current image.
			if ( ! currentIconObject ) {
				currentIconObject = {
					url: api.get().site_icon,
					thumbnail_url: api.get().site_icon,
					attachment_id: api.get().site_icon_data.attachment_id
				};
			}

			return new api.SiteIconTool.ImageModel({
				icon: currentIconObject,
				choice: currentIconObject.url.split( '/' ).pop()
			});
		},

		/**
		 * Returns a set of options, computed from the attached image data and
		 * theme-specific data, to be fed to the imgAreaSelect plugin in
		 * wp.media.view.Cropper.
		 *
		 * @param {wp.media.model.Attachment} attachment
		 * @param {wp.media.controller.Cropper} controller
		 * @returns {Object} Options
		 */
		calculateImageSelectOptions: function(attachment, controller) {
			var xInit = parseInt(_wpCustomizeSiteIcon.data.width, 10),
				yInit = parseInt(_wpCustomizeSiteIcon.data.height, 10),
				realWidth = attachment.get('width'),
				realHeight = attachment.get('height');

			controller.set( 'canSkipCrop', false );

			return {
				handles     : true,
				keys        : true,
				instance    : true,
				persistent  : true,
				imageWidth  : realWidth,
				imageHeight : realHeight,
				aspectRatio : '1:1',
				maxHeight   : yInit,
				maxWidth    : xInit,
				x1          : 0,
				y1          : 0,
				x2          : xInit,
				y2          : yInit
			};
		},

		/**
		 * Sets up and opens the Media Manager in order to select an image.
		 * A cropping step after selection is also triggered.
		 *
		 * @param {event} event
		 */
		openMedia: function(event) {
			var l10n = _wpMediaViewsL10n;

			event.preventDefault();

			this.frame = wp.media({
				button: {
					text: l10n.selectAndCrop,
					close: false
				},
				states: [
					new wp.media.controller.Library({
						title:     l10n.chooseImage,
						library:   wp.media.query({ type: 'image' }),
						multiple:  false,
						date:      false,
						priority:  20,
						suggestedWidth: _wpCustomizeSiteIcon.data.width,
						suggestedHeight: _wpCustomizeSiteIcon.data.height
					}),
					new wp.media.controller.Cropper({
						imgSelectOptions: this.calculateImageSelectOptions
					})
				]
			});

			this.frame.on('select', this.onSelect, this);
			this.frame.on('cropped', this.onCropped, this);

			this.frame.open();
		},

		/**
		 * After an image is selected in the media modal,
		 * switch to the cropper state.
		 */
		onSelect: function() {
			this.frame.setState('cropper');
		},

		/**
		 * After the image has been cropped, apply the cropped image data to the setting.
		 *
		 * @param {object} croppedImage Cropped attachment data.
		 */
		onCropped: function(croppedImage) {
			var url = croppedImage.post_content,
				attachmentId = croppedImage.attachment_id,
				w = croppedImage.width,
				h = croppedImage.height;
			this.setImageFromURL(url, attachmentId, w, h);
		},

		/**
		 * Creates a new wp.customize.SiteIconTool.ImageModel from provided
		 * header image data and inserts it into the user-uploaded headers
		 * collection.
		 *
		 * @param {String} url
		 * @param {Number} attachmentId
		 * @param {Number} width
		 * @param {Number} height
		 */
		setImageFromURL: function(url, attachmentId, width, height) {
			var choice, data = {};

			data.url = url;
			data.thumbnail_url = url;
			data.timestamp = _.now();

			if (attachmentId) {
				data.attachment_id = attachmentId;
			}

			if (width) {
				data.width = width;
			}

			if (height) {
				data.height = height;
			}

			choice = new api.SiteIconTool.ImageModel({
				icon: data,
				choice: url.split('/').pop()
			});
			api.SiteIconTool.UploadsList.add(choice);
			api.SiteIconTool.currentIcon.set(choice.toJSON());
			choice.save();
			choice.importImage();
		},

		/**
		 * Triggers the necessary events to deselect an image which was set as
		 * the currently selected one.
		 */
		removeImage: function() {
			api.SiteIconTool.currentIcon.trigger('hide');
			api.SiteIconTool.CombinedList.trigger('control:removeImage');
		}

	});

	$( function() {
		api.settings = window._wpCustomizeSettings;

		var control = new api.SiteIconControl( 'site_icon', {
			params:    api.settings.controls.site_icon_data,
			previewer: api.previewer
		} );
		api.control.add( 'site_icon', control );
	});

})( wp, jQuery );
