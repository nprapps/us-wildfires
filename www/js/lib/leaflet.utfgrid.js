/*
* Modified 2013-03-18 by @jeremybowers and @onyxfish to support synchronous
* loading of utfgrid data.
*/

L.Util.ajax = function (url, cb) {
	// the following is from JavaScript: The Definitive Guide
	// and https://developer.mozilla.org/en-US/docs/DOM/XMLHttpRequest/Using_XMLHttpRequest_in_IE6
	if (window.XMLHttpRequest === undefined) {
		window.XMLHttpRequest = function () {
			/*global ActiveXObject:true */
			try {
				return new ActiveXObject("Microsoft.XMLHTTP");
			}
			catch  (e) {
				throw new Error("XMLHttpRequest is not supported");
			}
		};
	}
	var response, request = new XMLHttpRequest();
	request.open("GET", url);
	request.onreadystatechange = function () {
		/*jshint evil: true */
		if (request.readyState === 4 && request.status === 200) {
			if (window.JSON) {
				response = JSON.parse(request.responseText);
			} else {
				response = eval("(" + request.responseText + ")");
			}
			cb(response);
		}
	};
	request.send();
};

L.UtfGrid = L.Class.extend({
	includes: L.Mixin.Events,
	options: {
		subdomains: 'abc',

		minZoom: 0,
		maxZoom: 18,
		tileSize: 256,

		resolution: 4,

		useJsonP: true,
		pointerCursor: true
	},

	_mouseOn: null,
    _tileCallbacks: {},

	initialize: function (url, options) {
		L.Util.setOptions(this, options);

		this._url = url;
		this._cache = {};

		var i = 0;
		while (window['lu' + i]) {
			i++;
		}
		this._windowKey = 'lu' + i;
		window[this._windowKey] = {};

		var subdomains = this.options.subdomains;
		if (typeof this.options.subdomains === 'string') {
			this.options.subdomains = subdomains.split('');
		}
	},

	onAdd: function (map) {
		this._map = map;
		this._container = this._map._container;

		this._update();

		var zoom = this._map.getZoom();

		if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
			return;
		}
		map.on('click', this._click, this);
		map.on('mousemove', this._move, this);
		map.on('moveend', this._update, this);
	},

	onRemove: function () {
		var map = this._map;
		map.off('click', this._click, this);
		map.off('mousemove', this._move, this);
		map.off('moveend', this._update, this);
	},

	// Modified to use the dataForLatLng() function and a callback.
	_click: function (e) {
		this.dataForLatLng(e.latlng, L.Util.bind(function(data){
			this.fire('click', data);
		}, this));
	},

	// Modified to use the dataForLatLng() function and a callback.
	_move: function (e) {
		this.dataForLatLng(e.latlng, L.Util.bind(function(data){

			if (data.data !== this._mouseOn) {
				if (this._mouseOn) {
					this.fire('mouseout', { latlng: e.latlng, data: this._mouseOn });
					if (this.options.pointerCursor) {
						this._container.style.cursor = '';
					}
				}
				if (data.data) {
					this.fire('mouseover', data);
					if (this.options.pointerCursor) {
						this._container.style.cursor = 'pointer';
					}
				}

				this._mouseOn = data.data;
			} else if (data.data) {
				this.fire('mousemove', data);
			}

		}, this));
	},

	dataForLatLng: function(latlng, callback) {
		/*
		* So, our problem is that while Leaflet loads the TILES we need to make the map
		* visible, it's not loading the utfgrid for the corresponding JSON objects
		* synchronously. That process is happening asynchronously and without a callback.
		*
		* Our change to this process forces the utfgrid loading process to occur with a callback
		* so that we can specify that any particular grid point be loaded when we need it.
		*/
		var map = this._map,
			point = map.project(latlng),
			tileSize = this.options.tileSize,
			resolution = this.options.resolution,
			x = Math.floor(point.x / tileSize),
			y = Math.floor(point.y / tileSize),
			gridX = Math.floor((point.x - (x * tileSize)) / resolution),
			gridY = Math.floor((point.y - (y * tileSize)) / resolution),
			max = map.options.crs.scale(map.getZoom()) / tileSize;

		x = (x + max) % max;
		y = (y + max) % max;

		// Get the zoom level. We need this below.
		var zoom = map.getZoom();

		// First, try to get this bit of data from the cache. It might have already been loaded by the
		// asynchronous process happening behind the scenes.
		var data = this._cache[zoom + '_' + x + '_' + y];

		// If we did get this data from the cache, fire the callback with our formatted data.
		if (data) {
			callback(this._lookupGrid(latlng, data, gridX, gridY));
			return;
		}

		// If this data wasn't in the cache, force the _loadTile(P) bits to run.
		// Then, fire the callback with our data.
		if (this.options.useJsonP) {
			this._loadTileP(zoom, x, y, L.Util.bind(function(data){
				callback(this._lookupGrid(latlng, data, gridX, gridY));
				return;
			}, this));
		} else {
			this._loadTile(zoom, x, y, L.Util.bind(function(data){
				callback(this._lookupGrid(latlng, data, gridX, gridY));
				return;
			}, this));
		}
	},

	_lookupGrid: function(latlng, data, gridX, gridY) {
		var idx = this._utfDecode(data.grid[gridY].charCodeAt(gridX)),
		key = data.keys[idx],
		result = data.data[key];

		if (!data.data.hasOwnProperty(key)) {
			result = null;
		}

		return { latlng: latlng, data: result};
	},

	// This is where the asynchronous update process is happening.
	// It's too magic for our taste. We have definite needs for certain tiles to be loaded.
	_update: function () {

		var bounds = this._map.getPixelBounds(),
			zoom = this._map.getZoom(),
			tileSize = this.options.tileSize;

		if (zoom > this.options.maxZoom || zoom < this.options.minZoom) {
			return;
		}

		var nwTilePoint = new L.Point(
				Math.floor(bounds.min.x / tileSize),
				Math.floor(bounds.min.y / tileSize)),
			seTilePoint = new L.Point(
				Math.floor(bounds.max.x / tileSize),
				Math.floor(bounds.max.y / tileSize)),
				max = this._map.options.crs.scale(zoom) / tileSize;

		for (var x = nwTilePoint.x; x <= seTilePoint.x; x++) {
			for (var y = nwTilePoint.y; y <= seTilePoint.y; y++) {

				var xw = (x + max) % max, yw = (y + max) % max;
				var key = zoom + '_' + xw + '_' + yw;

				if (!this._cache.hasOwnProperty(key)) {
					this._cache[key] = null;

					if (this.options.useJsonP) {
						this._loadTileP(zoom, xw, yw, L.Util.bind(function(data) {
                            this._cache[key] = data;
                        }, this));
					} else {
						this._loadTile(zoom, xw, yw, L.Util.bind(function(data) {
                            this._cache[key] = data;
                        }, this));
					}
				}
			}
		}
	},

	// Slightly modified to include the callback as part of the function.
	_loadTileP: function (zoom, x, y, callback) {
		var head = document.getElementsByTagName('head')[0],
			key = zoom + '_' + x + '_' + y,
			functionName = 'lu_' + key,
			wk = this._windowKey;

        if (key in this._tileCallbacks) {
            this._tileCallbacks[key].push(callback);
            return;
        } else {
            this._tileCallbacks[key] = [callback];
        }

		var url = L.Util.template(this._url, L.Util.extend({
			s: L.TileLayer.prototype._getSubdomain.call(this, { x: x, y: y }),
			z: zoom,
			x: x,
			y: y,
			cb: wk + '.' + functionName
		}, this.options));

		var script = document.createElement('script');
		script.setAttribute("type", "text/javascript");
		script.setAttribute("src", url);

		window[wk][functionName] = L.Util.bind(function (data) {
            callbacks = this._tileCallbacks[key];

            for (i = 0; i < callbacks.length; i ++) {
			    callbacks[i](data);
            }

            delete this._tileCallbacks[key];
			delete window[wk][functionName];
			head.removeChild(script);
		}, this);

		head.appendChild(script);
	},

	// Also slightly modified to include the callback as part of the function.
	_loadTile: function (zoom, x, y, callback) {
		var url = L.Util.template(this._url, L.Util.extend({
			s: L.TileLayer.prototype._getSubdomain.call(this, { x: x, y: y }),
			z: zoom,
			x: x,
			y: y
		}, this.options));

		var key = zoom + '_' + x + '_' + y;

        if (key in this._tileCallbacks) {
            this._tileCallbacks[key].push(callback);
            return;
        } else {
            this._tileCallbacks[key] = [callback];
        }

		L.Util.ajax(url, function (data) {
            callbacks = this._tileCallbacks[key];

            for (i = 0; i < callbacks.length; i ++) {
			    callbacks[i](data);
            }

            delete this._tileCallbacks[key];
		});
	},

	_utfDecode: function (c) {
		if (c >= 93) {
			c--;
		}
		if (c >= 35) {
			c--;
		}
		return c - 32;
	}
});
