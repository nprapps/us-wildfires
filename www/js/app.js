$(document).ready(function(){
    /*
    * Set up the map.
    */
    var DANGER = {
        '-9999': { level: 'not-reported', name: 'Not reported' },
        '1': { level: 'low', name: 'Low' },
        '2': { level: 'moderate', name: 'Moderate' },
        '3': { level: 'high', name: 'High'},
        '4': { level: 'very-high', name: 'Very high'},
        '5': { level: 'extreme', name: 'Extreme'}
    };

    var tileConfig = {maxZoom: 9};

    var bTile = L.tileLayer('http://{s}.tiles.mapbox.com/v3/npr.map-94vv5tn9/{z}/{x}/{y}.png', tileConfig);
    var fTile = L.tileLayer('http://{s}.tiles.mapbox.com/v3/npr.us-wildfires/{z}/{x}/{y}.png', tileConfig);
    var uGrid = new L.UtfGrid('http://{s}.tiles.mapbox.com/v3/npr.us-wildfires/{z}/{x}/{y}.grid.json?callback={cb}');

    var mapConfig = {};
    mapConfig['center'] = new L.LatLng(40, -97),
    mapConfig['zoom'] = 4;
    mapConfig['minZoom'] = 3;
    mapConfig['maxZoom'] = 9;
    mapConfig['layers'] = [bTile, fTile, uGrid];
    mapConfig['attributionControl'] = false;
    var zoomer = true;

    if($(window).width() >= 960){
        mapConfig['center'] = new L.LatLng(40, -108);
    } else {
        mapConfig['zoom'] = 3;
        zoomer = false;
    }

    var map = new L.map('map', mapConfig);
    if(zoomer === true){
        control = new L.Control.Zoom({ position: 'topright'});
        control.addTo(map);
    }

    /*
    * Generic functions for interaction.
    */
    $.urlParam = function(name){
        // A function for decoding URL parameters.
        var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
        try { return decodeURIComponent(results[1]); }
        catch(err) { return null; }
    };

    $.geocode = function(query, initLoad){
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
                    var city = value.address[value.type];
                    var state = value.address.state;
                    if(initLoad === true) {
                        city = $.urlParam('city');
                        state = $.urlParam('state');
                    }
                    $.zoomToPin(value.lat, value.lon, city, state);
                }
            }
        });
    };

    $.zoomToPin = function(lat, lon, city, state) {
        var latlng = new L.LatLng(parseFloat(lat), parseFloat(lon));

        map.panTo(latlng);
        map.setZoom(8);

        uGrid.dataForLatLng(latlng, function(data){
            var cityState = '';
            if(city){ cityState += city; }
            if(state){ cityState += ', '+state; }
            var d = DANGER['-9999'];
            try { d = DANGER[data.data.GRID_CODE]; } catch(err) { /* pass */ }
            var html = 'Wildfire Danger<div class="city-state">' + cityState + '</div><div class="danger-rating danger-' + d.level + '">' + d.name + '</div>';
            var popup = L.popup()
                        .setLatLng(latlng)
                        .setContent(html)
                        .openOn(map);
        });

    };

    $.setupBookmarkBubble = function(){
        // Update the bubble text so that it's correct for this app.
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
    };

    /*
    * Events and such.
    */
    uGrid.on('click', function(data){
        $.zoomToPin(data.latlng.lat, data.latlng.lng, null, null);
    });

    if (!navigator.geolocation) {
        $("#find,find2").hide();
    }

    if(window.location.search.indexOf("embed") > 0) {
        $("#nav").hide();
        $("#embed-nav").show();
        $("#topper").addClass("embedded");
        $("#embed-nav").on('click', function(){ window.open('http://apps.npr.org/fire-forecast/'); });
    } else {
        $.setupBookmarkBubble();
    }

    if ($.urlParam('city') && $.urlParam('state')) {
        $.geocode($.urlParam('city') + ', ' + $.urlParam('state'), true);
    }

    $("#about").on('click', function(){
        if($(".modal-body").children().length < 1 ) {
            $(".modal h3").text($(".legend-contents .headline").text());
            $(".legend-contents .headline").hide();
            $(".legend-contents").clone().appendTo(".modal-body");
        }
    });

    $('#search, #search2').on('submit', function(e){
        e.preventDefault();
        $.geocode(encodeURIComponent($('#' + $(this).attr('id') + ' input').val()), false);
    });

    $('#find,#find2').on('click', function(){
        navigator.geolocation.getCurrentPosition(
            function(position) {
                $.geocode(position.coords.latitude + ',' + position.coords.longitude, false);
            },
            function(err) {
                alert('Your location could not be found. Try enabling location services.');
            }
        );
    });

});
