import React, { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';

const MyMap = ({ savedLayers, setSavedLayers }) => {
  const featureGroupRef = useRef();

  // 1. When the component mounts or savedLayers change, 
  // we manually inject them into the FeatureGroup once.
  useEffect(() => {
    const group = featureGroupRef.current;
    if (!group) return;

    // Clear existing layers to prevent duplicates on re-render
    group.clearLayers();

    // Re-add layers from state into the Leaflet FeatureGroup
    savedLayers.forEach(layerData => {
      let leafletLayer;
      if (layerData.type === 'polygon') {
        leafletLayer = L.polygon(layerData.positions);
      } else if (layerData.type === 'marker') {
        leafletLayer = L.marker(layerData.positions);
      }
      
      if (leafletLayer) {
        leafletLayer.addTo(group);
      }
    });
  }, []); // Only run on mount to initialize the map with saved data

  const syncState = () => {
    const group = featureGroupRef.current;
    if (!group) return;

    // 2. Convert all layers currently in the FeatureGroup back to a state array
    const newLayers = [];
    group.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        newLayers.push({ type: 'polygon', positions: layer.getLatLngs() });
      } else if (layer instanceof L.Marker) {
        newLayers.push({ type: 'marker', positions: layer.getLatLng() });
      }
    });

    setSavedLayers(newLayers);
  };

  return (
    <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '500px' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      <FeatureGroup ref={featureGroupRef}>
        <EditControl
          position="topleft"
          onCreated={syncState}
          onEdited={syncState}
          onDeleted={syncState}
          draw={{
            rectangle: false,
            circle: false,
            circlemarker: false,
          }}
        />
      </FeatureGroup>
    </MapContainer>
  );
};