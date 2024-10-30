( function( window, $, _, Backbone, undefined ) {

	"use strict";
	var document = window.document;

	function Convatic() {

		var _Models = {};

		var _Routers = {};

		var _Views = {};

		return {
			Models : _Models,
			Routers : _Routers,
			Views : _Views
		};
	}

	window.Convatic = new Convatic();

} )( window, jQuery, _, Backbone );