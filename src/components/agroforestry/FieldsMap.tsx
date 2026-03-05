import { Point as GJPoint, Polygon as GJPolygon } from "geojson";
import {
  DrawEvents,
  GeometryUtil,
  latLngBounds,
  LatLng,
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
  Tooltip,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import { MapStyle } from "@maptiler/leaflet-maptilersdk";
import * as turf from "@turf/boolean-equal";
import MapBoundsFraming from "./MapBoundsFraming";
import MapCentering from "./MapCentering";
import MaptilerVectorLayer from "./MaptilerVectorLayer";
import classes from "./MapContainer.module.css";
import { positionToLatLng } from "../../utils/common";
import { ButtonControl } from ".";

interface FieldsMapProps extends MapContainerProps {
  drawingMode: boolean,
  fieldPolygons: GJPolygon[],
  focusFieldIndex: number | undefined,
  onFieldDraw: () => void,
  onFieldCreated: (field: GJPolygon) => void,
  onFieldEdited: (field: GJPolygon) => void,
  onFieldDeleted: () => void,
  onFieldClicked: (index: number | undefined) => void,
  farmLocation: GJPoint | undefined,
  farmPolygon: GJPolygon | undefined,
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
  fieldPolygons,
  focusFieldIndex,
  onFieldDraw,
  onFieldCreated,
  onFieldEdited,
  onFieldDeleted,
  onFieldClicked,
  farmLocation,
  farmPolygon,
  farmMarkerProps,
  farmPolygonProps,
  fieldPolygonProps,
  focusedFieldPolygonProps,
  ...mapContainerProps
}: FieldsMapProps
) {
  const maxZoom = 18;

  const focusIndex = useRef<number | undefined>(undefined);
  focusIndex.current = focusFieldIndex; // using ref here to store state's current value is necessary to avoid stale closures (callbacks accessing old versions of the state)

  const getPolygonAreaDisplay = (polygonLatLngs: LatLng[][]) => {
    const polygonArea = GeometryUtil.geodesicArea(polygonLatLngs[0]);
    return `${Math.round(polygonArea)} m²`;
  }

  const polygonEventHandlers: LeafletEventHandlerFnMap = {
    click: (e: LeafletMouseEvent) => {
      const layer = e.target;
      if (!focusField && layer instanceof PolygonLayer) {
        const geoJson = layer.toGeoJSON();
        const fieldIndex = fieldPolygons.findIndex((field) => turf.booleanEqual(field, geoJson.geometry));
        onFieldClicked(fieldIndex);
      }
    }
  };

  const onCreated = (e: DrawEvents.Created) => {
    if (e.layer instanceof PolygonLayer) {
      const geoJson = e.layer.toGeoJSON();
      onFieldCreated(geoJson.geometry as GJPolygon);
    }

    e.layer.remove();
  };

  const onEdited = (e: DrawEvents.Edited) => {
    const focusLayer = e.layers.getLayers()[0];
    if (focusLayer instanceof PolygonLayer) {
      onFieldEdited(focusLayer.toGeoJSON().geometry as GJPolygon);
    }
  };

  const focusField = focusIndex.current !== undefined ? fieldPolygons[focusIndex.current] : undefined;
  const focusFieldLatLngs = focusField && positionToLatLng(focusField.coordinates);

  const focusFieldFeatureGroup = focusField && focusFieldLatLngs && (
    <FeatureGroup key={focusFieldLatLngs.toString()}>
      <Polygon positions={focusFieldLatLngs} pathOptions={{color: 'orange'}} {...focusedFieldPolygonProps}>
        <Tooltip permanent direction='center'>
          {getPolygonAreaDisplay(focusFieldLatLngs)}
        </Tooltip>
      </Polygon>
      <MapBoundsFraming bounds={latLngBounds(focusFieldLatLngs[0])} maxZoom={maxZoom} />
      {drawingMode &&
      <EditControl
        position="topright"
        onEdited={onEdited}
        draw={{
          polygon: false,
          marker: false,
          polyline: false,
          rectangle: false,
          circle: false,
          circlemarker: false,
        }}
        edit={{
          remove: false,
        }}
      />}
    </FeatureGroup>
  );

  const otherFields = fieldPolygons.filter((_, index) => index !== focusIndex.current);
  const otherFieldsFeatures = otherFields.map((field) => {
    const latLngs = positionToLatLng(field.coordinates);
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

  const farmLocationLatLng = farmLocation && positionToLatLng(farmLocation.coordinates);
  const farmPolygonLatLngs = farmPolygon && positionToLatLng(farmPolygon.coordinates);

  const farmFeatureGroup = (
    <FeatureGroup>
      {farmPolygonLatLngs && <>
      <Polygon key={farmPolygonLatLngs.toString()} positions={farmPolygonLatLngs} pathOptions={{ fillColor: 'none', dashArray: '8' }} {...farmPolygonProps} />
      {!focusField &&
      <MapBoundsFraming bounds={latLngBounds(farmPolygonLatLngs[0])} maxZoom={maxZoom} />}
      </>}
      {farmLocationLatLng && <>
      <Marker key={farmLocationLatLng.toString()} position={farmLocationLatLng} opacity={0} {...farmMarkerProps} />
      {!focusField &&
      <MapCentering center={farmLocationLatLng} zoom={maxZoom} />}
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
        Adicionar nova área
      </ButtonControl>}
      {drawingMode && !focusField &&
      <ButtonControl position="topright" color="red" onClick={onFieldDeleted}>
        Cancelar
      </ButtonControl>}
      {farmFeatureGroup}
      {fieldsFeatureGroup}
      {focusFieldFeatureGroup}
    </MapContainer>
  )
}

function resizeMap(mapRef: RefObject<Map | null>) {
  const resizeObserver = new ResizeObserver(() => mapRef.current?.invalidateSize());
  const container = document.getElementById('map-container');
  if (container)
    resizeObserver.observe(container);
}