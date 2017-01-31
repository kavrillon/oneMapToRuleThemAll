'use strict';

/**
 * Bing Map v7
 * API Documentation: https://msdn.microsoft.com/en-us/library/dd877180.aspx
 */

/*jshint -W079 */
let Map = require('../../Map');
/* jshint +W079 */

let domUtils = require('../../utils/dom');
let ieUtils = require('../../utils/ie');
let loaderUtils = require('../../utils/loader');
let objectAssign = require('object-assign');
let DirectionsService;
let InfoBox;
let Marker;
let MarkerClusterer;

let directionsService;

class BingMap extends Map {
    constructor(...args) {
        super(...args);

        this.provider = 'Bing';
        this.markers = [];
        this.map = null;
    }

    render() {

        // Init the map
        this.map = new Microsoft.Maps.Map(this.domElement, objectAssign({
            credentials: this.apiKey
        }, this.options.map));

        let clusterer;
        let infoBox = {};
        let dataLayer = new Microsoft.Maps.EntityCollection();
        this.map.entities.push(dataLayer);

        let bounds = [];

        // Init the info window is the option is set
        if (this.options.activeInfoWindow) {
            infoBox = new InfoBox(new Microsoft.Maps.Location(0, 0), this.options.infoWindow);
            this.map.entities.push(infoBox);
        }

        // Create a marker for each point
        this.points.forEach((point) => {
            let marker = new Marker(point, this.options.marker);
            dataLayer.push(marker);

            this.markers.push(marker);

            // Bind the info window on pin click if the option is set
            if (this.options.activeInfoWindow) {
                Microsoft.Maps.Events.addHandler(marker, 'click', () => {
                    infoBox.display(marker.getLocation(), point.data);
                    this.map.setView({center: marker.getLocation()});
                });
            }

            bounds.push(marker.getLocation());
        });

        // Init the clustering if the option is set
        if (this.plugins.clusterer && this.options.activeCluster) {
            clusterer = new MarkerClusterer(this.map, this.markers, this.options.markerCluster);
            clusterer.cluster(this.markers);
        }

        // Center the map
        if (bounds.length === 1) {
            this.map.setView({center: bounds[0], zoom: 16});
        } else {
            this.map.setView({bounds: Microsoft.Maps.LocationRect.fromLocations(bounds)});
        }
    }

    load(callback, loadingMask) {
        if (window.Microsoft && window.Microsoft.Maps && (!this.plugins.clusterer || window.PinClusterer)) {
            callback();
            return;
        }

        let plugins = this.plugins;

        window._bingCallbackOnLoad = function() {
            // Require microsoft object here cause they're not loaded before
            InfoBox = require('./InfoBox');
            Marker = require('./Marker');

            ieUtils.delete(window, '_bingCallbackOnLoad');

            if (plugins.clusterer) {
                domUtils.addResources(document.body, [
                    domUtils.createScript('//d11lbkprc85eyb.cloudfront.net/pin_clusterer.js')
                ], () => {
                    MarkerClusterer = require('./MarkerClusterer');
                    callback();
                });
            } else {
                callback();
            }
        };

        if (loadingMask) {
            callback = loaderUtils.addLoader(this.domElement, loadingMask, callback);
        }

        domUtils.addScript(this.domElement, '//ecn.dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=7.0&onScriptLoad=_bingCallbackOnLoad&s=1&mkt=' + this.locale);
    }

    setCenter(lat, lng) {
        if (this.map) {
            this.map.setView({center: {
                lat: lat,
                lng:lng
            }});
        }
    }

    setZoom (level) {
        if (this.map) {
            this.map.setView({zoom:level});
        }
    }

    focusOnMarker(markerId) {
        markerId = markerId.toString();
        let marker = this.markers.filter((marker) => {
            return marker.id.toString() === markerId;
        });

        if (marker.length) {
            Microsoft.Maps.Events.invoke(marker[0], 'click', {});
        }
    }

    getDirections(origin, destination, options, callback, onError) {
        if (!directionsService) {
            Microsoft.Maps.loadModule('Microsoft.Maps.Directions', {
                callback: () => {
                    let map = new Microsoft.Maps.Map(this.domElement, objectAssign({
                        credentials: this.apiKey
                    }, this.options.map));

                    DirectionsService = require('./DirectionsService');
                    directionsService = new DirectionsService(map, options, callback, onError);
                    directionsService.getRoute(origin, destination);
                }
            });
        } else {
            directionsService.getRoute(origin, destination);
        }
    }
}

window.Map = BingMap;
window.OneMap = BingMap;
