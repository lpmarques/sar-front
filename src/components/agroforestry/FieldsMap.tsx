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
  LeafletEventHandlerFnMap,
  LeafletMouseEvent,
  Map,
  Polygon as PolygonLayer,
} from "leaflet";
import { RefObject, useMemo, useRef, useState } from "react";
import {
  FeatureGroup,
  MapContainer,
  MapContainerProps,
  Marker,
  MarkerProps,
  Polygon,
  PolygonProps,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import { MapStyle } from '@maptiler/sdk';
import * as turf from "@turf/boolean-equal";
import { useProject } from "../../hooks/useProject";
import { positionToLatLng } from "../../utils/agroforestry";
import { ButtonControl, FieldFeatureGroup, MapBoundsFraming, MapCentering, MaptilerVectorLayer } from ".";

const MAX_ZOOM = 22;

interface FieldsMapProps extends MapContainerProps {
  farmMarkerProps?: Omit<MarkerProps, 'key' | 'position'>,
  farmPolygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
  fieldPolygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
  selectedFieldPolygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
  onFieldPolygonEditStart?: () => void,
  onFieldPolygonEditStop?: () => void,
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
  ...mapContainerProps
}: FieldsMapProps
) {
  const { farm, fields, selectedFieldIndex, selectField, addField } = useProject();
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
      if (!focusField && layer instanceof PolygonLayer) {
        const geoJson = layer.toGeoJSON();
        const fieldIndex = fields.findIndex((field) => turf.booleanEqual(field.polygon, geoJson.geometry));
        selectField(fieldIndex);
      }
    }
  };

  const onCreated = (e: DrawEvents.Created) => {
    if (e.layer instanceof PolygonLayer) {
      const geoJson = e.layer.toGeoJSON();
      addField({ polygon: geoJson.geometry as GJPolygon });
      setDrawingNewField(false);

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
        pathOptions={{color: 'orange', opacity: 0}}
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
        onCreated={onCreated}
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
      style={{zIndex: 0, ...style}}
      whenReady={() => resizeMap(mapRef)}
      {...mapContainerProps}
    >
      <MaptilerVectorLayer style={MapStyle.HYBRID} />
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
        onEditStart={onFieldPolygonEditStart}
        onEditStop={onFieldPolygonEditStop}
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
