$(document).ready(function(){

        var tiles = L.tileLayer('http://{s}.tiles.mapbox.com/v3/npr.map-94vv5tn9/{z}/{x}/{y}.png', {
            maxZoom: 8
        });
        var firetiles = L.tileLayer('http://{s}.tiles.mapbox.com/v3/npr.us-wildfires/{z}/{x}/{y}.png', {
            maxZoom: 8
        });

        var utfGrid = new L.UtfGrid('http://{s}.tiles.mapbox.com/v3/npr.us-wildfires/{z}/{x}/{y}.grid.json?callback={cb}');

        var map = new L.map('map', {
            center: new L.LatLng(40, -108),
            zoom: 5,
            layers: [tiles, firetiles, utfGrid]
        });

        utfGrid.on('click', function(e){
            console.log(e.latlng);
        });

        myPoint = new L.LatLng(35.17380831799959, -117.0703125);

        console.log(utfGrid.dataForLatLng(myPoint));

        // var popup = L.popup()
        //     .setLatLng([40, -108])
        //     .setContent()
        //     .openOn(map);

});