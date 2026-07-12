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

import {
  LatLng,
  latLngBounds,
} from "leaflet";
import { FeatureGroup, MapContainer, MapContainerProps, Polygon, PolygonProps, Tooltip } from "react-leaflet";
import { EditControlProps } from "react-leaflet-draw";
import { MapStyle } from "@maptiler/leaflet-maptilersdk";
import area from '@turf/area';
import { polygon } from '@turf/helpers';
import { DeviceLocationControl, MapBoundsFraming, MaptilerVectorLayer, PolygonDrawing } from ".";
import { latLngToPosition } from "../../utils/agroforestry";

interface FarmMapProps extends MapContainerProps {
  polygonCoords?: LatLng[][],
  polygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
  showPolygonArea?: boolean,
  locationControl?: boolean,
  editControl?: boolean,
  editControlProps?: Omit<EditControlProps, 'draw' | 'position'>,
}

export default function FarmMap({
  center,
  zoom,
  style={ height: '500px', width: '100%' },
  polygonCoords,
  polygonProps,
  showPolygonArea=true,
  locationControl=true,
  editControl=true,
  editControlProps,
  ...mapContainerProps
}: FarmMapProps
) {
  const maxZoom = 18;

  const getPolygonAreaDisplay = (polygonLatLngs: LatLng[][]) => {
    const polygonArea = area(polygon(latLngToPosition(polygonLatLngs)));
    return `
      ${Math.round(polygonArea)} m²
      (${Math.round(polygonArea/100)/100} ha)
    `;
  };

  const polygonTooltip = showPolygonArea && polygonCoords &&
    <Tooltip permanent direction='center'>
      {getPolygonAreaDisplay(polygonCoords)}
    </Tooltip>;

  const farmFeatureGroup = (
    <FeatureGroup>
      {editControl ?
      <PolygonDrawing
        coords={polygonCoords}
        editControlProps={{
          edit: polygonCoords ? {
            remove: true,
          } : {
            remove: false,
            edit: false,
          },
          onCreated: editControlProps?.onCreated,
            onEdited: editControlProps?.onEdited,
            onDeleted: editControlProps?.onDeleted,
            ...editControlProps
          }}
          {...polygonProps}
        >
        {polygonTooltip}
      </PolygonDrawing> : polygonCoords &&
      <Polygon positions={polygonCoords} {...polygonProps}>
        {polygonTooltip}
      </Polygon>}
      {polygonCoords &&
      <MapBoundsFraming bounds={latLngBounds(polygonCoords[0])} maxZoom={maxZoom} />}
    </FeatureGroup>
  );
  
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{zIndex: 0, ...style}}
      {...mapContainerProps}
    >
      <MaptilerVectorLayer style={MapStyle.HYBRID} />
      {farmFeatureGroup}
      {locationControl &&
      <DeviceLocationControl zoom={maxZoom} />}
    </MapContainer>
  )
}
