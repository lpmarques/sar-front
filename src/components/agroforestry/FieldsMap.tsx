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
import { RefObject, useRef } from "react";
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
import { MapStyle } from "@maptiler/leaflet-maptilersdk";
import * as turf from "@turf/boolean-equal";
import MapBoundsFraming from "./MapBoundsFraming";
import MapCentering from "./MapCentering";
import MaptilerVectorLayer from "./MaptilerVectorLayer";
import classes from "./MapContainer.module.css";
import { positionToLatLng } from "../../utils/agroforestry";
import { ButtonControl, FocusFieldFeatureGroup } from ".";
import { FieldGeomData } from "./ProjectDashboard";
import { FarmReadData } from "../../apis/agroforestry";

const MAX_ZOOM = 22;

interface FieldsMapProps extends MapContainerProps {
  drawingMode: boolean,
  farm: FarmReadData,
  fields: FieldGeomData[],
  focusFieldIndex: number | undefined,
  onFieldDraw: () => void,
  onFieldDrawn: (polygon: GJPolygon) => void,
  onFieldEdited: (field: FieldGeomData) => void,
  onFieldDeleted: () => void,
  onFieldClicked: (index: number | undefined) => void,
  farmMarkerProps?: Omit<MarkerProps, 'key' | 'position'>,
  farmPolygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
  fieldPolygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
  focusedFieldPolygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
}

export default function FieldsMap({
  center,
  zoom,
  style={ width: '100%' },
  drawingMode,
  farm,
  fields,
  focusFieldIndex,
  onFieldDraw,
  onFieldDrawn,
  onFieldEdited,
  onFieldDeleted,
  onFieldClicked,
  farmMarkerProps,
  farmPolygonProps,
  fieldPolygonProps,
  focusedFieldPolygonProps,
  ...mapContainerProps
}: FieldsMapProps
) {
  const focusIndex = useRef<number | undefined>(undefined);
  focusIndex.current = focusFieldIndex; // using ref here to store state's current value is necessary to avoid stale closures (callbacks accessing old versions of the state)

  const polygonEventHandlers: LeafletEventHandlerFnMap = {
    click: (e: LeafletMouseEvent) => {
      const layer = e.target;
      if (!focusField && layer instanceof PolygonLayer) {
        const geoJson = layer.toGeoJSON();
        const fieldIndex = fields.findIndex((field) => turf.booleanEqual(field.polygon, geoJson.geometry));
        onFieldClicked(fieldIndex);
      }
    }
  };

  const onCreated = (e: DrawEvents.Created) => {
    if (e.layer instanceof PolygonLayer) {
      const geoJson = e.layer.toGeoJSON();
      onFieldDrawn(geoJson.geometry as GJPolygon);
    }

    e.layer.remove();
  };

  const focusField = focusIndex.current !== undefined ? fields[focusIndex.current] : undefined;

  const otherFields = fields.filter((_, index) => index !== focusIndex.current);
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
      style={style}
      className={classes['map-container']}
      whenReady={() => resizeMap(mapRef)}
      {...mapContainerProps}
    >
      <MaptilerVectorLayer style={MapStyle.HYBRID} />
      {!drawingMode &&
      <ButtonControl position="topright" color="teal" onClick={onFieldDraw}>
        Adicionar área de cultivo
      </ButtonControl>}
      {drawingMode && !focusField &&
      <ButtonControl position="topright" color="red" onClick={onFieldDeleted}>
        Cancelar
      </ButtonControl>}
      {farmFeatureGroup}
      {fieldsFeatureGroup}
      {focusField &&
      <FocusFieldFeatureGroup
        drawingMode={drawingMode}
        field={focusField}
        fieldIndex={focusIndex.current!}
        onFieldEdited={onFieldEdited}
        fieldPolygonProps={fieldPolygonProps}
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
