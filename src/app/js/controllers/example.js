'use strict';

var controllersModule = require('./_index');

/**
 * @ngInject
 */
function ExampleCtrl() {

	// ViewModel
	var self = this;

	self.title = 'AngularJS, Gulp, and Browserify!';
	self.number = 1234657;
	console.log('Controller');
	/*self.alert = function() {
	 console.log(1)
	 };*/
}

controllersModule.controller('ExampleCtrl', ExampleCtrl);
