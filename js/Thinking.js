/* Thinking.js
 *
 * An idle timer designed to integrate well with 
 * jQuery that is oriented toward allowing a user
 * to get more information while they are thinking.
 * 
 *   Example use case:
 *
 *    $('#username')
 *		.thinking(function () {
 *			validate(this.value); // validates when user pauses to think for a bit
 *		})
 *		.on('blur', function () {
 *			validate(this.value); 
 *	   	});
 *
 *    ...sometime later...
 *   
 *    $('#username').thinking('clear'); // Removes all thinking related events.
 *
 * The delay and events that reset the clock are configurable. See the function
 * signature of thinking for more information.
 *
 * Dependencies: 
 *	jQuery
 *
 * Author: William Silversmith
 * Affiliation: Seung Lab, Brain and Cognitive Sciences Dept., MIT
 * Date: August 2013
 *
 * Based on Henrique Boaventura's jquery.idle.js:
 *
 * ------------------- LICENSE FOR jquery.idle.js -----------------------
 *   Copyright (C) 2013, Henrique Boaventura (hboaventura@gmail.com).
 *
 *   MIT License:
 *   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *   - The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *   - THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * -----------------------------------------------------------------------
 * 
 * You can find jquery.idle.js at https://github.com/kidh0/jquery.idle as of this writing. (Aug. 2013)
 */

;(function ($, undefined) {
	"use strict";

	/* thinking
	 *
	 * Create an event handler for 'thinking' similar to $(element).click(...).
	 * Except, this time the action... is inaction! Use this to assist the
	 * user in cases where they have paused in the middle of an activity,
	 * probably because they were thinking.
	 *
	 * Signature: .thinking([[settings], thinkingEventHandler])
	 *
	 * This lends itself to the following patterns:
	 *
	 * 1) $(element).thinking('start').on('thinking', fn);
	 * 2) $(element).thinking(fn); // same effect as (1)
	 * 3) $(element).thinking({ idle: 5000 }); // set delay to 5000 msec, no handler
	 * 4) $(element).thinking({ idle: 5000 }, fn); // set delay to 5000 msec, handler set
	 * 5) $(element).thinking({ idle: 5000 }).on('thinking', fn); // same as (4)
	 *
	 * // triggers 'thinking' event iff startThinking has already been called
	 * // Same semantics as $(element).click(), except a process must be started first
	 * 6) $(element).thinking(); 
	 *
	 * Parameter Variations:
	 *
	 * 1) Configurable Event Handler
	 *   i) [0] callback - elem.thinking(function () { ... })
	 *  ii) [0] options [1] callback
	 *  		e.g. elem.thinking({ idle: msec, events: "keyup" }, function () { ... })
	 *
	 * 2) Manual Control
	 *   i) [0] command - 'start', 'done', 'clear', etc
	 *       e.g. elem.thinking('start');
	 *  ii) [0] options: { idle, events }
	 *      [1] command - 'start', 'done', 'clear', etc
	 *  
	 *    Command Summaries:
	 *      'start' - starts triggering 'thinking' events, though no listener may be present
	 *      'cancel' - terminates outstanding timers
	 *      'done' - terminates outstanding timers and clears clock reset triggers
	 *      'clear' - 'done' + removes blur/focus listeners that restart the clock 
	 *           and removes 'thinking' event handlers
	 *      'elapsed' - Get the time since the last timer reset in msec
	 *      'running' - Get whether the timer is running
	 *
	 * Returns: this (for chaining)
	 */
	$.fn.thinking = function () {
		if (!arguments.length) {
			return this.trigger('thinking');
		}

		var selector = this;

		var options = {};
		var fn;	
		if (typeof(arguments[0]) === 'string') {
			options = $.extend(options, arguments[1]);
			return command(selector, arguments[0], options);
		}
		else if (typeof(arguments[0]) === 'object') { 
			options = arguments[0]; // thinking({idle: 500})
			
			if (typeof(arguments[1]) === 'string') {
				return command(selector, arguments[1], options); // thinking({idle: 500}, 'start')
			}
			else {
				fn = arguments[1]; // thinking({idle: 500}, callback)
			}
		}
		else {
			fn = arguments[0]; // thinking(callback)
		}

		selector.on('focus.thinking', function () {
			startThinking(selector, options);
		});
		selector.on('blur.thinking', function () {
			doneThinking(selector);
		});

		if (fn) {
			selector.each(function (index, elem) {
				$(elem).on('thinking', fn);
			});
		}

		return selector;
	};

	/* defaults */

	$.fn.thinking.defaults = {
		idle: 1500, //idle time in ms

		//events that will trigger the idle resetter
		events: 'keydown keypress mousedown' // will be namespaced with .thinking 
	};

	/* command
	 *
	 * Figures out the right command to execute based on string
	 * input.
	 *
	 * Required:
	 *   [0] selector: jQuery object
	 *   [1] command: 'start', 'done', or 'clear'
	 *   [2] options: { idle, events }
	 *
	 * Returns: selector (for chaining)
	 */
	function command(selector, command, options) {
		if (command === 'start') {
			return startThinking(selector, options); // thinking('start', { idle: 500 })
		}
		else if (command === 'cancel') {
			return cancelThinking(selector); // thinking('cancel')
		}
		else if (command === 'done') {
			return doneThinking(selector); // thinking('done')
		}
		else if (command === 'clear') {
			return clearThinking(selector); // thinking('clear')
		}
		else if (command === 'running') {
			return selector.data('thinking') === 'active';
		}
		else if (command === 'elapsed') {
			if (selector.data('thinking') === 'active') {
				return (new Date()) - selector.data('thinking.lastreset');
			}

			return undefined;
		}

		return selector;
	}

	/* startThinking
	 *
	 * Allows manual control of when to start listening for
	 * events that reset the idle timer. Most use cases
	 * should use $.fn.thinking.
	 *
	 * Optional:
	 *   idle - wait time in milliseconds (default above)
	 *   events - e.g. "mousedown mouseover keyup"
	 *
	 * Returns: this (for chaining)
	 */
	function startThinking (selector, options) {
		var settings = $.extend({}, $.fn.thinking.defaults, options);

		settings.events = namespaceEvents(settings.events);

		var timeout = function (settings) {
			var id = setTimeout(function() {
				selector.data('thinking', 'idle');
				selector.trigger('thinking');
			}, settings.idle);

			var outstanding = selector.data('thinking.outstanding') || [];
			outstanding.push(id);
			selector.data('thinking.outstanding', outstanding);

			return id;
		};

		var resetTimeout = function (id, settings) {
			if (id) {
				clearTimeout(id);

				var outstandingids = selector.data('thinking.outstanding') || [];
				outstandingids = $.grep(outstandingids, function (outstanding) { return outstanding !== id; });
				selector.data('thinking.outstanding', outstandingids);
			}

			selector.data('thinking', 'active');
			selector.data('thinking.lastreset', new Date());
			return timeout(settings);
		};

		var timerid;
		return selector.each(function (index, elem) {
			$(elem).on(settings.events, function (evt) {
				timerid = resetTimeout(timerid, settings);
			});
		});
	}

	/* cancelThinking
	 *
	 * Manually cancels outstanding 'thinking' events.
	 *
	 * Required:
	 *   [0] selector
	 *
	 * Returns: selector (for chaining)
	 */
	function cancelThinking (selector) {
		var outstandingids = selector.data('thinking.outstanding') || [];
		for (var i = outstandingids.length - 1; i >= 0; i--) { 
			clearTimeout(outstandingids[i]);
		}

		selector.removeData('thinking.lastreset');
		selector.removeData('thinking.outstanding');

		return selector;
	}

	/* doneThinking
	 *
	 * Manually cancels outstanding 'thinking' events and clears 
	 * out residual data.
	 *
	 * Required:
	 *   [0] selector
	 *
	 * Returns: selector (for chaining)
	 */
	function doneThinking (selector) {
		cancelThinking(selector);
		selector.off(".thinking-trigger"); // Removes clock resets (e.g. keydown)
		selector.removeData('thinking');

		return selector;
	}

	/* clearThinking
	 *
	 * Performs same actions as doneThinking but also
	 * removes the relevant focus/blur events and handlers as well.
	 *
	 * Required: 
	 *   [0] selector
	 *
	 * Returns: selector (for chaining)
	 */
	function clearThinking (selector) {
		return selector
			.thinking('done')    // stop the clock and remove clock resets
			.off('thinking')   // clear event handlers
			.off('.thinking'); // clear focus / blur activation
	}

	/* namespaceEvents
	 *
	 * Namespaces every event in a jQuery event specifier string.
	 * 
	 * e.g. "keyup keypress.thinking mousedown.rawr.thinking-trigger" 
	 *   => "keyup.thinking-trigger keypress.thinking-trigger mousedown.rawr.thinking-trigger"
	 *
	 * Required:
	 *    [0] specifier (see example)
	 *
	 * Returns: event string namespaced with '.thinking-trigger'
	 */
	function namespaceEvents (specifier) {
		specifier = $.trim(specifier) || '';
		if (!specifier) {
			return '';
		}

		var specifiers = specifier.replace(/\.thinking(-trigger)?/g, '').split(/\s+/);
		specifier = "";

		for (var i = 0; i < specifiers.length; i++) {
			var item = specifiers[i];
			specifier += item + ".thinking-trigger ";
		}

		return $.trim(specifier);
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
