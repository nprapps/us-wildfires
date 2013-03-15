$(document).ready(function(){

    window.m = mapbox.map('map');
    var w = $(window).width();

    m.center({ lat: 40, lon: -97 });
    m.zoom(4);
    m.setZoomRange(3,9);

    mapbox.load(['npr.us-wildfires'], function(data){
        m.addLayer(data[0].layer);
        m.interaction.auto();
        var ml = mapbox.markers.layer();
    });

    if(w >= 960){
        m.center({ lat: 40, lon: -108 });
        m.ui.zoomer.add();
    } else if (w >= 650){
        m.ui.zoomer.add();
    } else {
        m.zoom(3);
    }

    $.urlParam = function(name){
        // A function for decoding URL parameters.
        var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
        try { return decodeURIComponent(results[1]); }
        catch(err) { return null; }
    };

    function on_all_loaded(layer, callback) {
        /*
        * A function for delaying action until the underlying layer grids have completed rendering.
        */
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

    $.geocode = function(query){
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
                   $.zoomToPin(value.lat, value.lon, value.address[value.type], value.address.state);
               }
           }
        });
    };

   $.zoomToPin = function(lat, lon, placeCity, placeState){
        m.center({ lon: lon, lat: lat });
        m.zoom(8);

        console.log(m.getLayerAt(0));

        on_all_loaded(m.getLayerAt(0), function(){
            m.interaction.screen_feature({ x: m.dimensions.x / 2, y: m.dimensions.y / 2 }, function(ft) {
                console.log(ft);
            });
        });
    };

    if ($.urlParam('city') && $.urlParam('state')) {
        $.geocode($.urlParam('city') + ', ' + $.urlParam('state'));
    }

});
