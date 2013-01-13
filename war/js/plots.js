// Removes the 404 error on loading /undefinedimages/message*.png
SimileAjax.Graphics.pngIsTranslucent = false;

// Disables history management
// Suppress WARNING: No file found for: /__history__.html
SimileAjax.History.enabled = false;

TimeMap.loaders.placemarks_gss = function(options) {
	var loader = new TimeMap.loaders.gss(options), extraColumns = options.extraColumns
			|| [];
	// We want the transform function, but not as such;
	// save it under a different name and clear the function
	loader.oldTransform = loader.transform;
	loader.transform = function(data) {
		return data;
	};
	// Transform in the preload function
	loader.preload = function(data) {
		// basic preload: get rows
		var rows = data.feed.entry, items = [], item, i, coords = [];
		for (i = 0; i < rows.length; i++) {

			// empty the coords array
			coords.length = 0;

			// call the original loader transform to get the formatted object
			item = loader.oldTransform(rows[i]);

			// trim the location string
			// before tokenizing coords with the whitespace delimiter
			coords = $.trim(item.options["LonLat"]).split(" ");

			if (coords.length == 1) {
				// Point placemark
				item.point = TimeMap.util.makePoint(item.options["LonLat"],
						true);

			} else if (coords.length > 1) {
				// Polyline placemark

				item.polygon = TimeMap.util.makePoly(item.options["LonLat"],
						true);
				// Set point as null
				// so that it will not interfere with the rendering of the
				// polyline
				item.point = null;
			}

			item.options.theme = item.options["Theme"];

			items.push(item);
		}

		return items;
	}
	// return the customized loader
	return loader;
};

var tm;
$(function() {

	// Create an array of styles.
	var styles = [ {
		featureType : "water",
		elementType : "all",
		stylers : [ {
			hue : "#00ffe6"
		}, {
			saturation : -20
		} ]
	}, {
		featureType : "road",
		elementType : "all",
		stylers : [ {
			saturation : -100
		} ]
	} ];

	// Create a new StyledMapType object, passing it the array of styles,
	// as well as the name to be displayed on the map type control.
	var styledMapType = new google.maps.StyledMapType(styles, {
		name : "customStyle"
	});

	// zoomOut is the initial zoom level
	// zoomIn level 17 to view plots comfortably on map
	var zoomOut = 13, zoomIn = 17;

	// custom theme for Upper band of the timeline
	var upperTheme = Timeline.ClassicTheme.create();
	upperTheme.mouseWheel = "zoom";
	upperTheme.firstDayOfWeek = 1; // Monday

	// custom theme for Lower band of the timeline
	var lowerTheme = Timeline.ClassicTheme.create();
	lowerTheme.mouseWheel = "zoom";

	tm = TimeMap
			.init({
				mapId : "map", // Id of map div element (required)
				timelineId : "timeline", // Id of timeline div element
				// (required)
				scrollTo : "latest",
				options : {
					// center the map on all visible items in the window
					centerOnItems : false,
					mapCenter : new mxn.LatLonPoint(1.320458, 103.843843), // Novena
																			// station
					// default zoom level
					mapZoom : zoomOut,
					// mapType : "normal",
					eventIconPath : "../images/"

				},
				datasets : [ {
					id : "landsales",
					title : "Land Sales",
					type : "placemarks_gss",
					options : {
						key : "0AkdFf0ojY-LPdGpWcE9kd1Fodk5LUFdJWlljOC1OV1E",
						paramMap : {
							start : "Tender Launched",
							end : "Tender Closed",
							title : "Location",
							description : "Successful Tenderer",
							theme : "Theme"
						},

						// load extra data from non-standard spreadsheet columns
						extraColumns : [ "LonLat", "Theme", "Tendered Price",
								"PricePsmOfGFA" ],

						openInfoWindow : function() {
							var item = this;

							// pan to the new center if inside the map viewport
							item.map.setCenter(item.getInfoPoint(), {
								pan : true
							});
							item.map.setZoom(zoomIn);

							// Overwrite the infoHtml
							// because the map info window is not using the
							// infoTemplate
							item.opts.infoHtml = "<div id='mapinfowindow'><p><i class='icon-map-marker'></i> <strong>"
									+ item.opts.title
									+ "</strong>: winning bid of "
									+ parseFloat(
											item.opts["Tendered Price"]
													.slice(1)).formatMoney(0)
									+ " by "
									+ item.opts.description
									+ " ("
									+ parseFloat(
											item.opts["PricePsmOfGFA"].slice(1))
											.formatMoney(2)
									+ " psm of GFA)"
									+ "</p></div>";

							TimeMapItem.openInfoWindowBasic.call(item);

						}
					}
				} ],

				bandInfo : [ {
					width : "85%",
					intervalUnit : Timeline.DateTime.WEEK,
					intervalPixels : 70, // must match the zoom index
					theme : upperTheme,
					zoomIndex : 2,
					zoomSteps : new Array({
						// zoomIndex [0]
						pixelsPerInterval : 280,
						unit : Timeline.DateTime.WEEK
					}, {
						// zoomIndex [1]
						pixelsPerInterval : 140,
						unit : Timeline.DateTime.WEEK
					}, {
						// zoomIndex [2]
						pixelsPerInterval : 70,
						unit : Timeline.DateTime.WEEK
					})
				}, {
					width : "15%",
					intervalUnit : Timeline.DateTime.MONTH,
					intervalPixels : 100,
					showEventText : false,
					overview : true,
					theme : lowerTheme,
					zoomIndex : 1,
					zoomSteps : new Array({
						// zoomIndex [0]
						pixelsPerInterval : 200,
						unit : Timeline.DateTime.MONTH
					}, {
						// zoomIndex [1]
						pixelsPerInterval : 100,
						unit : Timeline.DateTime.MONTH
					}, {
						// zoomIndex [2]
						pixelsPerInterval : 300,
						unit : Timeline.DateTime.YEAR
					}, {
						// zoomIndex [3]
						pixelsPerInterval : 100,
						unit : Timeline.DateTime.YEAR
					})
				} ]
			});

	// filter function for development type
	var filterDevType = function(item) {
		// if nothing was hidden, everything passes
		if (window.timemap.activeFilters.length == 0)
			return true;

		// the item's development type is not filtered
		if (item.opts["Theme"] && window.timemap.activeFilters.indexOf(item.opts["Theme"]) == -1)
			return true;

		return false;

	};

	// By default, all development types are shown
	// Hence initialized as empty array because there are no active filters
	window.timemap.activeFilters = [];

	// add our new function to the map and timeline filters
	tm.addFilter("map", filterDevType); // filter map markers
	tm.addFilter("timeline", filterDevType); // filter timeline events

	$('#filter-blue, #filter-green, #filter-red')
			.click(
					function() {
						var id = $(this).attr('id');
						var devType = $(this).val();

						if ($(this).is('.active')) {
							// Button was active before the click
							// User clicks to turn on the filter: hide events

							if ($.inArray(devType, window.timemap.activeFilters) == -1) {
								window.timemap.activeFilters.push(devType);
							}

						} else {
							// Button was NOT active before the click
							// User clicks to turn off the filter: show events

							window.timemap.activeFilters.splice(window.timemap.activeFilters.indexOf(devType), 1);
							
						}
						

						if (id === 'filter-green') {
							$(this).toggleClass('btn-green');
						} else if (id === 'filter-red') {
							$(this).toggleClass('btn-danger');
						} else if (id === 'filter-blue') {
							$(this).toggleClass('btn-primary');
						} 

						// run filters
						tm.filter('map');
						tm.filter('timeline');
					});

	// set the map to our custom style
	var gmap = tm.getNativeMap();
	gmap.mapTypes.set("customStyle", styledMapType);
	gmap.setMapTypeId("customStyle");
});
