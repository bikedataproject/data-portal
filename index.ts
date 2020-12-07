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

const layerControl = new LayerControl();
map.addControl(layerControl, "top-left");

map.addControl(new mapboxgl.NavigationControl());

map.on('load', function () {
    // add bicycle count layers.
    trafficCountLayers.addToMap(map);   

    // hook up layer control.
    trafficCountLayers.hookLayerControl(layerControl);
});