/* centerIn.js
 *
 * jQuery plugin that allows you to center an element within an element.
 *
 * Author: William Silversmith
 * Affiliation: Seung Lab, Brain and Cognitive Sciences Dept., MIT
 * Date: August 2013
 */
;(function($, undefined) {

	/* centerIn
	 *
	 * Centers the element with respect to
	 * the first element of the given selector
	 * both horizontally and vertically.
	 *
	 * Required:
	 *	 [0] selector: The element to center within
	 *
	 * Options:
	 *	 direction: 'horizontal', 'vertical', 'both' (default)
	 *	 top: Additional offset in px
	 *	 left: Additional offset in px
	 *
	 * Returns: void
	 */
	$.fn.centerIn = function (selector, options) {
		var elements = this;
		options = options || {};

		var direction = options.direction || $.fn.centerIn.defaults.direction;
		var extraleft = options.left || 0;
		var extratop = options.top || 0;

		selector = $(selector).first();

		try {
			if (!selector.css('position') || selector.css('position') === 'static') {
				selector.css('position', 'relative'); 
			}
		}
		catch (e) {
			// selector was something like window, document, html, or body
			// which doesn't have a position attribute
		};

		var horizontal = function (element) {
			var left = (selector.innerWidth() - element.innerWidth()) / 2;
			left += extraleft;
			element.css('left', left + "px");
		};

		var vertical = function (element) {
			var top = (selector.innerHeight() - element.innerHeight()) / 2;
			top += extratop;
			element.css('top', top + "px");
		};

		var centerfn = composeFunctions(horizontal, vertical, direction);

		elements.each(function (index, element) {
			element = $(element);

			if (element.css("position") !== 'fixed') {
				element.css("position", 'absolute');
			}
			centerfn(element);
		});

		return this;
	};

	/* alwaysCenterIn
	 * 
	 * Maintains centering even on window resize.
	 */
	$.fn.alwaysCenterIn = function () {
		var args = arguments || []; 
		var selector = $(this);

		selector.centerIn.apply(selector, args);

		var evt = 'resize.centerIn';
		if (selector.attr('id')) {
			evt += '.' + selector.attr('id');
		}

		$(window).on(evt, function () {
			selector.centerIn.apply(selector, args);
		});
	 };

	/* Defaults */

	$.fn.centerIn.defaults = {
		direction: 'both'
	};

	function composeFunctions(horizontal, vertical, direction) {
		if (!direction || direction === 'both') {
			return function (element) { 
				vertical(element);
				horizontal(element);
			};
		}
		else if (direction === 'horizontal') {
			return function (element) { 
				horizontal(element) 
			};
		}
		else if (direction === 'vertical') {
			return function (element) {
				vertical(element);
			};
		}

		return function () {};
	}
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