import { IControl, Map, MapDataEvent } from "mapbox-gl";
import { LayerConfig } from "./LayerConfig";
import './*.css';

export class LayerControl implements IControl {
    layers: LayerConfig[];
    map: Map;
    element: HTMLElement;
    navElement: HTMLElement;

    constructor(layers: LayerConfig[]) {
        this.layers = layers;

        for (var l = 0; l < this.layers.length; l++) {
            this.layers[l].visible = true;
        }
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

    private _onMapData(e: MapDataEvent) {
        if (e.type != "style") return;

        this._buildLayers();
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

        this.layers.forEach(l => {
            var layerButton = document.createElement("a");
            layerButton.href.link("#");
            layerButton.classList.add("btn");
            layerButton.type = "button";
            layerButton.innerHTML = l.name;
            if (l.visible) {
                layerButton.classList.add("active");
            }
            layerButton.addEventListener("click", e => {
                if (l.visible) {
                    l.layers.forEach(lid => {
                        this.toggleLayer(lid, false);
                    });
                    l.visible = false;
                    layerButton.classList.remove("active");
                } else {
                    l.layers.forEach(lid => {
                        this.toggleLayer(lid, true);
                    });
                    l.visible = true;
                    layerButton.classList.add("active");
                }
            });

            this.navElement.appendChild(layerButton);
        });
    }
}
