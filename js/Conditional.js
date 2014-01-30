/* Conditional.js
 *
 * This is essentially an if/else block with
 * conditions that can be updated dynamically
 * to trigger behavior.
 *
 * When writing forms, often mutliple pieces of
 * data must be validated before submission is
 * acceptable. Because the conditions are fufilled
 * in a non-sequential manner accross a page, this 
 * is often implemented with global variables.
 *
 * This class produces an object that can register
 * several conditions and perform a callback when
 * they evaluate to true and another when they 
 * evaluate to false. For instance, if a user
 * enters valid data into all fields then 
 * screws one up. 
 *
 * This is essentially a type of event aggregator
 * that focuses on validation.
 * 
 * Dependencies: None (EMCAScript 5)
 *
 * Author: William Silversmith
 * Affiliation: Seung Lab, Brain and Cognitive Sciences Dept., MIT
 * Date: August 2013
 */

 Conditional = {};

 (function (undefined) {
 	"use strict";

 	/* Conditional
 	 *
 	 * Creates a new conditional object.
 	 *
 	 * Optional:
 	 *   set: { name1: true, name2: false, etc }, a way of initializing some conditions
 	 *   data: { name2: something, name2: something, etc } link some data to conditions
 	 *	 success: callback when test returns true. 
 	 *   failure: callback when test returns false. 
 	 *   test: callback that returns a boolean based on status of registered conditions
 	 *      defaults to ANDing all of them.
     *
 	 *   All callbacks are of the following form:
 	 *
 	 *   function (conditions, data) { ... }
 	 *   
 	 *   Where:
 	 *		conditions: { name1: bool, name2: bool, etc }
 	 *      data: { name1: somedata, name2: somedata, etc }
 	 *
 	 * Returns: Conditional object (use new)
 	 */
	 Conditional.Conditional = function (args) {
	 	args = args || {};

	 	var noop = function (conds, data) {};

	 	this.conds = args.set || {};
	 	this.failure = args.failure || noop;
	 	this.success = args.success || noop;
	 	this.test = args.test || Conditional.and;
	 	this.data = args.data || {};
	 };

	 /* assess
	  *
	  * Peek at the test state without executing anything.
	  *
	  * Required: void
	  *    
	  * Returns: boolean result of test
	  */
	  Conditional.Conditional.prototype.assess = function () {
	  	return this.test(this.conds, this.data);
	  };

	 /* execute
	  *
	  * Executes the test and appropriate callbacks.
	  *
	  * Required: void
	  *
	  * Returns: boolean result of test
	  */
	 Conditional.Conditional.prototype.execute = function () {
	 	if (this.test(this.conds, this.data)) {
	 		this.success(this.conds, this.data);
	 		return true;
	 	}
	 	else {
	 		this.failure(this.conds, this.data);
	 		return false;
	 	}
	 };

	 /* set
	  *
	  * Add or reset the value of a registered condition and executes.
	  *
	  * Required:
	  *    [0] name: Name of the condition
	  *    [1] value: boolean
	  *
	  * Optional:
	  *    [2] data: Some sort of data structure to associate with 
	  *       this name. 
	  *
	  * Returns: void
	  */
	 Conditional.Conditional.prototype.set = function (name, value, data) {
	 	this.lazySet(name, value, data);
		this.execute();
	 };

	 /* lazySet
	  *
	  * Sets a condition.
	  *
	  * Parameters: same as set
	  *
	  * Returns: void
	  */
	 Conditional.Conditional.prototype.lazySet = function (name, value, data) {
	 	this.conds[name] = value || false;

	 	if (data !== undefined) {
	 		this.data[name] = data;
	 	}
	 	else {
	 		this.data[name] = null;
	 	}
	 };

	 /* remove
	  *
	  * Deletes a condition and executes.
	  *
	  * Required: 
	  *   [0] name: Name of the condition 
	  *
	  * Returns: void
	  */
	 Conditional.Conditional.prototype.remove = function (name) {
	 	this.lazyRemove(name);
		this.execute();
	 };

	 /* lazyRemove
	  *
	  * Deletes a condition and does not execute.
	  *
	  * Required:
	  *   [0] name: The name of the condition
	  * Returns: void
	  */
	 Conditional.Conditional.prototype.lazyRemove = function (name) {
	 	delete this.conds[name];
	 	delete this.data[name];
	 };

	 /* The following functions are not part of the Conditional object,
	  * however, they may be useful in constructing test functions.
	  */

	 /* and
	  *
	  * Simply ANDs every conditional together.
	  *
	  * Required:
	  *   [0] conds
	  *   [1] data
	  *
	  * Returns: boolean
	  */
	 Conditional.and = function (conds, data) {
 		var values = Object.keys(conds).map(function (key) { return conds[key] });
 		return values.reduce(function (a, b) { return a && b }, true);
 	};

 	 /* nand
	  *
	  * Simply nots the conjuntion of every conditional.
	  *
	  * Required: same as and
	  *
	  * Returns: boolean
	  */
	 Conditional.nand = function () {
 		return !Conditional.and.apply(this, arguments);
 	};

	/* or
	 *
	 * Simply ORs every conditional together.
	 *
	 * Required:
	 *   [0] conds
	 *   [1] data
	 *
	 * Returns: boolean
	 */
 	Conditional.or = function (conds, data) {
		var values = Object.keys(conds).map(function (key) { return conds[key] });
 		return values.reduce(function (a, b) { return a || b }, true);
 	};

	/* nor
	 *
	 * Negation of: the disjunction of all the conditions.
	 *
	 * Required: same as or
	 *
	 * Returns: boolean
	 */
 	Conditional.nor = function () {
		return !Conditional.or.apply(this, arguments);
 	};

	/* xor
	 *
	 * Simply XORs every conditional together.
	 *
	 * Required:
	 *   [0] conds
	 *   [1] data
	 *
	 * Returns: boolean
	 */
 	Conditional.xor = function (conds, data) {
		var values = Object.keys(conds).map(function (key) { return conds[key] });
 		return values.reduce(function (a, b) { return !(a && b) && (a || b) }, true);
 	};

 })();

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
 