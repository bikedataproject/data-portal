import { IControl, Map, MapDataEvent, MapSourceDataEvent, MapStyleDataEvent } from "mapbox-gl";
import './*.css';
import { EventsHub } from "../../libs/events/EventsHub";
import { allStatistics } from "./Data";
import { LayerControl } from "../layer-control/LayerControl";
import { LayerConfig } from "../layer-control/LayerConfig";

export class StatisticsControl implements IControl {
    private map: Map;
    private element: HTMLElement;
    private navElement: HTMLElement;

    private selectedFeature: any;
    private lastLocation: any;
    private beforeLayer?: string

    private active: boolean = true;

    constructor(beforeLayer?: string) {
        this.beforeLayer = beforeLayer;
    }

    onAdd(map: mapboxgl.Map): HTMLElement {
        this.map = map;

        // create element.
        this.element = document.createElement("div");
        this.element.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

        this.navElement = document.createElement("nav");
        this.navElement.classList.add("map-overlay");
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
            me._onZoomEnd();
        });

        return this.element;
    }

    onRemove(map: mapboxgl.Map) {

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
            name: 'Statistics',
            layers: [
                `areas-stats`,
                `areas-stats-selected`,                
                `areas-stats-boundaries`
            ],
            visible: visible
        };

        if (visible) {
            this.activate();
        } else {
            this.disactivate();
        }

        layerControl.addLayer(layerConfig);

        var me = this;
        layerControl.on('show', c => {
            if (c.name != layerConfig.name) return;

            me._onMouseLeave();
            me.active = true;
        });
        layerControl.on('hide', c => {
            if (c.name != layerConfig.name) return;

            me.active = false;
        });
    }

    private _onMapStyleLoaded(): void {
        var existing = this.map.getLayer('areas-stats');
        if (existing) return;

        // build initial layers
        this._buildLayers();
    }

    private _onMouseLeave(): void {
        if (!this.active) return;

        this.map.getCanvas().style.cursor = '';

        if (this.selectedFeature) {
            this.map.removeFeatureState({
                source: "areas",
                sourceLayer: "areas",
                id: this.selectedFeature.properties.id
            }, 'selected');
        }

        this.navElement.style.display = 'none';
        this.lastLocation = undefined;
    }

    private _onZoomEnd(): void {
        if (!this.active) return;

        if (this.lastLocation) {
            var statsArea = this.map.queryRenderedFeatures(this.lastLocation, {
                layers: ["areas-stats"]
            });

            if (statsArea && statsArea.length > 0) {

                if (this.selectedFeature) {
                    this.map.removeFeatureState({
                        source: "areas",
                        sourceLayer: "areas",
                        id: this.selectedFeature.properties.id
                    }, 'selected');
                }

                this.selectedFeature = statsArea[0];
                this._updateOverlay();


            this.map.setFeatureState(this.selectedFeature,
                {
                    selected: true
                });
            }
        }
    }

    private _onMapData(e: MapSourceDataEvent) {
        var me = this;

        if (e.isSourceLoaded) {
            const allStats = allStatistics.getAll();

            this.map.querySourceFeatures("areas", {
                sourceLayer: "areas"
            }).forEach(function (f) {
                if (f.properties && f.properties.id) {
                    var stats = allStats[f.properties.id];
                    if (stats) {
                        me.map.setFeatureState({
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
    }

    private _buildLayers(): void {

        this.map.addSource("areas", {
            type: 'vector',
            url: 'https://api.bikedataproject.org/tiles/areas/mvt.json',
            promoteId: 'id'
        });

        this.map.addLayer({
            id: 'areas-stats',
            type: 'fill',
            source: 'areas',
            'source-layer': 'areas',
            paint: {
                'fill-color': '#EF4823',
                'fill-opacity': 0.01,
            },
        }, this.beforeLayer);

        this.map.addLayer({
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

        this.map.addLayer(
            {
                id: 'areas-stats-selected',
                type: 'fill',
                source: 'areas',
                'source-layer': 'areas',
                paint: {
                    'fill-color': 'rgba(103,169,207,0.3)',
                    'fill-opacity': [ 
                        'case',
                        ['boolean', ['feature-state', 'selected'], false],
                        0.75,
                        0
                    ]
                }
            }, this.beforeLayer);

        var me = this;
        this.map.on("data", e => {    
            if (!this.active) return;

            var mapSourceDataEvent = e as MapSourceDataEvent;
            if (mapSourceDataEvent.isSourceLoaded) {   
                me._onMapData(mapSourceDataEvent); 
            }
        });

        this.map.on('mouseleave', 'areas-stats', _ => {
            if (!this.active) return;

            this._onMouseLeave();
        });
        this.map.on('mousemove', 'areas-stats', e => {
            if (!this.active) return;

            this.map.getCanvas().style.cursor = 'pointer';

            this.lastLocation = e.point;

            if (this.selectedFeature) {
                this.map.removeFeatureState({
                    source: "areas",
                    sourceLayer: "areas",
                    id: this.selectedFeature.properties.id
                }, 'selected');
            }

            this.selectedFeature = e.features[0];    
            this._updateOverlay();
            this.map.setFeatureState(this.selectedFeature,
                {
                    selected: true
                });
    
            // this.map.setFilter('areas-stats-selected', [
            //     'in',
            //     'id',
            //     this.selectedFeature.properties.id,
            // ]);
        });
    }

    private _updateOverlay(): void {
        if (!this.active) return;

        this.navElement.innerHTML = '';

        const feature = this.selectedFeature;

        const container = document.createElement('div');
        container.classList.add("wrapper");

        const title = document.createElement('h4');
        title.classList.add('data__subtitle');
        title.textContent = feature.properties.name;

        const dataWrapper = document.createElement('section');
        dataWrapper.classList.add('data__wrapper');

        const featureStats = this.map.getFeatureState({
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

        this.navElement.appendChild(container);
        container.appendChild(title);
        container.appendChild(dataWrapper);
        this.navElement.style.display = 'block';
    }
}
