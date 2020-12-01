var map = new mapboxgl.Map({
    container: 'map',
    //style: 'https://api.maptiler.com/maps/3327a63f-c15d-462a-9f23-ebf73a14254a/style.json?key=2Piy1GKXoXq0rHzzBVDA',
    style: 'https://api.maptiler.com/maps/7e7e2443-1c41-46d0-813c-f6b11c2c0225/style.json?key=2Piy1GKXoXq0rHzzBVDA',
    center: [4.3525, 50.8454],
    zoom: 14,
    hash: true,
    maxZoom: 17
});

map.addControl(new mapboxgl.NavigationControl());

var overlay = document.getElementById('map-overlay');
var popup = new mapboxgl.Popup({
    closeButton: false
});

map.on('load', function () {

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

    map.addSource("heatmap", {
        type: 'vector',
        //url: 'local-mvt.json'
        url: 'https://api.bikedataproject.org/tiles/heatmap/mvt.json'
    });

    map.addLayer({
        'id': 'heatmap-heat-lower',
        'type': 'heatmap',
        'source': 'heatmap',
        'source-layer': 'heatmap',
        'visibility': 'none',
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
    }, lowestSymbol
    );

    function factor(zoom) {
        return 1000000 * Math.pow(4, 14-zoom);
    }

    map.addLayer({
        'id': 'heatmap-heat-higher',
        'type': 'heatmap',
        'source': 'heatmap',
        'source-layer': 'heatmap',
        'visibility': 'none',
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
    }, lowestSymbol
    );

    // map.addLayer(
    // {
    //     'id': 'heatmap-raw-2',
    //     'type': 'circle',
    //     'maxzoom': 14,
    //     'source': 'heatmap',
    //     'source-layer': 'heatmap',
    //     'paint': {
    //             'circle-radius': 4,
    //             'circle-color': 'rgb(255,0,0)'
    //     }
    // }, lowestSymbol);

    // map.addLayer(
    //     {
    //         'id': 'heatmap-raw',
    //         'type': 'circle',
    //         'maxzoom': 14,
    //         'source': 'heatmap',
    //         'source-layer': 'heatmap',
    //         'paint': {
    //             'circle-radius': 2,
    //             'circle-color': 'rgba(255,220,75, 1)'
    //         }
    //     }, lowestSymbol);

    // map.on('click', function(e) {
    //     map.querySourceFeatures()
    // });

    $.get('all_statistics.json', function (data) {
        console.log(data);

        map.addSource("areas", {
            type: 'vector',
            url: 'https://api.bikedataproject.org/tiles/areas/mvt.json',
            promoteId: 'id'
        });

        map.on('data', function (e) {
            if (e.type == "style") return;

            if (e.isSourceLoaded) {
                console.log("Setting states");
                map.querySourceFeatures("areas", {
                    sourceLayer: "areas"
                }).forEach(function (f) {
                    if (f.properties && f.properties.id) {
                        var stats = data[f.properties.id];
                        if (stats) {
                            map.setFeatureState({
                                source: "areas",
                                sourceLayer: "areas",
                                id: f.properties.id
                            }, {
                                count: stats.count
                            });
                        }
                    }
                });
            }
        });

        // map.addLayer({
        //     'id': 'areas-stats',
        //     'type': 'fill',
        //     'source': 'areas',
        //     'source-layer': 'areas',
        //     'maxzoom': 12,
        //     'paint': {
        //         'fill-color': 
        //             ['case',
        //                 ['==', ['feature-state', 'count'], null], 'rgba(255, 255, 255, 0)',
        //                 ['>',  ['feature-state', 'count'], 0], 'rgba(255,220,75, 1)',
        //                 'rgba(255, 255, 255, 0)'],
        //         'fill-opacity': 0.1
        //     }
        // }, "heatmap-heat");

        // map.addLayer({
        //     'id': 'areas-stats-boundaries',
        //     'type': 'line',
        //     'source': 'areas',
        //     'source-layer': 'areas',
        //     'layout': {
        //         'line-join': 'round',
        //         'line-cap': 'round'
        //     },
        //     'paint': {
        //         'line-color': '#ffd700',
        //         'line-width': 1
        //     }
        // });

        // map.addLayer(
        //     {
        //         'id': 'areas-stats-selected',
        //         'type': 'fill',
        //         'source': 'areas',
        //         'source-layer': 'areas',
        //         'paint': {
        //             'fill-outline-color': '#484896',
        //             'fill-color': '#6e599f',
        //             'fill-opacity': 0.75
        //         },
        //         'filter': ['in', 'id', '']
        //     }, 'areas-stats-boundaries');

        // map.on('mousemove', 'areas-stats', function (e) {

        //     map.getCanvas().style.cursor = 'pointer';

        //     var feature = e.features[0];
        //     console.log(feature);

        //     overlay.innerHTML = '';

        //     var title = document.createElement('strong');
        //     title.textContent =
        //         feature.properties.name;

        //     var population = document.createElement('div');
        //     population.textContent =
        //         'Total KMs: ' + feature.properties.km + ' ' +                    
        //         'Total Time: ' + feature.properties.seconds + ' ' +                    
        //         'Total Trips: ' + feature.properties.count;

        //     overlay.appendChild(title);
        //     overlay.appendChild(population);
        //     overlay.style.display = 'block';

        //     map.setFilter('areas-stats-selected', [
        //         'in',
        //         'id',
        //         feature.properties.id
        //     ]);

        //     popup
        //         .setLngLat(e.lngLat)
        //         .setText(feature.properties.name)
        //         .addTo(map);
        // });

        // map.on('mouseleave', 'areas-stats', function () {
        //     map.getCanvas().style.cursor = '';
        //     popup.remove();
        //     map.setFilter('areas-stats-selected', ['in', 'id', '']);
        //     overlay.style.display = 'none';
        // });

        // // Check if `statsData` source is loaded.
        // function setAfterLoad(e) {
        //     if (e.sourceId === 'areas' && e.isSourceLoaded) {
        //         setStats();
        //         map.off('sourcedata', setAfterLoad);
        //     }
        // }

        // // If `areas` source is loaded, call `setStats()`.
        // if (map.isSourceLoaded('areas')) {
        //     setStats();
        // } else {
        //     map.on('sourcedata', setAfterLoad);
        // }
    });
});