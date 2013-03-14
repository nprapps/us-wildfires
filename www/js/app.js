$(document).ready(function(){
    /*
    * A function for decoding URL parameters.
    */
    $.urlParam = function(name){
        var results = new RegExp('[\\?&amp;]' + name + '=([^&amp;#]*)').exec(window.location.href);
        try { return decodeURIComponent(results[1]); }
        catch(err) { return null; }
    };

    mapbox.load(['npr.map-94vv5tn9', 'npr.us-wildfires'], function(data){
        window.m = mapbox.map('map');
        m.addLayer(data[0].layer);
        m.addLayer(data[1].layer);
        m.setZoomRange(3,9);
        m.interaction.auto();

        var width = $(window).width();
        if(width >= 960){
            m.zoom(4);
            m.center({ lat: 40, lon: -108 });
            m.ui.zoomer.add();
        } else if (width >= 650){
            m.zoom(4);
            m.center({ lat: 40, lon: -97 });
            m.ui.zoomer.add();
        } else {
            m.zoom(3);
            m.center({ lat: 40, lon: -97 });
        }

        var markerLayer = mapbox.markers.layer();
        markerLayer.factory(function(feature) {
            var dangerCode = feature.properties.dangerCode;
            var level;
            var levelName;
            switch(dangerCode) {
                case -9999:
                    level = 'not-reported';
                    levelName = 'Not reported';
                    break;
                case 1:
                    level = 'low';
                    levelName = 'Low';
                    break;
                case 2:
                    level = 'moderate';
                    levelName = 'Moderate';
                    break;
                case 3:
                    level = 'high';
                    levelName = 'High';
                    break;
                case 4:
                    level = 'very-high';
                    levelName = 'Very high';
                    break;
                case 5:
                    level = 'extreme';
                    levelName = 'Extreme';
                    break;
                default:
                    level = 'not-reported';
                    levelName = 'Not reported';
                    break;
            }
            var cityState = '';
            if(feature.properties.placeCity){
                cityState = feature.properties.placeCity + ', ' + feature.properties.placeState;
            }
            window.newPopup = $('<div class="danger-popup">Wildfire Danger<div class="city-state">' + cityState + '</div><div class="danger-rating danger-' + level + '">' + levelName + '</div><div class="pointer"></div></div>');
            return newPopup[0];
        });
        m.addLayer(markerLayer);
        $('#find,#find2').click(function(){
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    geocode(position.coords.latitude + ',' + position.coords.longitude);
                },
                function(err) {
                    alert('Your location could not be found. Try enabling location services.');
                }
            );
        });

        function on_all_loaded(layer, callback) {
            if (layer.requestManager.openRequestCount === 0) {
                callback();
            } else {
                var cb = function() {
                    if (layer.requestManager.openRequestCount > 0) return;
                    else callback();
                    layer.requestManager.removeCallback('requestcomplete', cb);
                };
                layer.requestManager.addCallback('requestcomplete', cb);
            }
        }

        function zoomToPin(lat,lon,placeCity,placeState){
            //set the center and zoom in
            m.center({ lon: lon, lat: lat });
            m.zoom(8);
            markerLayer.features([]);
            m.refresh();

            on_all_loaded(m.getLayerAt(0), function() {
                m.interaction.screen_feature({
                    x: m.dimensions.x / 2,
                    y: m.dimensions.y / 2 }, function(ft) {
                    //pass an empty array to clear the features

                    var dangerCode;
                    if(ft) {
                        dangerCode = ft.GRID_CODE;
                    } else {
                        dangerCode: -9999;
                    }
                    markerLayer.add_feature({
                        geometry: {
                            coordinates: [
                                lon,
                                lat]
                        },
                        properties: {
                            dangerCode: dangerCode,
                            placeCity: placeCity,
                            placeState: placeState
                        }
                    });
                    m.panBy(0,60);
                });
            });
        }

        $('#search').submit(function(e){
            e.preventDefault();
            geocode(encodeURIComponent($('#search input').val()));
        });
        $('#search2').submit(function(e){
            e.preventDefault();
            geocode(encodeURIComponent($('#search2 input').val()));
        });

        function geocode(query){
            $.ajax({
               url: 'http://open.mapquestapi.com/nominatim/v1/search?format=json&countrycodes=us&limit=1&addressdetails=1&q=' + query,
               cache: false,
               dataType: 'jsonp',
               jsonp: 'json_callback',
               success: function(response){
                   value = response[0];
                   if (value === undefined) {
                       alert('That location could not be found. Try using a city, state, Zip Code or mailing address.');
                   } else {
                       zoomToPin(value.lat, value.lon, value.address[value.type], value.address.state);
                   }
               }
            });
        }

        function setupBookmarkBubble(){

            //update the bubble text so that it's correct for this app
            google.bookmarkbubble.Bubble.prototype.msg = {
              android:
                '<b>Install this app:</b><br /> 1) Add to Bookmarks,<br /> 2) Tap and Hold the bookmark,<br /> 3) Select "<b>Add Shortcut to Home</b>"',
              android3:
                '<b>Install this app:</b><br /> Tap <img src="'+ google.bookmarkbubble.Bubble.prototype.IMAGE_ANDROID3_BOOKMARK_DATA_URL_ +'" style="height: 1.5em;display: inline-block;padding:0;margin:0;" />,<br /> select "<b>Add to</b>" and then "<b>Home screen</b>"',
              android4:
                '<b>Install this app:</b><br /> 1) Tap <img src="'+ google.bookmarkbubble.Bubble.prototype.IMAGE_ANDROID4_MOBILE_BOOKMARK_DATA_URL_ +'" style="height: 1.5em;display: inline-block;padding:0;margin:0;" />,<br /> 2) Select "<b>Save to bookmarks</b>",<br /> 3) Select "<b>Add to</b>" and then "<b>Home</b>"',
              blackberry:
                '<b>Install this app:</b><br /> Tap <img src="'+ google.bookmarkbubble.Bubble.prototype.IMAGE_BLACKBERRY_ICON_DATA_URL_ +'" style="height: 1em;display: inline-block;padding:0;margin:0" />, select "<b>Add to Home Screen</b>"',
              playbook:
                 '<b>Install this app:</b><br /> Tap <img src="'+ google.bookmarkbubble.Bubble.prototype.IMAGE_PLAYBOOK_BOOKMARK_DATA_URL_ +'" style="height: 1.5em;display: inline-block;padding:0;margin:0;" />, select  <br />"<b>Add to Home Screen</b>"',
              ios42orlater :
                 '<b>Install this app</b>:<br /> Tap <img src="'+ google.bookmarkbubble.Bubble.prototype.IMAGE_SAFARI_FORWARD_DATA_URL_ +'" style="height: 1em;display: inline-block;padding: 0;margin: 0" /> and then<br /><b>"Add to Home Screen"</b>',
              ioslegacy: '<b>Install this app</b>:<br /> Tap <b style="font-size:15px">+</b> and then<br /><b>"Add to Home Screen"</b>'
            };

            /** Don't show the bubble if click dismiss button at 3 times. */
            google.bookmarkbubble.Bubble.prototype.NUMBER_OF_TIMES_TO_DISMISS=3;

            /** page to bookmark bubble (generally, this should be top page) */
            if (typeof(page_popup_bubble) == "undefined") {
                page_popup_bubble = "#index";
            }

            window.setTimeout(function() {
                var bubble = new google.bookmarkbubble.Bubble();
                var parameter = page_popup_bubble;

                bubble.hasHashParameter = function() {
                    return location.hash === "" && location.href.indexOf(parameter) == location.href.length - 1;
                };

                bubble.setHashParameter = function() {
                    if (!this.hasHashParameter()) {
                        location.href = parameter;
                    }
                };

                bubble.showIfAllowed();
            }, 1000 /** delay to show the bubble */ );
        }

        $("#about").click(function(){
            if($(".modal-body").children().length < 1 ) {
                $(".modal h3").text($(".legend-contents .headline").text());
                $(".legend-contents .headline").hide();
                $(".legend-contents").clone().appendTo(".modal-body");
            }
        });

        if(window.location.search.indexOf("embed") > 0) {
            $("#nav").hide();
            $("#embed-nav").show();
            $("#topper").addClass("embedded");
            $("#embed-nav").click(function(){window.open('http://apps.npr.org/fire-forecast');});
        } else {
            //only set up the bubble if we're not embedded
            setupBookmarkBubble();
        }

        //for old browsers and for IE in a frame
        if (!navigator.geolocation) {
            $("#find,find2").hide();
        }

        // If URL path has a lat/lon pair, snap to that view.
        var urlLat = $.urlParam('lat');
        var urlLon = $.urlParam('lon');
        if (urlLat && urlLon) {
            geocode(urlLat +','+ urlLon);
        }
    });
});