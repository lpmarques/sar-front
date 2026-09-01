/*
Simulador Agroflorestal Regenera (SAR)
Copyright (C) 2026  Lucas Marques and Regenera Mata Atlântica

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses>.
*/

import { Polygon as GJPolygon } from "geojson";
import {
  DrawEvents,
  latLngBounds,
  Layer,
  LeafletEventHandlerFnMap,
  LeafletMouseEvent,
  Map,
  Marker as MarkerLayer,
  Polygon as PolygonLayer,
} from "leaflet";
import { RefObject, useMemo, useRef, useState } from "react";
import {
  FeatureGroup,
  LayersControl,
  MapContainerProps,
  Marker,
  MarkerProps,
  Polygon,
  PolygonProps,
  ZoomControl,
} from "react-leaflet";
import { Text } from '@mantine/core';
import { MapStyle } from '@maptiler/sdk';
import booleanEqual from "@turf/boolean-equal";
import booleanContains from "@turf/boolean-contains";
import { useProject } from "../../hooks/useProject";
import { latLngToPosition, pointInPoly, positionToLatLng } from "../../utils/agroforestry";
import { openAlertModal } from "../common/alerts";
import {
  ButtonControl,
  EditControl,
  FieldFeatureGroup,
  MapBoundsFraming,
  MapCentering,
  MapContainer,
  MaptilerVectorLayer,
} from ".";

const MAX_ZOOM = 22;

interface FieldsMapProps extends MapContainerProps {
  farmMarkerProps?: Omit<MarkerProps, 'key' | 'position'>,
  farmPolygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
  fieldPolygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
  selectedFieldPolygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
  onFieldPolygonEditStart?: (e: DrawEvents.EditStart) => void,
  onFieldPolygonEditStop?: (e: DrawEvents.EditStop) => void,
  onCroppingComputed?: () => void,
}

export default function FieldsMap({
  center,
  zoom,
  style={ width: '100%' },
  farmMarkerProps,
  farmPolygonProps,
  fieldPolygonProps,
  selectedFieldPolygonProps,
  onFieldPolygonEditStart,
  onFieldPolygonEditStop,
  onCroppingComputed,
  ...mapContainerProps
}: FieldsMapProps
) {
  const project = useProject();

  if (!project) {
    throw new Error("FieldsMap has to be used within <ProjectProvider>");
  }
  const {
    farm,
    fields,
    selectedFieldIndex,
    selectField,
    addField
  } = project;

  const [drawingNewField, setDrawingNewField] = useState<boolean>(false);

  const drawingMode = selectedFieldIndex !== null || drawingNewField;

  const focusIndex = selectedFieldIndex;
  const focusField = useMemo(
    () => focusIndex !== null ? fields[focusIndex] : undefined,
    [focusIndex]
  );
  
  const polygonEventHandlers: LeafletEventHandlerFnMap = {
    click: (e: LeafletMouseEvent) => {
      const layer = e.target;
      if (focusField) {
        openAlertModal({
          title: <Text><strong>{focusField.name}</strong> em foco</Text>,
          message: 'Feche a área atual, no menu lateral, antes de abrir outra área.'
        });
      } else if (layer instanceof PolygonLayer) {
        const geoJson = layer.toGeoJSON();
        const fieldIndex = fields.findIndex((field) => booleanEqual(field.polygon, geoJson.geometry));
        selectField(fieldIndex);
      }
    }
  };

  const validatePolygonVertex = (vertex: Layer) => {
    if (vertex instanceof MarkerLayer) {
      const [x, y] = latLngToPosition(vertex.getLatLng());
      const markerElement = vertex.getElement();

      if (!pointInPoly([x, y], farm.polygon!.coordinates[0])) {
        if (markerElement) markerElement.style.backgroundColor = "#de4747";
        
        return Error("Ponto Inválido");
      }

      if (markerElement) markerElement.style.backgroundColor = "#fafafa";
    }
  }
  
  const handleDrawVertex = (e: DrawEvents.DrawVertex) => {
    const layers = e.layers.getLayers();
    const vertex = layers[layers.length-1];
    const err = validatePolygonVertex(vertex);
    if (err)
      openAlertModal({
        title: err.message,
        message: `A área de cultivo não pode extrapolar os limites da propriedade.
          Elimine o último ponto e marque novamente.`
      });
  };

  const handleCreated = (e: DrawEvents.Created) => {
    if (e.layer instanceof PolygonLayer) {
      const polygon = e.layer.toGeoJSON().geometry as GJPolygon;
      if (booleanContains(farm.polygon!, polygon)) {
        addField({ polygon });
        setDrawingNewField(false);
      } else {
        openAlertModal({
          title: 'Polígono inválido',
          message: 'A área de cultivo não pode extrapolar os limites da propriedade.'
        });
      }

      e.layer.remove(); // removes leaflet-draw's layer to avoid duplication with to-be-rendered react-leaflet's Polygon
    }
  };

  const otherFields = fields.filter((_, index) => index !== focusIndex);
  const otherFieldsFeatures = otherFields.map((field) => {
    const latLngs = positionToLatLng(field.polygon.coordinates);
    return (
      <Polygon
        key={latLngs.toString()}
        positions={latLngs}
        eventHandlers={polygonEventHandlers}
        pathOptions={{color: 'orange', opacity: 0.1}}
        {...fieldPolygonProps}
      />
    );
  });

  const fieldsFeatureGroup = (
    <FeatureGroup>
      {otherFieldsFeatures}
      {drawingMode &&
      <EditControl
        position="topright"
        onCreated={handleCreated}
        onDrawVertex={handleDrawVertex}
        draw={{
          polygon: !focusField ? {
            shapeOptions: {
              color: 'orange'
            },
          } : false,
          marker: false,
          polyline: false,
          rectangle: false,
          circle: false,
          circlemarker: false,
        }}
        edit={{
          remove: false,
          edit: false,
        }}
      />}
    </FeatureGroup>
  );
    
  const farmPolygon = farm.polygon ?? undefined;
  const farmLocation = !farmPolygon ? farm.location : undefined;

  const farmLocationLatLng = farmLocation && positionToLatLng(farmLocation.coordinates);
  const farmPolygonLatLngs = farmPolygon && positionToLatLng(farmPolygon.coordinates);

  const farmFeatureGroup = (
    <FeatureGroup>
      {farmPolygonLatLngs && <>
      <Polygon key={farmPolygonLatLngs.toString()} positions={farmPolygonLatLngs} pathOptions={{ fillColor: 'none', dashArray: '8' }} {...farmPolygonProps} />
      {!focusField &&
      <MapBoundsFraming bounds={latLngBounds(farmPolygonLatLngs[0])} maxZoom={MAX_ZOOM} />}
      </>}
      {farmLocationLatLng && <>
      <Marker key={farmLocationLatLng.toString()} position={farmLocationLatLng} opacity={0} {...farmMarkerProps} />
      {!focusField &&
      <MapCentering center={farmLocationLatLng} zoom={MAX_ZOOM} />}
      </>}
    </FeatureGroup>
  );

  const mapRef = useRef<Map>(null);
  
  return (
    <MapContainer
      ref={mapRef}
      id="map-container"
      center={center}
      zoom={zoom}
      zoomControl={false}
      style={{zIndex: 0, ...style}}
      whenReady={() => resizeMap(mapRef)}
      {...mapContainerProps}
    >
      <LayersControl position="topleft">
        <LayersControl.BaseLayer checked name="Satélite">
          <MaptilerVectorLayer style={MapStyle.HYBRID} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Topografia">
          <MaptilerVectorLayer style={MapStyle.TOPO} />
        </LayersControl.BaseLayer>
      </LayersControl>
      <ZoomControl />
      {!drawingMode &&
      <ButtonControl position="topright" color="teal" onClick={() => setDrawingNewField(true)}>
        Adicionar área de cultivo
      </ButtonControl>}
      {drawingMode && !focusField &&
      <ButtonControl position="topright" color="red" onClick={() => setDrawingNewField(false)}>
        Cancelar
      </ButtonControl>}
      {farmFeatureGroup}
      {fieldsFeatureGroup}
      {focusField &&
      <FieldFeatureGroup
        onCroppingComputed={onCroppingComputed}
        editControlProps={{
          onEditStart: onFieldPolygonEditStart,
          onEditStop: onFieldPolygonEditStop,
        }}
        extraPolygonProps={fieldPolygonProps}
      />}
    </MapContainer>
  )
}

function resizeMap(mapRef: RefObject<Map | null>) {
  const resizeObserver = new ResizeObserver(() => mapRef.current?.invalidateSize());
  const container = document.getElementById('map-container');
  if (container)
    resizeObserver.observe(container);
}
