/* Attention.js
 *
 * Create light boxes without messing up the DOM
 * or event handlers.
 *
 * Attention extracts the first item matching the
 * selector and pops it into an overlay. When the
 * overlay is dismissed, the DOM is returned to its
 * previous state.
 *
 * Dependencies: 
 *   jQuery
 *
 * CSS Classes:
 *   attention-overlay (the background)
 *   attention-display (the lightbox)
 *
 * Author: William Silversmith
 * Affiliation: Seung Lab, MIT 
 * Date: June-July 2013
 */

Attention = {};

(function ($, undefined) {
	"use strict";

	var placeholderid = 0;
	var opendialogs = [];

	/* Attention
	 *
	 * Constructor for an attention object.
	 *
	 * If you expect to use the same widget in multiple situations
	 * and want to style it slightly differently in each case,
	 * you can specify a situation name so that you can condition on it
	 * for the CSS.
	 *
	 * Required:
	 *   selector: A CSS selector that uniquely identifies
	 *     an object.
	 *
	 * Optional:
	 *   situation: A name for the situation 
	 *   dismiss: "auto" / "manual"
	 *
	 * Returns: Attention object
	 */
	Attention.Attention = function (args) {
		args = args || {};

		this.selector = args.selector;
		this.placeholderid = "attention-placeholder-" + placeholderid;
		this.showing = false; // Whether the attention object is being displayed
		this.originalvisibility = null; // the inital visibility state of the HTML selected
		this.callbacks = {}; // for later use
		this.autodismiss = args.dismiss || "auto";

		this.situation = args.situation;

		placeholderid++;
	};

	/* show
	 *
	 * Displays the overlay. 
	 *
	 * Structure:
	 *
	 * <div class="attention-overlay">
	 *    <div>
	 *      <*yourselection* class="attention-display">
	 *
	 * Required: None
	 *
	 * Returns: this (for chaining)
	 */
	Attention.Attention.prototype.show = function (args) {
		if (this.showing) {
			return;
		}

		this.showing = true;

		this.box = $(this.selector).first();

		this.originalvisibility = {
			visibility: this.box.css('visibility'),
			display: this.box.css('display')
		}; 

		var placeholder = $("<div>")
			.attr('id', this.placeholderid)
			.css('display', 'none');

		this.box.after(placeholder);

		this.overlay = $("<div>")
			.attr('tabindex', -1) // enables focus on div for capturing keyboard events
			.addClass("attention-overlay")
			.css('height', "100%")
			.css('width', "100%")
			.css("position", "fixed")
			.css('top', '0px')
			.css('left', '0px');

		this.overlay.css('z-index', determineZIndex(this));

		this.box.addClass('attention-display');

		if (this.situation) {
			this.overlay.addClass(this.situation);
		}

		this.box.detach();
		this.overlay.append(this.box);
		$('body').append(this.overlay);

		this.overlay.show();
		this.box.show();

		if (this.autodismiss === 'auto') {
			bindDefaultHandlers(this);
		}

		this.overlay.focus(); // used for capturing keyboard events on a div

		opendialogs.push(this);

		this.callbacks.show = this.callbacks.show || [];
		for (var i = 0; i < this.callbacks.show.length; i++) {
			this.callbacks.show[i].apply();
		}		

		return this;
	};

	/* bindDefaultHandlers
	 *
	 * Activates various ways to dismiss the lightbox if 
	 * autodismiss is set to "auto".
	 * e.g. Clicking off of it and the esc key.
	 *
	 * Required: 
	 *   [0] attention
	 *
	 * Returns: void
	 */
	function bindDefaultHandlers(attention) {
		attention.overlay.on('click.Attention', function (event) {
			attention.dismiss();
		});

		$(attention.overlay).on("keypress.Attention", function (event) {
			event.stopPropagation();
		});

		$(attention.overlay).on("keydown.Attention", function (event) {
			event.stopPropagation();
		});

		$(attention.overlay).on("keyup.Attention", function (event) {
			event.stopImmediatePropagation();
			if (event.keyCode === 27) { // esc 
				attention.dismiss();
			}
		});

		attention.box.on('click.Attention', function (event) { 
			event.stopPropagation();
		});
	}

	/* determineZIndex
	 *
	 * Helper function that computes the highest necessary z-index so that the current
	 * overlay will be on top.
	 *
	 * Required:
	 *   [0] attention
	 *
	 * Returns: (int) z-index
	 */
	function determineZIndex(attention) {
		var z = attention.overlay.css('z-index');

		if (!z && z !== 0) {
			if (opendialogs.length) {
				var maxz = opendialogs[0].overlay.css('z-index');
				for (var i = 1; i < opendialogs.length; i++) {
					var nextz = opendialogs[i].overlay.css('z-index') || 0;
					if (nextz > maxz) {
						maxz = nextz; 
					}
				}

				return maxz + 1;
			}
		}

		return 5000;
	}

	/* dismiss
	 *
	 * Hides the overlay and restores the DOM state.
	 *
	 * Required: none
	 *
	 * Returns: this (for chaining)
	 */
	Attention.Attention.prototype.dismiss = function (args) {
		if (!this.showing) {
			return;
		}
		this.showing = false;

		var placeholder = $('#' + this.placeholderid);

		$(this.overlay).off("keyup.Attention");

		var that = this;
		this.overlay.fadeOut(200, function () {
			that.box.detach();
			that.box.off('click.Attention');
			placeholder.before(that.box);
			placeholder.remove();

			if (that.situation) {
				that.overlay.removeClass(that.situation);
			}

			that.overlay.remove();
			that.overlay = null;

			that.box.css('visibility', that.originalvisibility.visibility);
			that.box.css('display', that.originalvisibility.display);
			that.box.removeClass('attention-display');

			if (opendialogs.length) {
				var previousattention = opendialogs[opendialogs.length - 1];
				previousattention.overlay.focus();
			}

			that.callbacks.dismiss = that.callbacks.dismiss || [];
			for (var i = 0; i < that.callbacks.dismiss.length; i++) {
				that.callbacks.dismiss[i].apply();
			}
		});

		opendialogs = $.grep(opendialogs, function (elem,i) {
			return elem !== that;
		});

		return this;
	};

	/* on
	 *
	 * Attach callbacks to specified actions.
	 *
	 * Required:
	 *	[0] action: 'show', 'dismiss', etc. The action we want to attach a callback to.
	 *  [1] fn
	 *
	 * Returns: void
	 */
	 Attention.Attention.prototype.on = function (action, fn) {
		this.callbacks = this.callbacks || {};
		this.callbacks[action] = this.callbacks[action] || [];

		this.callbacks[action].push(fn);
	 };

	 /* off
	  *
	  * Removes callbacks from a specified action.
	  * If fn is specified, it will remove that handler.
	  * If fn is not specifed, all callbacks for that action
	  * will be removed.
	  *
	  * Required:
	  *	 [0] action
	  *
	  * Optional:
	  *  [1] fn
	  *
	  * Returns: void
	  */
	  Attention.Attention.prototype.off = function (action, fn) {
		this.callbacks = this.callbacks || {};

		if (!this.callbacks[action]) {
			return;
		}

		if (fn) {
			this.callbacks[action] = $.grep(this.callbacks[action], function (elem, index) {
				return elem !== fn;
			});
		}
		else {
			this.callbacks[action] = [];
		}
	  };

})(jQuery);


/* The MIT License (MIT)

Copyright (c) 2014 Seung Lab, MIT

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/