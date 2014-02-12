/* centerIn.js
 *
 * jQuery plugin that allows you to center an element within an element.
 *
 * Author: William Silversmith
 * Affiliation: Seung Lab, Brain and Cognitive Sciences Dept., MIT
 * Date: August 2013 - February 2014
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
	 *   [1] options or callback
	 *   [2] callback (if [1] is options): Mostly useful for alwaysCenterIn
	 *
	 * Options:
	 *	 direction: 'horizontal', 'vertical', 'both' (default)
	 *	 top: Additional offset in px
	 *	 left: Additional offset in px
	 *
	 * Returns: void
	 */
	$.fn.centerIn = function (selector, options, callback) {
		var elements = this;
		options = options || {};

        if (typeof(options) === 'function') {
            callback = options;
            options = {};
        }

		var direction = options.direction || $.fn.centerIn.defaults.direction;
		var extraleft = options.left || 0;
		var extratop = options.top || 0;

		if (selector) {
			selector = $(selector).first();
		}
		else {
			selector = elements.first().parent();
		}

		try {
			if (!selector.css('position') || selector.css('position') === 'static') {
				selector.css('position', 'relative'); 
			}
		}
		catch (e) {
			// selector was something like window, document, html, or body
			// which doesn't have a position attribute
		}

		var horizontal = function (element) {
			var left = Math.round((selector.innerWidth() - element.outerWidth(false)) / 2);
			left += translateDisplacement(selector, extraleft, 'width');
			element.css('left', left + "px");
		};

		var vertical = function (element) {
			var top = Math.round((selector.innerHeight() - element.outerHeight(false)) / 2);
			top += translateDisplacement(selector, extratop, 'height');
			element.css('top', top + "px");
		};

		var centerfn = constructCenterFn(horizontal, vertical, callback, direction);

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

		return this;
	 };

	/* Defaults */

	$.fn.centerIn.defaults = {
		direction: 'both'
	};

    /* translateDisplacement
     *
     * Translates dimensionless units, pixel measures, and percent
     * measures into px.
     *
     * Required: 
     *   [0] selector: Container, relevant for percent measures
     *   [1] value: Amount to displace. e.g. 5, "5px", or "5%"
     *   [2] direction: 'width' or 'height'
     * 
     * Returns: px
     */
    function translateDisplacement(selector, value, direction) {
        if (typeof(value) === 'number') {
            return value;
        }
        else if (/px$/i.test(value)) {
            return parseFloat(value.replace('px', ''), 10);
        }
        else if (/%$/.test(value)) {
            var total = (direction === 'width')
                ? $(selector).innerWidth()
                : $(selector).innerHeight();

            value = parseFloat(value.replace('%', ''), 10);
            value /= 100;

            return value * total;
        }

        return parseFloat(value, 10);
    }

	function constructCenterFn(horizontal, vertical, callback, direction) {
        var fns = []

		if (!direction || direction === 'both') {
			fns.push(vertical);
            fns.push(horizontal);
		}
		else if (direction === 'horizontal') {
            fns.push(horizontal);
		}
		else if (direction === 'vertical') {
            fns.push(vertical);
		}

        if (callback) {
            fns.push(callback);
        }

		return Utils.compose(fns);
	}
})(jQuery);