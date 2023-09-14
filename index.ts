import { NavigationControl, PointLike } from 'mapbox-gl';
import { TrafficCountsApi } from './apis/traffic-counts-api/TrafficCountsApi';
import { LayerControl } from './components/layer-control/LayerControl';
import { TrafficCountLayers } from "./components/traffic-count-layers/TrafficCountLayers";
import { StatisticsControl } from './components/statistics-control/StatisticsControl';

var bicycleCountsApi = "https://api.bikedataproject.org/count";
var trafficCountsApi = new TrafficCountsApi(bicycleCountsApi);

var map = new mapboxgl.Map({
    container: 'map',
    //style: 'https://api.maptiler.com/maps/3327a63f-c15d-462a-9f23-ebf73a14254a/style.json?key=2Piy1GKXoXq0rHzzBVDA',
    style: 'https://api.maptiler.com/maps/7e7e2443-1c41-46d0-813c-f6b11c2c0225/style.json?key=2Piy1GKXoXq0rHzzBVDA',
    // style: 'https://api.maptiler.com/maps/basic/style.json?key=2Piy1GKXoXq0rHzzBVDA', // default maptiler.
    center: [24.32, 27.84], 
    zoom: 2.01,
    hash: true,
    maxZoom: 17
});

const layerControl = new LayerControl([{
    name: "Heatmap",
    layers: [
        'heatmap-heat-lower',
        'heatmap-heat-higher'
    ],
    visible: true
}]);
map.addControl(layerControl, "top-left");

map.addControl(new NavigationControl());

var customizeStyle = () => {
    if (map.isStyleLoaded()) {
        var style = map.getStyle();
        for (var l = 0; l < style.layers.length; l++) {
            var layer = style.layers[l];

            if (layer && layer["source-layer"] === "transportation") {
                if (layer['type'] == 'line') {
                    layer.paint['line-opacity'] = 0.5;
                }
                style.layers[l] = layer;
            }

        }
        map.setStyle(style, { diff: false });

        map.off('data', customizeStyle);
    }
}

map.on('data', customizeStyle);

map.on('load', function () {

    // get lowest label and road.
    var style = map.getStyle();
    var lowestRoad = undefined;
    var lowestLabel = undefined;
    var lowestSymbol = undefined;
    for (var l = 0; l < style.layers.length; l++) {
        var layer = style.layers[l];

        if (layer && layer["source-layer"] === "transportation" &&
            !layer.id.startsWith('tunnel')) {
            if (!lowestRoad) {
                lowestRoad = layer.id;
            }
        }

        if (layer && layer["source-layer"] === "transportation_name") {
            if (!lowestLabel) {
                lowestLabel = layer.id;
            }
        }

        if (layer && layer.type == "symbol") {
            if (!lowestSymbol) {
                lowestSymbol = layer.id;
            }
        }

    }

    // add heatmap layer.
    map.addSource("heatmap", {
        type: 'vector',
        // url: 'https://api.bikedataproject.org/tiles/heatmap/mvt.json'
        url: 'https://api.bikedataproject.org/tiles/heatmap/mvt.json'
        // url: 'http://localhost:8081/local-mvt.json'
    });

    // map.addLayer({
    //     'id': 'heatmap-heat-lower',
    //     'type': 'circle',
    //     'source': 'heatmap',
    //     'source-layer': 'heatmap',
    //     'paint': {
    //         'circle-radius': 10,
    //         'circle-color': '#007cbf'
    //     }
    // }, lowestSymbol);

    function factor(zoom) {
        return 100 * Math.pow(4, 14 - zoom);
    }

    map.addLayer({
        'id': 'heatmap-heat-lower',
        'type': 'heatmap',
        'source': 'heatmap',
        'source-layer': 'heatmap',
        'paint': {
            'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                ['case',
                    ['>', ['get', 'users'], 0], ['min', ['max', ['/', ['get', 'users'], factor(1)], .1], 1],
                    0],
                11,
                ['case',
                    ['>', ['get', 'users'], 0], ['min', ['max', ['/', ['get', 'users'], factor(11)], .1], 1],
                    0],
                12,
                ['case',
                    ['>', ['get', 'users'], 0], ['min', ['max', ['/', ['get', 'users'], factor(12)], .1], 1],
                    0],
                13,
                ['case',
                    ['>', ['get', 'users'], 0], ['min', ['max', ['/', ['get', 'users'], factor(13)], .1], 1],
                    0],
                14,
                ['case',
                    ['>', ['get', 'users'], 0], ['min', ['max', ['/', ['get', 'users'], factor(14)], .1], 1],
                    0]
            ],
            'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 1,
                14, .5
            ],
            'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0,
                'rgba(33,102,172,0)',
                0.4,
                'rgba(103,169,207,1)',
                0.85,
                'rgb(255,0,0)',
                1,
                'rgba(255,220,75, 1)'
            ],
            'heatmap-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 15,
                14, 15,
                15, 20
            ],
            'heatmap-opacity': 1
        }
    }, lowestRoad);

    // add statistics control.
    var statisticsControl = new StatisticsControl('heatmap-heat-lower');
    map.addControl(statisticsControl, 'bottom-left');
    statisticsControl.hookLayerControl(layerControl, true);

    // add traffic counts layers.
    var trafficCountLayers = new TrafficCountLayers(trafficCountsApi, {
        hover: true
    });
    map.addControl(trafficCountLayers, 'bottom-left');

    // hook up layer control.
    trafficCountLayers.hookLayerControl(layerControl, false);
});
