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
  DrawEvents,
  GeometryUtil,
  LatLng,
  Polygon as PolygonLayer,
  latLngBounds,
} from "leaflet";
import { FeatureGroup, MapContainer, MapContainerProps, Marker, MarkerProps, Polygon, PolygonProps, Tooltip } from "react-leaflet";
import { EditControl, EditControlProps } from "react-leaflet-draw";
import { MapStyle } from "@maptiler/leaflet-maptilersdk";
import { DeviceLocationControl, MapBoundsFraming, MapCentering, MaptilerVectorLayer } from ".";

interface FarmMapProps extends MapContainerProps {
  farmLocation: LatLng | undefined,
  farmPolygon: LatLng[][] | undefined,
  markerProps?: Omit<MarkerProps, 'key' | 'position'>,
  polygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
  locationControl?: boolean,
  showPolygonArea?: boolean,
  editControlProps?: Omit<EditControlProps, 'draw' | 'position'>,
}

export default function FarmMap({
  center,
  zoom,
  style={ height: '500px', width: '100%' },
  farmLocation,
  farmPolygon,
  markerProps,
  polygonProps,
  locationControl=true,
  showPolygonArea=false,
  editControlProps,
  ...mapContainerProps
}: FarmMapProps
) {
  const maxZoom = 18;

  // deep cloning is necessary to avoid unwanted changes on stored latlngs by react-leaflet-draw internals
  // (e.g. from interrupted/canceled edit events)
  const locationLatLng = farmLocation && farmLocation.clone();
  const polygonLatLngs = farmPolygon && [farmPolygon[0].map(point => point.clone())];

  const getPolygonAreaDisplay = (polygonLatLngs: LatLng[][]) => {
    const polygonArea = GeometryUtil.geodesicArea(polygonLatLngs[0]);
    return `
      ${Math.round(polygonArea)} m²
      (${Math.round(polygonArea/100)/100} ha)
    `;
  };
  
  const onCreated = async (e: DrawEvents.Created) => {
    if (editControlProps?.onCreated) {
      editControlProps.onCreated(e);
    }

    // removes drawn layer to avoid duplication by the polygon that will be rendered from props
    if (e.layer instanceof PolygonLayer) // unfortuatelly does not work on markers: causes race condition issue between react and leaflet
      e.layer.remove();
      // TODO: replace this strategy with using manually managed leaflet layers instead of component layers
      // OR with changing FeatureGroup key everytime a layer is created/edited (see https://github.com/alex3165/react-leaflet-draw/issues/50#issuecomment-546000961)
  };

  const onEdited = async (e: DrawEvents.Edited) => {
    const layer = e.layers.getLayers()[0];
    if (editControlProps?.onEdited)
      editControlProps.onEdited(e);

    if (layer instanceof PolygonLayer)
      layer.remove();
  };

  const farmFeature = (
    <FeatureGroup>
      {editControlProps &&
      <EditControl
        position="topright"
        onCreated={editControlProps?.onCreated && onCreated}
        onEdited={editControlProps?.onEdited && onEdited}
        onDeleted={editControlProps && editControlProps.onDeleted}
        draw={{
          polygon: !(farmPolygon || farmLocation) ? true : false,
          marker: !(farmPolygon || farmLocation) ? true : false,
          polyline: false,
          rectangle: false,
          circle: false,
          circlemarker: false,
        }}
        edit={farmPolygon || farmLocation ? {
          remove: true,
          ...(!farmPolygon && {edit: false})
        } : {
          remove: false,
          edit: false,
        }}
        {...editControlProps}
      />}
      {polygonLatLngs && <>
      <Polygon key={polygonLatLngs.toString()} positions={polygonLatLngs} {...polygonProps}>
        {showPolygonArea &&
        <Tooltip permanent direction='center'>
          {getPolygonAreaDisplay(polygonLatLngs)}
        </Tooltip>}
      </Polygon>
      <MapBoundsFraming bounds={latLngBounds(polygonLatLngs[0])} maxZoom={maxZoom} />
      </>}
      {locationLatLng && <>
      <Marker key={locationLatLng.toString()} position={locationLatLng} {...markerProps} />
      <MapCentering center={locationLatLng} zoom={maxZoom} />
      </>}
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
      {farmFeature}
      {locationControl &&
      <DeviceLocationControl zoom={maxZoom} />}
    </MapContainer>
  )
}
