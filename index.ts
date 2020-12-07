import { TrafficCountsApi } from './apis/traffic-counts-api/TrafficCountsApi';
import { LayerControl } from './components/layer-control/LayerControl';
import { TrafficCountLayers } from "./components/traffic-count-layers/TrafficCountLayers";

var bicycleCountsApi = "https://api.bikedataproject.org/count";
var trafficCountsApi = new TrafficCountsApi(bicycleCountsApi);

var trafficCountLayers = new TrafficCountLayers(trafficCountsApi);

var map = new mapboxgl.Map({
    container: 'map',
    //style: 'https://api.maptiler.com/maps/3327a63f-c15d-462a-9f23-ebf73a14254a/style.json?key=2Piy1GKXoXq0rHzzBVDA',
    style: 'https://api.maptiler.com/maps/7e7e2443-1c41-46d0-813c-f6b11c2c0225/style.json?key=2Piy1GKXoXq0rHzzBVDA',
    center: [4.3525, 50.8454],
    zoom: 14,
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

map.addControl(new mapboxgl.NavigationControl());

map.on('load', function () {
    // add bicycle count layers.
    trafficCountLayers.addToMap(map);

    // hook up layer control.
    trafficCountLayers.hookLayerControl(layerControl, false);

    // get lowest label and road.
    var style = map.getStyle();
    var lowestRoad = undefined;
    var lowestLabel = undefined;
    var lowestSymbol = undefined;
    for (var l = 0; l < style.layers.length; l++) {
        var layer = style.layers[l];

        if (layer && layer["source-layer"] === "transportation") {
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
        url: 'https://api.bikedataproject.org/tiles/heatmap/mvt.json'
    });

    map.addLayer({
        'id': 'heatmap-heat-lower',
        'type': 'heatmap',
        'source': 'heatmap',
        'source-layer': 'heatmap',
        'minzoom': 14,
        'paint': {
            'heatmap-weight': ['case',
                ['>', ['get', 'users'], 0], ['max', ['/', ['get', 'users'], 10000], .1],
                0],
            'heatmap-intensity': 1,
            'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0,
                'rgba(33,102,172,0)',
                0.5,
                'rgba(103,169,207,1)',
                0.8,
                'rgb(255,0,0)',
                1,
                'rgba(255,220,75, 1)'
            ],
            'heatmap-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                14, 10,
                20, 20
            ],
            'heatmap-opacity': 1
        }
    }, lowestSymbol);

    function factor(zoom) {
        return 1000000 * Math.pow(4, 14 - zoom);
    }

    map.addLayer({
        'id': 'heatmap-heat-higher',
        'type': 'heatmap',
        'source': 'heatmap',
        'source-layer': 'heatmap',
        'maxzoom': 14,
        'paint': {
            'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                ['case',
                    ['>', ['get', 'users'], 0], ['max', ['/', ['get', 'users'], factor(0)], .1],
                    0],
                12,
                ['case',
                    ['>', ['get', 'users'], 0], ['max', ['/', ['get', 'users'], factor(12)], .1],
                    0],
                13,
                ['case',
                    ['>', ['get', 'users'], 0], ['max', ['/', ['get', 'users'], factor(13)], .1],
                    0],
                14,
                ['case',
                    ['>', ['get', 'users'], 0], ['max', ['/', ['get', 'users'], factor(14)], .1],
                    0]
            ],
            'heatmap-intensity': 1,
            'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0,
                'rgba(33,102,172,0)',
                0.5,
                'rgba(103,169,207,1)',
                0.8,
                'rgb(255,0,0)',
                1,
                'rgba(255,220,75, 1)'
            ],
            'heatmap-radius': 10,
            'heatmap-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                0.5,
                14,
                0.9
            ]
        }
    }, lowestSymbol);
});