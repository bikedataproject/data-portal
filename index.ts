import { PointLike } from 'mapbox-gl';
import { TrafficCountsApi } from './apis/traffic-counts-api/TrafficCountsApi';
import { LayerControl } from './components/layer-control/LayerControl';
import { TrafficCountLayers } from "./components/traffic-count-layers/TrafficCountLayers";
import './all_statistics';
import { allStatistics } from './all_statistics';

var bicycleCountsApi = "https://api.bikedataproject.org/count";
var trafficCountsApi = new TrafficCountsApi(bicycleCountsApi);

var trafficCountLayers = new TrafficCountLayers(trafficCountsApi, {
    hover: false
});

var map = new mapboxgl.Map({
    container: 'map',
    //style: 'https://api.maptiler.com/maps/3327a63f-c15d-462a-9f23-ebf73a14254a/style.json?key=2Piy1GKXoXq0rHzzBVDA',
    style: 'https://api.maptiler.com/maps/7e7e2443-1c41-46d0-813c-f6b11c2c0225/style.json?key=2Piy1GKXoXq0rHzzBVDA',
    // style: 'https://api.maptiler.com/maps/basic/style.json?key=2Piy1GKXoXq0rHzzBVDA', // default maptiler.
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

map.on('click', e => {
    console.log(e);

    // get features aroud the hovered point.
    var bbox: [PointLike, PointLike] = [
        [e.point.x - 5, e.point.y - 5],
        [e.point.x + 5, e.point.y + 5]
    ];

    // check origins layer.
    var features = map.queryRenderedFeatures(bbox, {
        layers: [`heatmap-heat-lower`]
    });

    features.forEach(f => {
        console.log("" + f.properties.users + " - " + f.properties.trips);
    });
});

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
    // add bicycle count layers.
    trafficCountLayers.addToMap(map);

    // hook up layer control.
    trafficCountLayers.hookLayerControl(layerControl, false);

    // get lowest label and road.
    var style = map.getStyle();
    console.log(style);
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
        url: 'https://api.bikedataproject.org/tiles/heatmap/staging/mvt.json'
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
        return 30 * Math.pow(4, 14 - zoom);
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
                14, 1
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

    map.addSource("areas", {
        type: 'vector',
        url: 'https://api.bikedataproject.org/tiles/areas/mvt.json',
        promoteId: 'id'
    });

    var allStats = allStatistics.getAll();
    let lastLocation = undefined;
    let overlay = document.getElementById("map-overlay");
    map.on('data', function (e) {
        if (e.type == "style") return;

        if (e.isSourceLoaded) {
            map.querySourceFeatures("areas", {
                sourceLayer: "areas"
            }).forEach(function (f) {
                if (f.properties && f.properties.id) {
                    var stats = allStats[f.properties.id];
                    if (stats) {
                        map.setFeatureState({
                            source: "areas",
                            sourceLayer: "areas",
                            id: f.properties.id
                        }, {
                            count: stats.count,
                            seconds: stats.seconds,
                            meters: stats.meters
                        });
                    }
                }
            });
        }
    });

    map.addLayer({
        id: 'areas-stats',
        type: 'fill',
        source: 'areas',
        'source-layer': 'areas',
        paint: {
            'fill-color': '#EF4823',
            'fill-opacity': 0.01,
        },
    }, 'heatmap-heat-lower');

    map.addLayer({
        'id': 'areas-stats-boundaries',
        'type': 'line',
        'source': 'areas',
        'source-layer': 'areas',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#777',
            'line-width': .4
        }
    });

    map.addLayer(
        {
            id: 'areas-stats-selected',
            type: 'fill',
            source: 'areas',
            'source-layer': 'areas',
            paint: {
                'fill-color': 'rgba(103,169,207,0.3)',
                'fill-opacity': 0.75,
            },
            filter: ['in', 'id', ''],
        },
        'heatmap-heat-lower'
    );

    map.on('mousemove', 'areas-stats', function (e) {
        map.getCanvas().style.cursor = 'pointer';

        lastLocation = e.point;
        var feature = e.features[0];

        updateOverlay(feature);

        map.setFilter('areas-stats-selected', [
            'in',
            'id',
            feature.properties.id,
        ]);
    });

    var updateOverlay = (feature) => {
        overlay.innerHTML = '';

        const container = document.createElement('div');
        container.classList.add("wrapper");

        const title = document.createElement('h4');
        title.classList.add('data__subtitle');
        title.textContent = feature.properties.name;

        const dataWrapper = document.createElement('section');
        dataWrapper.classList.add('data__wrapper');

        const featureStats = map.getFeatureState({
            source: "areas",
            sourceLayer: "areas",
            id: feature.properties.id
        });

        const meters = featureStats.meters;
        const seconds = featureStats.seconds;
        const count = featureStats.count;

        const distance = Math.round(meters / 1000)

        const avarageDistance = Math.round(((meters / 1000) / count));
        const avarageSpeed = Math.round(((meters / 1000) / (seconds / 3600)));
        const avarageDuration = Math.round((seconds / 60) / count);

        const co2perkm = 130 / 1000;
        const co2 = Math.round((meters / 1000) * co2perkm) / 1000;

        if (!count) {
            dataWrapper.innerHTML = `
                <div class="data__empty">
                  <p>No data collected yet. Get cycling & share your data 🚴</p>
                </div>`;
        } else {
            dataWrapper.innerHTML = `
                 <div class="data__set">
                   <span class="data__number">${count}</span>
                   <p class="data__label">Rides Collected</p>
                 </div>
                 <div class="data__set">
                   <span class="data__number">${distance} km</span>
                   <p class="data__label">Distance Collected</p>
                 </div>
                 <div class="data__set">
                   <span class="data__number">${avarageDistance} km</span>
                   <p class="data__label">Average Distance</p>
                 </div>
                 <div class="data__set">
                   <span class="data__number">${avarageSpeed} km/h</span>
                   <p class="data__label">Average Speed</p>
                 </div>
                 <div class="data__set">
                   <span class="data__number">${avarageDuration} min</span>
                   <p class="data__label">Average Duration</p>
                 </div>
                 <div class="data__set">
                   <span class="data__number">${co2} t</span>
                   <p class="data__label">CO<sub>2</sub> saved</p>
                 </div>
                `;
        }

        overlay.appendChild(container);
        container.appendChild(title);
        container.appendChild(dataWrapper);
        overlay.style.display = 'block';
    };

    map.on('mouseleave', 'areas-stats', function () {
        map.getCanvas().style.cursor = '';
        map.setFilter('areas-stats-selected', ['in', 'id', '']);
        //overlay.style.display = 'none';
        lastLocation = undefined;
    });

    map.on('zoomend', function () {
        if (lastLocation) {
            var statsArea = map.queryRenderedFeatures(lastLocation, {
                layers: ["areas-stats"]
            });

            if (statsArea && statsArea.length > 0) {
                updateOverlay(statsArea[0]);

                map.setFilter('areas-stats-selected', [
                    'in',
                    'id',
                    statsArea[0].properties.id,
                ]);
            }
        }
    });
});