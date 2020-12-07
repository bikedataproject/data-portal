import * as $ from "jquery";
import { DirectedEdgeId } from "./apis/traffic-counts-api/DirectedEdgeId";
import { TrafficCountsApi } from './apis/traffic-counts-api/TrafficCountsApi';
import { TrafficCountTree } from "./apis/traffic-counts-api/TrafficCountTree";

// var bicycleCountsApi = "https://api.bikedataproject.org/count";
var bicycleCountsApi = "http://localhost:5000";
var trafficCountsApi = new TrafficCountsApi(bicycleCountsApi);

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


    map.addSource("bicycle-counts", {
        type: 'vector',
        url: bicycleCountsApi + '/tiles/mvt.json',
        promoteId: { "bikedata": "id" }
    });

    map.addLayer({
        'id': 'bicycle-counts',
        'type': 'line',
        'source': 'bicycle-counts',
        'source-layer': 'bikedata',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#ffd700',
            'line-width': ['interpolate', ['linear'], ['zoom'],
                10, ["min", ["max", ["/", ["+", ["get", "forward_count"], ["get", "backward_count"]], 10], 0.1], 2],
                14, ["min", ["max", ["/", ["+", ["get", "forward_count"], ["get", "backward_count"]], 10], 0.1], 20]
            ]
        }
    }, lowestSymbol);

    map.addLayer({
        'id': 'bicycle-counts-hover',
        'type': 'line',
        'source': 'bicycle-counts',
        'source-layer': 'bikedata',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#fff',
            'line-width': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                ["min", ["number", ["feature-state", "count"]], 10],
                0
            ]
        }
    }, lowestSymbol);

    map.addLayer({
        'id': 'bicycle-counts-origins',
        'type': 'line',
        'source': 'bicycle-counts',
        'source-layer': 'bikedata',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#0000ff',
            'line-width': [
                'case',
                ['boolean', ['feature-state', 'origin'], false],
                ["min", ["number", ["feature-state", "origin_count"]], 5],
                0
            ]
        }
    }, "bicycle-counts-hover");

    map.addLayer({
        'id': 'bicycle-counts-destinations',
        'type': 'line',
        'source': 'bicycle-counts',
        'source-layer': 'bikedata',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#ff0000',
            'line-width': [
                'case',
                ['boolean', ['feature-state', 'destination'], false],
                ["min", ["number", ["feature-state", "destination_count"]], 5],
                0
            ]
        }
    }, "bicycle-counts-hover");

    map.addLayer({
        'id': 'bicycle-counts-routes',
        'type': 'line',
        'source': 'bicycle-counts',
        'source-layer': 'bikedata',
        'layout': {
            'line-join': 'round',
            'line-cap': 'round'
        },
        'paint': {
            'line-color': '#fff',
            'line-width': [
                'case',
                ['boolean', ['feature-state', 'route'], false],
                10,
                0
            ]
        }
    }, lowestSymbol);

    // map.addLayer({
    //     'id': 'bicycle-counts-destinations-numbers',
    //     'type': 'symbol',
    //     'source': 'bicycle-counts',
    //     'source-layer': 'bikedata',
    //     'layout': {
    //         "text-field": "{count}"
    //     },
    //     'paint': {
    //         'visibility': ["boolean", ["feature-state", "count"], false]
    //     },
    //     "filter": ["in", "id", 0]
    // }, "bicycle-counts-hover");

    map.addSource("heatmap", {
        type: 'vector',
        //url: 'local-mvt.json'
        url: 'https://api.bikedataproject.org/tiles/heatmap/mvt.json'
    });

    // map.addLayer({
    //     'id': 'heatmap-heat-lower',
    //     'type': 'heatmap',
    //     'source': 'heatmap',
    //     'source-layer': 'heatmap',
    //     'visibility': 'none',
    //     'minzoom': 14,
    //     'paint': {
    //         'heatmap-weight': ['case',
    //             ['>', ['get', 'users'], 0], ['max', ['/', ['get', 'users'], 10000], .1],
    //             0],
    //         'heatmap-intensity': 1,
    //         'heatmap-color': [
    //             'interpolate',
    //             ['linear'],
    //             ['heatmap-density'],
    //             0,
    //             'rgba(33,102,172,0)',
    //             0.5,
    //             'rgba(103,169,207,1)',
    //             0.8,
    //             'rgb(255,0,0)',
    //             1,
    //             'rgba(255,220,75, 1)'
    //         ],
    //         'heatmap-radius': [
    //             'interpolate',
    //             ['linear'],
    //             ['zoom'],
    //             14, 10,
    //             20, 20
    //         ],
    //         'heatmap-opacity': 1
    //     }
    // }, lowestSymbol
    // );

    // function factor(zoom) {
    //     return 1000000 * Math.pow(4, 14 - zoom);
    // }

    // map.addLayer({
    //     'id': 'heatmap-heat-higher',
    //     'type': 'heatmap',
    //     'source': 'heatmap',
    //     'source-layer': 'heatmap',
    //     'visibility': 'none',
    //     'maxzoom': 14,
    //     'paint': {
    //         'heatmap-weight': [
    //             'interpolate',
    //             ['linear'],
    //             ['zoom'],
    //             0,
    //             ['case',
    //                 ['>', ['get', 'users'], 0], ['max', ['/', ['get', 'users'], factor(0)], .1],
    //                 0],
    //             12,
    //             ['case',
    //                 ['>', ['get', 'users'], 0], ['max', ['/', ['get', 'users'], factor(12)], .1],
    //                 0],
    //             13,
    //             ['case',
    //                 ['>', ['get', 'users'], 0], ['max', ['/', ['get', 'users'], factor(13)], .1],
    //                 0],
    //             14,
    //             ['case',
    //                 ['>', ['get', 'users'], 0], ['max', ['/', ['get', 'users'], factor(14)], .1],
    //                 0]
    //         ],
    //         'heatmap-intensity': 1,
    //         'heatmap-color': [
    //             'interpolate',
    //             ['linear'],
    //             ['heatmap-density'],
    //             0,
    //             'rgba(33,102,172,0)',
    //             0.5,
    //             'rgba(103,169,207,1)',
    //             0.8,
    //             'rgb(255,0,0)',
    //             1,
    //             'rgba(255,220,75, 1)'
    //         ],
    //         'heatmap-radius': 10,
    //         'heatmap-opacity': [
    //             'interpolate',
    //             ['linear'],
    //             ['zoom'],
    //             0,
    //             0.5,
    //             14,
    //             0.9
    //         ]
    //     }
    // }, lowestSymbol
    // );

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

    var selectedTree: TrafficCountTree = {};

    map.on('click', function (e) {
        // set bbox as 5px reactangle area around clicked point
        var bbox = [
            [e.point.x - 5, e.point.y - 5],
            [e.point.x + 5, e.point.y + 5]
        ];

        var features = map.queryRenderedFeatures(bbox, {
            layers: ['bicycle-counts']
        });
        
        if (features.length == 0) {
            map.setFilter('bicycle-counts', undefined);

            map.removeFeatureState({
                source: 'bicycle-counts',
                sourceLayer: "bikedata"
            });

            return;
        }

        var feature = features[0];

        var filter: any[] = ['in', 'id', feature.properties.id];
        map.setFilter('bicycle-counts', filter);

        // get tree forward
        trafficCountsApi.getTree(DirectedEdgeId.ToDirectedEdgeId(feature.properties.id, true), (tree) => {
            selectedTree = tree;

            for (var o in tree.originTree) {
                var origin = tree.originTree[o];
                var originDirectedId = new DirectedEdgeId(Number(o));
                
                map.setFeatureState({
                    id: originDirectedId.EdgeId(),
                    source: "bicycle-counts",
                    sourceLayer: "bikedata"
                }, {
                    origin_count: origin.count,
                    origin_id: originDirectedId.Id(),
                    origin: true
                });
            }

            for (var d in tree.destinationTree) {
                var destination = tree.destinationTree[d];
                var destinationDirectedId = new DirectedEdgeId(Number(d));
                
                map.setFeatureState({
                    id: destinationDirectedId.EdgeId(),
                    source: "bicycle-counts",
                    sourceLayer: "bikedata"
                }, {
                    destination_count: destination.count,
                    destination_id: destinationDirectedId.Id(),
                    destination: true
                });
            }
        });

        
        // // get tree backward
        // $.get(bicycleCountsApi + '/trees/' + (-(Number(feature.properties.id) + 1)), (data) => {
        //     console.log(data);
        //     for (const c in data.destinations) {
        //         var edgeId = Number(c);
        //         if (edgeId < 0) {
        //             edgeId = -edgeId;
        //         }
        //         edgeId = edgeId - 1;
        //         filter.push(edgeId);
        //     }
        //     for (const c in data.origins) {
        //         var edgeId = Number(c);
        //         if (edgeId < 0) {
        //             edgeId = -edgeId;
        //         }
        //         edgeId = edgeId - 1;
        //         filter.push(edgeId);
        //     }
        //     map.setFilter('bicycle-counts', filter);
        // });


        // // Run through the selected features and set a filter
        // // to match features with unique FIPS codes to activate
        // // the `counties-highlighted` layer.
        // var filter = features.reduce(
        //     function (memo, feature) {
        //         memo.push(feature.properties.id);
        //         return memo;
        //     },
        //     ['in', 'id']
        // );

        // console.log(filter);

        // if (filter.length < 3) {
        // } else {
        //     map.setFilter('bicycle-counts', filter);
        // }
    });

    var hoveredId = null;

    map.on('mousemove', 'bicycle-counts-origins', function (e) {
        if (e.features.length > 0) {
            if (hoveredId) {
                map.setFeatureState({
                    source: 'bicycle-counts',
                    sourceLayer: "bikedata",
                    id: hoveredId
                },
                    { hover: false }
                );
            }
            hoveredId = e.features[0].id;
            map.setFeatureState(
                {
                    source: 'bicycle-counts',
                    sourceLayer: "bikedata",
                    id: hoveredId
                },
                { hover: true }
            );

            var state = map.getFeatureState({
                source: 'bicycle-counts',
                sourceLayer: "bikedata",
                id: hoveredId
            });
            console.log(state);

            // do routes layer

            if (originTree != null) {
                for (const c in originTree) {
                    var edgeId = Number(c);
                    if (edgeId < 0) {
                        edgeId = -edgeId;
                    }
                    edgeId = edgeId - 1;
    
                    map.removeFeatureState({
                        id: edgeId,
                        source: "bicycle-counts",
                        sourceLayer: "bikedata"
                    }, 'route');
                }
                for (const c in destinationTree) {
                    var edgeId = Number(c);
                    if (edgeId < 0) {
                        edgeId = -edgeId;
                    }
                    edgeId = edgeId - 1;
    
                    map.removeFeatureState({
                        id: edgeId,
                        source: "bicycle-counts",
                        sourceLayer: "bikedata"
                    }, 'route');
                }

                var settled = {};
                var queue = [];
                queue.push(state.directedId);
                while (queue.length > 0) {
                    var newQueue = [];

                    // process the current queue
                    // build the next queue
                    queue.forEach(q => {
                        // settle
                        if (settled[q]) return;
                        settled[q] = true;

                        // convert to edge id.
                        var edgeId = q;
                        if (edgeId < 0) {
                            edgeId = -edgeId;
                        }
                        edgeId = edgeId - 1;

                        // set route state, making the edge visible
                        map.setFeatureState({
                            source: 'bicycle-counts',
                            sourceLayer: "bikedata",
                            id: edgeId
                        },{
                            route: true
                        });

                        // move to the next edges
                        var next = originTree[q];
                        if (next == null) return;
                        if (next.edges == null) return;
                        next.edges.forEach(e => {
                            newQueue.push(e);
                        });                        
                    });

                    // move to next queue
                    queue = newQueue;
                }
            }
        }
    });

    map.on('mousemove', 'bicycle-counts-destinations', function (e) {
        if (e.features.length > 0) {
            if (hoveredId) {
                map.setFeatureState({
                    source: 'bicycle-counts',
                    sourceLayer: "bikedata",
                    id: hoveredId
                },
                    { hover: false }
                );
            }
            hoveredId = e.features[0].id;
            map.setFeatureState(
                {
                    source: 'bicycle-counts',
                    sourceLayer: "bikedata",
                    id: hoveredId
                },
                { hover: true }
            );

            var state = map.getFeatureState({
                source: 'bicycle-counts',
                sourceLayer: "bikedata",
                id: hoveredId
            });
            console.log(state);

            // do routes layer

            if (destinationTree != null) {
                for (const c in destinationTree) {
                    var edgeId = Number(c);
                    if (edgeId < 0) {
                        edgeId = -edgeId;
                    }
                    edgeId = edgeId - 1;
    
                    map.removeFeatureState({
                        id: edgeId,
                        source: "bicycle-counts",
                        sourceLayer: "bikedata"
                    }, 'route');
                }
                for (const c in originTree) {
                    var edgeId = Number(c);
                    if (edgeId < 0) {
                        edgeId = -edgeId;
                    }
                    edgeId = edgeId - 1;
    
                    map.removeFeatureState({
                        id: edgeId,
                        source: "bicycle-counts",
                        sourceLayer: "bikedata"
                    }, 'route');
                }

                var settled = {};
                var queue = [];
                queue.push(state.directedId);
                while (queue.length > 0) {
                    var newQueue = [];

                    // process the current queue
                    // build the next queue
                    queue.forEach(q => {
                        // settle
                        if (settled[q]) return;
                        settled[q] = true;

                        // convert to edge id.
                        var edgeId = q;
                        if (edgeId < 0) {
                            edgeId = -edgeId;
                        }
                        edgeId = edgeId - 1;

                        // set route state, making the edge visible
                        map.setFeatureState({
                            source: 'bicycle-counts',
                            sourceLayer: "bikedata",
                            id: edgeId
                        },{
                            route: true
                        });

                        // move to the next edges
                        var next = destinationTree[q];
                        if (next == null) return;
                        if (next.edges == null) return;
                        next.edges.forEach(e => {
                            newQueue.push(e);
                        });                        
                    });

                    // move to next queue
                    queue = newQueue;
                }
            }
        }
    });

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