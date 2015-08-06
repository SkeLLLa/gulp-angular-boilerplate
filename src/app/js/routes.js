'use strict';

/**
 * @ngInject
 */
function Routes($stateProvider, $locationProvider, $urlRouterProvider, AppSettings) {

	$locationProvider.html5Mode(true);

	$stateProvider
		.state('Home', {
			url: '/',
			controller: 'ExampleCtrl as home',
			templateUrl: AppSettings.views.host + AppSettings.views.path + '/home.html?v=@@version@@',
			title: 'Home'
		});

	$urlRouterProvider.otherwise('/');

}

module.exports = Routes;
