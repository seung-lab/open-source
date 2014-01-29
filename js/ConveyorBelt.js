/* ConveyorBelt.js
 *
 * Constructs a queue that processes functions added to it
 * in intervals. This is useful for doing things like throttling
 * a deluge of rendering operations without missing any crucial 
 * steps.
 *
 * How to Use:
 *
 * var belt = new ConveyorBelt.ConveyorBelt(35) // msec or 'immediate'
 * 
 * while (something) {
 *	  belt.add(something.render()); // renders every 35msec until complete (not a hard guarantee)
 * }
 *
 * You can start, stop, flush, and burn down the queue at any time.
 *
 * Dependencies: None
 *
 * Author: William Silversmith
 * Affiliation: Seung Lab, MIT 
 * Date: December 2013 - January 2014
 */

ConveyorBelt = {};

(function (undefined) {
	"use strict";

	/* ConveyorBelt
	 *
	 * New this to create a new belt. 
	 *
	 * Required: 
	 *   [0] speed: execution interval in msec or 'immediate'
	 *      if speed is 'immediate', no throttling will take place at all
	 *      and added functions will be executed on the spot.
	 * 
	 * Returns: this (requires new)
	 */
	ConveyorBelt.ConveyorBelt = function (speed) {
		this.queue = [];
		this.speed = speed; // msec

		this.timerid = null;
		this.active = false;

		// Since the queue halts if it's empty, 
		// it's very cheap to keep it active since
		// most of the time you'll want to just
		// add stuff to it and never stop it.
		this.start(); 
	};

	/* add
	 *
	 * Adds an item onto the queue. Only functions are
	 * allowed.
	 *
	 * Required:
	 *   [0] fn: Some function you want executed at a certain pace
	 *
	 * Returns: this (for chaining)
	 */
	ConveyorBelt.ConveyorBelt.prototype.add = function (fn) {
		this.queue.push(fn);

		if (!this.active) {
			return this;
		}

		if (this.speed === 'immediate') {
			this.burn();
		}
		else if (!this.timerid) {
			this.timerid = setInterval(this.process.bind(this), this.speed);
		}

		return this;
	};

	/* process
	 *
	 * Used internally. THis is what actually processes the queue at
	 * each time step. If the queue is empty, to conserve resources,
	 * the interval timer is cleared until new units are added.
	 *
	 * Required: None
	 *
	 * Returns: this (for chaining)
	 */
	ConveyorBelt.ConveyorBelt.prototype.process = function () {
		if (this.speed !== 'immediate' && this.queue.length === 0) {
			clearInterval(this.timerid);
			this.timerid = null;
			return;
		}

		var fn = this.queue.pop();
		fn();

		return this;
	};

	/* start
	 *
	 * Starts the conveyor belt moving (i.e. functions will be called
	 * every this.speed msec).
	 *
	 * Optional:
	 *   [0] speed: Optionally restart at the given speed (msec or 'immediate')
	 *
	 * Returns: this (for chaining)
	 */
	ConveyorBelt.ConveyorBelt.prototype.start = function (speed) {
		this.stop();
		this.active = true;

		if (speed !== undefined) {
			this.speed = speed;
		}

		if (this.speed === 'immediate') {
			this.timerid = null;
			this.burn();
		}
		else {
			this.timerid = setInterval(this.process.bind(this), this.speed);
		}

		return this;
	};

	/* stop
	 *
	 * Stops the ConveyorBelt. No more functions will be called 
	 * automatically and the queue will not shrink unless
	 * explicitly performed.
	 *
	 * Required: None
	 *
	 * Returns: this (for chaining)
	 */
	ConveyorBelt.ConveyorBelt.prototype.stop = function () {
		this.active = false;

		if (this.timerid) {
			clearInterval(this.timerid);
			this.timerid = null;
		}

		return this;
	};

	/* flush
	 *
	 * Removes all queued requests.
	 *
	 * Required: None
	 *
	 * Optional:
	 *   [0] amount: number of items to flush (default all)
	 *
	 * Returns: this (for chaining)
	 */
	ConveyorBelt.ConveyorBelt.prototype.flush = function (amount) {
		if (amount === undefined) {
			this.queue = [];
		}
		else {
			this.queue = this.queue.slice(0, amount);
		}

		return this;
	};

	/* burn
	 *
	 * In one shot, process queued items as fast as possible up to an optional limit.
	 *
	 * Required: None
	 *
	 * Optional:
	 *   [0] amount: The number to burn down (default all)
	 *
	 * Returns: this (for chaining)
	 */
	ConveyorBelt.ConveyorBelt.prototype.burn = function (amount) {
		var restart = this.active;
		
		if (amount === undefined) {
			amount = this.queue.length;
		}

		var limit = Math.min(amount, this.queue.length);
		for (var count = limit - 1; count >= 0; count--) {
			var fn = this.queue.pop();
			fn();
		}

		return this;
	};

	/* decimate
	 *
	 * Knock out some of the items at regular intervals ensuring that the final
	 * call is invoked no matter what.
	 *
	 * Historical note: The name comes from the punishment Roman commanders
	 * would apply to groups that ran from battle. One in ten men would be
	 * executed, hence "deci". Here, we are more flexible and provide a 
	 * percentage argument. You're welcome.
	 *
	 * Required: 
	 *   [0] factor: [0, 1] (i.e. the Romans would have picked .1)
	 *       Note: Chose factor instead of percent for clarity, e.g. decimate(70) vs decimate(.7)
	 *        .7 more clearly implies a factor, whereas percent could simply mean 70 units
	 * 
	 * Returns: void
	 */
	ConveyorBelt.ConveyorBelt.prototype.decimate = function (factor) {
		if (this.queue.length <= 1) {
			return;
		}

		factor = Utils.cutoff(factor, 0, 1);
		var reduction = Math.round(this.queue.length * factor);

		var increment = Math.floor(this.queue.length / reduction);

		var i = 0;
		var loop = 0;
		while (reduction > 0) {
			i = (i + increment) % this.queue.length;

			if (i === this.queue.length - 1) { // protect the final operation
				continue;
			}

			if (this.queue[i]) {
				// didn't mark as no-op yet b/c need to skip over things we already did and need to detect that
				this.queue[i] = null; 
				reduction--;
			}

			loop++; 

			// to compensate for getting stuck a closed (mathematical) group (modulo is weird)
			if (loop % this.queue.length === 0) {
				if (increment > 1) {
					increment--;
				}
				else {
					increment = 1;
				}
			} 
		}

		// Now clean up after ourselves
		for (i = this.queue.length - 2; i >= 0; i--) {
			if (this.queue[i] === null) {
				this.queue[i] = function () {}; // no op
			}
		}
	};

})();



