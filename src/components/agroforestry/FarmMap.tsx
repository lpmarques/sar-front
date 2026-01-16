import {
  DrawEvents,
  GeometryUtil,
  LatLng,
  LatLngExpression,
  LatLngLiteral,
  marker,
  Marker as MarkerLayer,
  Polygon as PolygonLayer,
  stamp as layerStamp,
  polygon,
} from "leaflet";
import { FeatureGroup, MapContainer, MapContainerProps, Marker, Polygon, Tooltip, useMap } from "react-leaflet";
import { EditControl, EditControlProps } from "react-leaflet-draw";
import { MapStyle } from "@maptiler/leaflet-maptilersdk";
import LayerVisibility from "./LayerVisibility";
import MapBoundsFraming from "./MapBoundsFraming";
import MapCentering from "./MapCentering";
import MaptilerVectorLayer from "./MaptilerVectorLayer";
import classes from "./MapContainer.module.css";

interface FarmMapProps extends MapContainerProps {
  farmLocation: LatLng | undefined,
  farmPolygon: LatLng[][] | undefined,
  showPolygonArea?: boolean,
  editControlProps?: Omit<EditControlProps, 'draw'|'position'>,
}

export default function FarmMap({
  center,
  zoom,
  style={ height: '500px', width: '100%' },
  farmLocation,
  farmPolygon,
  showPolygonArea=false,
  editControlProps,
  ...mapContrainerProps
}: FarmMapProps
) {
  const maxZoom = 16;

  // const map = useMap();
  const farmMarkerLayer = farmLocation && marker(farmLocation);
  const farmPolygonLayer = farmPolygon && polygon(farmPolygon);

  const getPolygonAreaDisplay = (polygon: PolygonLayer) => {
    const polygonArea = GeometryUtil.geodesicArea(polygon.getLatLngs()[0] as LatLngLiteral[]);
    return `
      ${Math.round(polygonArea)} m²
      (${Math.round(polygonArea/100)/100} ha)
    `;
  };

  const bindAreaTooltipToPolygon = (polygon: PolygonLayer) => {
    polygon.bindTooltip(
      getPolygonAreaDisplay(polygon),
      {
        permanent: true,
        direction: "center"
      }
    ).openTooltip();
  }  
  
  const onCreated = async (e: DrawEvents.Created) => {
    if (showPolygonArea && e.layer instanceof PolygonLayer)
      bindAreaTooltipToPolygon(e.layer);

    if (editControlProps?.onCreated) {
      editControlProps.onCreated(e);
    }

    if (e.layer instanceof PolygonLayer) // unfortuatelly does not work on markers: causes race condition issue between react and leaflet
      e.layer.remove(); // remove drawn layer to avoid duplication by the polygon that will be rendered from props
      // TODO: replace this strategy by using manually managed leaflet layers instead of component layers
  };

  const onEdited = async (e: DrawEvents.Edited) => {
    const layer = e.layers.getLayers()[0];
    if (showPolygonArea && layer instanceof PolygonLayer)
      bindAreaTooltipToPolygon(layer);

    if (editControlProps?.onEdited)
      editControlProps.onEdited(e);

    if (layer instanceof PolygonLayer)
      layer.remove();
  };
  
  return (
    <MapContainer center={center} zoom={zoom} style={style} className={classes['map-container']} {...mapContrainerProps}>
      <MaptilerVectorLayer style={MapStyle.HYBRID} />
      <FeatureGroup>
        <EditControl
          position="topright"
          onCreated={onCreated}
          onEdited={onEdited}
          onDeleted={editControlProps && editControlProps.onDeleted}
          draw={{
            polygon: editControlProps && !(farmPolygon || farmLocation) ? {
              showArea: false,
              shapeOptions: {
                color: 'purple'
              },
            } : false,
            marker: editControlProps && !(farmPolygon || farmLocation) ? true : false,
            polyline: false,
            rectangle: false,
            circle: false,
            circlemarker: false,
          }}
          edit={editControlProps && (farmPolygon || farmLocation) ? {
            remove: true,
          } : {
            remove: false,
            edit: false,
          }}
        />
        {farmPolygonLayer && <>
        <Polygon key={layerStamp(farmPolygonLayer)} positions={farmPolygon} pathOptions={{ color: 'purple' }}>
          {showPolygonArea &&
          <Tooltip permanent direction='center'>
            {getPolygonAreaDisplay(farmPolygonLayer)}
          </Tooltip>}
        </Polygon>
        <MapBoundsFraming bounds={farmPolygonLayer.getBounds()} maxZoom={maxZoom} />
        </>}
        {farmMarkerLayer && <>
        <Marker key={layerStamp(farmMarkerLayer)} position={farmLocation} />
        <MapCentering center={farmLocation} zoom={maxZoom} />
        </>}
      </FeatureGroup>
    </MapContainer>
  )
}
