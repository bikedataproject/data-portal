import { IControl, Map, MapDataEvent } from "mapbox-gl";
import { LayerConfig } from "./LayerConfig";
import './*.css';
import { EventsHub } from "../../libs/events/EventsHub";

export class LayerControl implements IControl {
    layers: LayerConfig[];
    map: Map;
    element: HTMLElement;
    navElement: HTMLElement;

    events: EventsHub<LayerConfig> = new EventsHub();

    constructor(layers?: LayerConfig[]) {
        if (layers) {
            this.layers = layers;
        } else {
            this.layers = [];
        }
    }

    on(name: string | string[], callback: (args: LayerConfig) => void) {
        this.events.on(name, callback);
    }

    onAdd(map: mapboxgl.Map): HTMLElement {
        this.map = map;

        // create element.
        this.element = document.createElement("div");
        this.element.className = "mapboxgl-ctrl mapboxgl-ctrl-group";

        this.navElement = document.createElement("nav");
        this.navElement.classList.add("layers");
        this.element.appendChild(this.navElement);

        // build initial layers
        this._buildLayers();
        
        // hook up events.
        var me = this;
        this.map.on("data", function (e) { me._onMapData(e); });

        return this.element;
    }

    onRemove(map: mapboxgl.Map) {

    }

    addLayer(layerConfig: LayerConfig): number {
        var id = this.layers.length;
        this.layers.push(layerConfig);

        // update layers
        this._buildLayers();

        return id;
    }

    removeLayer(id: number) {
        this.layers = this.layers.splice(id, 1);

        // update layers
        this._buildLayers();
    }

    private _onMapData(e: MapDataEvent) {
        if (e.type != "style") return;

        this._buildLayers();
    }

    private hide(layerConfig: LayerConfig) {        
        layerConfig.layers.forEach(lid => {
            this.toggleLayer(lid, false);
        });
        layerConfig.visible = false;

        this.events.trigger("hide", layerConfig);
    }

    private show(layerConfig: LayerConfig) {        
        layerConfig.layers.forEach(lid => {
            this.toggleLayer(lid, true);
        });
        layerConfig.visible = true;

        this.events.trigger("show", layerConfig);
    }

    private toggleLayer(layerId: string, visible: boolean) {
        var layer = this.map.getLayer(layerId);

        if (typeof layer == "undefined") return;

        if (visible) {
            this.map.setLayoutProperty(layerId, "visibility", "visible");

        } else {
            this.map.setLayoutProperty(layerId, "visibility", "none");
        }
    }

    private _buildLayers() {
        this.navElement.innerHTML = "";

        for (var i = 0; i < this.layers.length; i++){
            var layerConfig = this.layers[i];

            var layerButton = document.createElement("a");
            layerButton.href.link("#");
            layerButton.classList.add("btn");
            layerButton.type = "button";
            layerButton.innerHTML = layerConfig.name;
            if (layerConfig.visible) {
                layerButton.classList.add("active");
            }
            layerButton.addEventListener("click", e => {
                if (layerConfig.visible) {
                    this.hide(layerConfig);
                    layerButton.classList.remove("active");
                } else {
                    this.show(layerConfig);
                    layerButton.classList.add("active");
                }
            });

            this.navElement.appendChild(layerButton);
        });
    }
}
