import { TrafficCountsApi } from "../../apis/traffic-counts-api/TrafficCountsApi";
import { Map, MapMouseEvent, EventData, Marker, PointLike } from 'mapbox-gl';
import { DirectedEdgeId } from "../../apis/traffic-counts-api/DirectedEdgeId";

export class TrafficCountLayers {
    private readonly api: TrafficCountsApi;
    private readonly layerPrefix: string;

    private map: Map;

    constructor(api: TrafficCountsApi) {
        this.api = api;
        this.layerPrefix = "todo-random-prefix_";
    }

    addToMap(map: Map) {
        this.map = map;

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

        map.addSource(`${this.layerPrefix}_counts`, {
            type: 'vector',
            url: this.api.mvtUrl(),
            promoteId: { "bikedata": "id" }
        });

        map.addLayer({
            'id': `${this.layerPrefix}_counts`,
            'type': 'line',
            'source': `${this.layerPrefix}_counts`,
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
            'id': `${this.layerPrefix}_counts-hover`,
            'type': 'line',
            'source': `${this.layerPrefix}_counts`,
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
            'id': `${this.layerPrefix}_counts-origins`,
            'type': 'line',
            'source': `${this.layerPrefix}_counts`,
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
        }, `${this.layerPrefix}_counts-hover`);
    
        map.addLayer({
            'id': `${this.layerPrefix}_counts-destinations`,
            'type': 'line',
            'source': `${this.layerPrefix}_counts`,
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
        }, `${this.layerPrefix}_counts-hover`);
    
        map.addLayer({
            'id': `${this.layerPrefix}_counts-routes`,
            'type': 'line',
            'source': `${this.layerPrefix}_counts`,
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

        // hook up map events
        map.on("click", e => {
            console.log(this);
            this._onMapClick(e);
        })
    }

    private _onMapClick(e: MapMouseEvent & EventData) {

        // get features aroudnc clicked point.
        var bbox: [PointLike, PointLike] = [
            [e.point.x - 5, e.point.y - 5],
            [e.point.x + 5, e.point.y + 5]
        ];
        var features = this.map.queryRenderedFeatures(bbox, {
            layers: [`${this.layerPrefix}_counts`]
        });

        if (features.length == 0) {
            // there no features are selected, reset state.
            this.map.setLayoutProperty(`${this.layerPrefix}_counts`, 'visibility', 'visible');
            this.map.removeFeatureState({
                source: `${this.layerPrefix}_counts`,
                sourceLayer: "bikedata"
            });
            return;
        }

        var feature = features[0];

        this.map.setLayoutProperty(`${this.layerPrefix}_counts`, 'visibility', 'none');

        // get tree forward
        this.api.getTree(DirectedEdgeId.ToDirectedEdgeId(feature.properties.id, true), (tree) => {
            for (var o in tree.originTree) {
                var origin = tree.originTree[o];
                var originDirectedId = new DirectedEdgeId(Number(o));
                
                this.map.setFeatureState({
                    id: originDirectedId.EdgeId(),
                    source: `${this.layerPrefix}_counts`,
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
                
                this.map.setFeatureState({
                    id: destinationDirectedId.EdgeId(),
                    source: `${this.layerPrefix}_counts`,
                    sourceLayer: "bikedata"
                }, {
                    destination_count: destination.count,
                    destination_id: destinationDirectedId.Id(),
                    destination: true
                });
            }
        });
    }
}