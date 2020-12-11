import { TrafficCountsApi } from "../../apis/traffic-counts-api/TrafficCountsApi";
import { Map, MapMouseEvent, EventData, Marker, PointLike, IControl, MapStyleDataEvent, MapboxGeoJSONFeature } from 'mapbox-gl';
import { DirectedEdgeId } from "../../apis/traffic-counts-api/DirectedEdgeId";
import { TrafficCountTree } from "../../apis/traffic-counts-api/TrafficCountTree";
import { LayerControl } from "../layer-control/LayerControl";
import { LayerConfig } from "../layer-control/LayerConfig";
import './*.css';

export class TrafficCountLayers implements IControl {
    private readonly api: TrafficCountsApi;
    private readonly layerPrefix: string;

    private map: Map;
    private hoveredId: number;
    private selectedTree: TrafficCountTree;
    private hover: boolean = true;
    private element: HTMLDivElement;
    private navElement: HTMLElement;
    private selectedFeature: MapboxGeoJSONFeature;

    active: boolean = true;

    constructor(api: TrafficCountsApi, settings?: { hover?: boolean }) {
        this.api = api;
        this.layerPrefix = "todo-random-prefix_";

        if (settings) {
            if (this.hover != undefined) this.hover = settings.hover;
        }
    }

    onAdd(map: mapboxgl.Map): HTMLElement {
        this.map = map;

        // create element.
        this.element = document.createElement("div");
        this.element.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

        this.navElement = document.createElement("nav");
        this.navElement.classList.add("counts-map-overlay");
        this.element.appendChild(this.navElement);

        // hook up events.
        var me = this;
        this.map.on("data", e => {
            var mapStyleDataEvent = e as MapStyleDataEvent;
            if (mapStyleDataEvent.dataType == "style") {
                me._onMapStyleLoaded();
            }
        });
        this.map.on('zoomend', _ => {
            //me._onZoomEnd();
        });

        return this.element;
    }

    onRemove(map: mapboxgl.Map) {

    }

    private _onMapStyleLoaded(): void {
        var existing = this.map.getLayer(`${this.layerPrefix}_counts`);
        if (existing) return;

        // build initial layers
        this._buildLayers();
    }

    private _updateOverlay(hoverDetails: any): void {
        if (!this.active) return;

        this.navElement.innerHTML = '';

        const feature = this.selectedFeature;
        const container = document.createElement('div');
        container.classList.add("wrapper");

        const title = document.createElement('h4');
        title.classList.add('data__subtitle');

        var name = "";
        if (feature.properties.name) {
            name = feature.properties.name;
        }
        title.textContent = name;

        const dataWrapper = document.createElement('section');
        dataWrapper.classList.add('data__wrapper');

        if (hoverDetails) {            
            const count = hoverDetails.count;

            if (!count) {
                dataWrapper.innerHTML = `
                    <div class="data__empty">
                      <p>No data collected yet. Get cycling & share your data 🚴</p>
                    </div>`;
            } else {
                dataWrapper.innerHTML = `
                     <div class="data__set">
                       <span class="data__number">${count}</span>
                       <p class="data__label">Local Count</p>
                     </div>
                    `;
            }
        } else {

            const forwardCount = feature.properties["forward_count"];
            const backwardCount = feature.properties["backward_count"];
            const count = forwardCount + backwardCount;

            if (!count) {
                dataWrapper.innerHTML = `
                    <div class="data__empty">
                      <p>No data collected yet. Get cycling & share your data 🚴</p>
                    </div>`;
            } else {
                dataWrapper.innerHTML = `
                     <div class="data__set">
                       <span class="data__number">${count}</span>
                       <p class="data__label">Total Bicycles</p>
                     </div>
                     <div class="data__set">
                       <span class="data__number">${forwardCount}</span>
                       <p class="data__label">Forward Count</p>
                     </div>
                     <div class="data__set">
                       <span class="data__number">${backwardCount}</span>
                       <p class="data__label">Backward Count</p>
                     </div>
                    `;
            }
        }

        this.navElement.appendChild(container);
        container.appendChild(title);
        container.appendChild(dataWrapper);
        this.navElement.style.display = 'block';
    }

    private _buildLayers(): void {

        // get lowest label and road.
        var style = this.map.getStyle();
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

        var behindLayer = lowestSymbol;

        this.map.addSource(`${this.layerPrefix}_counts`, {
            type: 'vector',
            url: this.api.mvtUrl(),
            promoteId: { "bikedata": "id" }
        });

        this.map.addLayer({
            'id': `${this.layerPrefix}_counts`,
            'type': 'line',
            'source': `${this.layerPrefix}_counts`,
            'source-layer': 'bikedata',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round',
                'visibility': this.active ? 'visible' : 'none'
            },
            'paint': {
                'line-color': '#FFF',
                'line-opacity': 0.5,
                'line-width': ['interpolate', ['linear'], ['zoom'],
                    10, ["min", ["max", ["/", ["+", ["get", "forward_count"], ["get", "backward_count"]], 10], 0.1], 2],
                    14, ["min", ["max", ["/", ["+", ["get", "forward_count"], ["get", "backward_count"]], 5], 0.1], 5]
                ]
            }
        }, behindLayer);

        this.map.addLayer({
            'id': `${this.layerPrefix}_counts-selected`,
            'type': 'line',
            'source': `${this.layerPrefix}_counts`,
            'source-layer': 'bikedata',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': '#FFF',
                'line-width': [
                    'case',
                    ['boolean', ['feature-state', 'selected'], false],
                    5,
                    0
                ]
            }
        }, behindLayer);

        this.map.addLayer({
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
        }, `${this.layerPrefix}_counts-selected`);

        this.map.addLayer({
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

        this.map.addLayer({
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

        this.map.addLayer({
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
        }, behindLayer);

        // hook up map events
        this.map.on("click", e => {
            this._onMapClick(e);
        });
        this.map.on('mousemove', e => {
            if (!this.active) return;

            // get features aroud the hovered point.
            var bbox: [PointLike, PointLike] = [
                [e.point.x - 5, e.point.y - 5],
                [e.point.x + 5, e.point.y + 5]
            ];

            // check origins layer.
            var features = this.map.queryRenderedFeatures(bbox, {
                layers: [`${this.layerPrefix}_counts-origins`]
            });
            if (features.length > 0) {
                for (var i = 0; i < features.length; i++) {
                    var f = features[i];
                    var state = this.map.getFeatureState(f);
                    if (state && state.origin) {
                        e.features = [f];
                        this._onMouseMoveOrigins(e);
                        return;
                    }
                }
            }

            // check destinations layer.
            var features = this.map.queryRenderedFeatures(bbox, {
                layers: [`${this.layerPrefix}_counts-destinations`]
            });
            if (features.length > 0) {
                for (var i = 0; i < features.length; i++) {
                    var f = features[i];
                    var state = this.map.getFeatureState(f);
                    if (state && state.destination) {
                        e.features = [f];
                        this._onMouseMoveDestinations(e);
                        return;
                    }
                }
            }
        });
    }

    activate(): void {
        this.active = true;
    }

    disactivate(): void {
        this.active = false;
    }

    hookLayerControl(layerControl: LayerControl, visible?: boolean) {
        if (visible == undefined) visible = true;
        var layerConfig: LayerConfig = {
            name: 'Bicycle Counts (Preview)',
            layers: [
                `${this.layerPrefix}_counts`,
                `${this.layerPrefix}_counts-selected`,
                `${this.layerPrefix}_counts-hover`,
                `${this.layerPrefix}_counts-origins`,
                `${this.layerPrefix}_counts-destinations`,
                `${this.layerPrefix}_counts-routes`
            ],
            visible: visible
        };

        if (visible) {
            this.activate();

            layerConfig.layers.forEach(l => {
                var layer = this.map.getLayer(l);
                if (layer) {
                    this.map.setLayoutProperty(l, "visibility", "visible");
                }
            });
        } else {
            this.disactivate();

            layerConfig.layers.forEach(l => {
                var layer = this.map.getLayer(l);
                if (layer) {
                    this.map.setLayoutProperty(l, "visibility", "none");
                }
            });
        }

        layerControl.addLayer(layerConfig);

        var me = this;
        layerControl.on('show', c => {
            if (c.name != layerConfig.name) return;

            me.active = true;
            me._reset();
        });
        layerControl.on('hide', c => {
            if (c.name != layerConfig.name) return;

            this.navElement.style.display = 'none';
            me.active = false;
        });
    }

    private _reset(): void {
        // there no features are selected, reset state.
        if (this.active) {
            this.map.setLayoutProperty(`${this.layerPrefix}_counts`, 'visibility', 'visible');
        } else {
            this.map.setLayoutProperty(`${this.layerPrefix}_counts`, 'visibility', 'none');
        }
    }

    private _onMapClick(e: MapMouseEvent & EventData) {
        if (!this.active) return;

        // reset feature states.
        this.map.removeFeatureState({
            source: `${this.layerPrefix}_counts`,
            sourceLayer: "bikedata"
        });

        // get features aroud the clicked point.
        var bbox: [PointLike, PointLike] = [
            [e.point.x - 5, e.point.y - 5],
            [e.point.x + 5, e.point.y + 5]
        ];
        var features = this.map.queryRenderedFeatures(bbox, {
            layers: [`${this.layerPrefix}_counts-selected`]
        });

        if (features.length == 0) {
            features = this.map.queryRenderedFeatures(bbox, {
                layers: [`${this.layerPrefix}_counts-origins`]
            });
        }

        if (features.length == 0) {
            features = this.map.queryRenderedFeatures(bbox, {
                layers: [`${this.layerPrefix}_counts-destinations`]
            });
        }

        if (features.length == 0) {
            features = this.map.queryRenderedFeatures(bbox, {
                layers: [`${this.layerPrefix}_counts`]
            });
        }

        if (features.length == 0) {
            this._reset();
            return;
        }

        var feature = features[0];

        var selectedDirectedId = DirectedEdgeId.ToDirectedEdgeId(feature.properties.id, true);

        if (this.selectedTree) {
            var selectedTreeDirectedId = new DirectedEdgeId(this.selectedTree.directedEdgeId);
            if (selectedDirectedId.EdgeId() == selectedTreeDirectedId.EdgeId()) {
                selectedDirectedId = selectedTreeDirectedId.Invert();
            }
        }

        this.map.setFeatureState({
            id: selectedDirectedId.EdgeId(),
            source: `${this.layerPrefix}_counts`,
            sourceLayer: "bikedata"
        }, {
            selected: true
        });
        this.selectedFeature = feature;

        this.map.setLayoutProperty(`${this.layerPrefix}_counts`, 'visibility', 'none');

        // get tree forward
        this.api.getTree(selectedDirectedId, tree => {
            this._updateOverlay(undefined);
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

            this.selectedTree = tree;
        });
    }

    private _onMouseMoveOrigins(e: MapMouseEvent & EventData) {
        if (!this.active) return;
        if (!this.hover) return;

        if (e.features.length > 0) {
            if (this.hoveredId) {
                this.map.setFeatureState({
                    source: `${this.layerPrefix}_counts`,
                    sourceLayer: "bikedata",
                    id: this.hoveredId
                },
                    { hover: false }
                );
            }
            this.hoveredId = e.features[0].id;
            this.map.setFeatureState(
                {
                    source: `${this.layerPrefix}_counts`,
                    sourceLayer: "bikedata",
                    id: this.hoveredId
                },
                { hover: true }
            );
            this.selectedFeature = e.features[0];

            if (this.selectedTree.originTree) {
                var directedEdgeId = new DirectedEdgeId(this.selectedFeature.properties.id);
                var hoverDetails = this.selectedTree.originTree[directedEdgeId.Id()];
                if (!hoverDetails) {
                    directedEdgeId = directedEdgeId.Invert();
                    hoverDetails = this.selectedTree.originTree[directedEdgeId.Id()];
                }
                if (hoverDetails) this._updateOverlay(hoverDetails);
            }

            // var state = this.map.getFeatureState({
            //     source: `${this.layerPrefix}_counts`,
            //     sourceLayer: "bikedata",
            //     id: this.hoveredId
            // });

            // // do routes layer
            // if (this.selectedTree.originTree != null) {
            //     for (const c in this.selectedTree.originTree) {
            //         var edgeId = new DirectedEdgeId(Number(c));

            //         this.map.removeFeatureState({
            //             id: edgeId.EdgeId(),
            //             source: `${this.layerPrefix}_counts`,
            //             sourceLayer: "bikedata"
            //         }, 'route');
            //     }

            //     if (this.selectedTree.destinationTree != null) {
            //         for (const c in this.selectedTree.destinationTree) {
            //             var edgeId = new DirectedEdgeId(Number(c));

            //             this.map.removeFeatureState({
            //                 id: edgeId.EdgeId(),
            //                 source: `${this.layerPrefix}_counts`,
            //                 sourceLayer: "bikedata"
            //             }, 'route');
            //         }
            //     }

            //     var settled = {};
            //     var queue: number[] = [];
            //     queue.push(Number(state["origin_id"]));
            //     while (queue.length > 0) {
            //         var newQueue = [];

            //         // process the current queue
            //         // build the next queue
            //         queue.forEach(q => {
            //             // settle
            //             if (settled[q]) return;
            //             settled[q] = true;

            //             // convert to edge id.
            //             var edgeId = new DirectedEdgeId(q);

            //             // set route state, making the edge visible
            //             this.map.setFeatureState({
            //                 source: `${this.layerPrefix}_counts`,
            //                 sourceLayer: "bikedata",
            //                 id: edgeId.EdgeId()
            //             }, {
            //                 route: true
            //             });

            //             // move to the next edges
            //             var next = this.selectedTree.originTree[q];
            //             if (next == null) return;
            //             if (next.edges == null) return;
            //             next.edges.forEach(e => {
            //                 newQueue.push(e);
            //             });
            //         });

            //         // move to next queue
            //         queue = newQueue;
            //     }
            // }
        }
    }

    private _onMouseMoveDestinations(e: MapMouseEvent & EventData) {
        if (!this.active) return;
        if (!this.hover) return;

        if (e.features.length > 0) {
            if (this.hoveredId) {
                this.map.setFeatureState({
                    source: `${this.layerPrefix}_counts`,
                    sourceLayer: "bikedata",
                    id: this.hoveredId
                },
                    { hover: false }
                );
            }
            this.hoveredId = e.features[0].id;
            this.map.setFeatureState(
                {
                    source: `${this.layerPrefix}_counts`,
                    sourceLayer: "bikedata",
                    id: this.hoveredId
                },
                { hover: true }
            );
            this.selectedFeature = e.features[0];

            if (this.selectedTree.destinationTree) {
                var directedEdgeId = new DirectedEdgeId(this.selectedFeature.properties.id);
                var hoverDetails = this.selectedTree.destinationTree[directedEdgeId.Id()];
                if (!hoverDetails) {
                    directedEdgeId = directedEdgeId.Invert();
                    hoverDetails = this.selectedTree.destinationTree[directedEdgeId.Id()];
                }
                if (hoverDetails) this._updateOverlay(hoverDetails);
            }

            // var state = this.map.getFeatureState({
            //     source: `${this.layerPrefix}_counts`,
            //     sourceLayer: "bikedata",
            //     id: this.hoveredId
            // });

            // // do routes layer
            // if (this.selectedTree.destinationTree != null) {
            //     for (const c in this.selectedTree.destinationTree) {
            //         var edgeId = new DirectedEdgeId(Number(c));

            //         this.map.removeFeatureState({
            //             id: edgeId.EdgeId(),
            //             source: `${this.layerPrefix}_counts`,
            //             sourceLayer: "bikedata"
            //         }, 'route');
            //     }

            //     if (this.selectedTree.originTree != null) {
            //         for (const c in this.selectedTree.originTree) {
            //             var edgeId = new DirectedEdgeId(Number(c));

            //             this.map.removeFeatureState({
            //                 id: edgeId.EdgeId(),
            //                 source: `${this.layerPrefix}_counts`,
            //                 sourceLayer: "bikedata"
            //             }, 'route');
            //         }
            //     }

            //     var settled = {};
            //     var queue: number[] = [];
            //     queue.push(Number(state["destination_id"]));
            //     while (queue.length > 0) {
            //         var newQueue = [];

            //         // process the current queue
            //         // build the next queue
            //         queue.forEach(q => {
            //             // settle
            //             if (settled[q]) return;
            //             settled[q] = true;

            //             // convert to edge id.
            //             var edgeId = new DirectedEdgeId(q);

            //             // set route state, making the edge visible
            //             this.map.setFeatureState({
            //                 source: `${this.layerPrefix}_counts`,
            //                 sourceLayer: "bikedata",
            //                 id: edgeId.EdgeId()
            //             }, {
            //                 route: true
            //             });

            //             // move to the next edges
            //             var next = this.selectedTree.destinationTree[q];
            //             if (next == null) return;
            //             if (next.edges == null) return;
            //             next.edges.forEach(e => {
            //                 newQueue.push(e);
            //             });
            //         });

            //         // move to next queue
            //         queue = newQueue;
            //     }
            // }
        }
    }
}