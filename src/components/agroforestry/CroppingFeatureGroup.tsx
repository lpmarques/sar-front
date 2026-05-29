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
  GeometryUtil,
  latLngBounds,
  LatLng,
  Polygon as PolygonLayer,
} from "leaflet";
import { useMemo } from "react";
import {
  FeatureGroup,
  Polygon,
  PolygonProps,
  Tooltip,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import MapBoundsFraming from "./MapBoundsFraming";
import { computeCroppingLayers, CropMarkers, CropRows, CroppingLayers } from "./CroppingLayers";
import { PatternRow } from "../../apis/agroforestry";

const CROPPING_PATTERN: PatternRow[] = [
  {
    crops: [
      { distanceToNextCropM: 3, plant: { acceptedTaxonName: "Milho",    acceptedFamilyName: "Famileae", colorHex: "#e6a817", id: 1, contentId: 1, contentStatus: "accepted" }, position: 1 },
      { distanceToNextCropM: 2, plant: { acceptedTaxonName: "Milho",    acceptedFamilyName: "Famileae", colorHex: "#e6a817", id: 1, contentId: 1, contentStatus: "accepted" }, position: 2 },
      { distanceToNextCropM: 2, plant: { acceptedTaxonName: "Feijão",   acceptedFamilyName: "Famileae", colorHex: "#5a9e3a", id: 1, contentId: 1, contentStatus: "accepted" }, position: 3 },
      { distanceToNextCropM: 3, plant: { acceptedTaxonName: "Mandioca", acceptedFamilyName: "Famileae", colorHex: "#c8a96b", id: 1, contentId: 1, contentStatus: "accepted" }, position: 4 },
    ],
    position: 1,
    distanceToNextRowM: 2,
  },
  {
    crops: [
      { distanceToNextCropM: 2, plant: { acceptedTaxonName: "Girassol", acceptedFamilyName: "Famileae", colorHex: "#e8d44d", id: 1, contentId: 1, contentStatus: "accepted" }, position: 1 },
      { distanceToNextCropM: 1, plant: { acceptedTaxonName: "Ervilha",  acceptedFamilyName: "Famileae", colorHex: "#89c97a", id: 1, contentId: 1, contentStatus: "accepted" }, position: 2 },
      { distanceToNextCropM: 2, plant: { acceptedTaxonName: "Ervilha",  acceptedFamilyName: "Famileae", colorHex: "#89c97a", id: 1, contentId: 1, contentStatus: "accepted" }, position: 3 },
    ],
    position: 2,
    distanceToNextRowM: 3,
  },
  {
    crops: [
      { distanceToNextCropM: 0.2, plant: { acceptedTaxonName: "Trigo", acceptedFamilyName: "Famileae", colorHex: "#c8a96b", id: 1, contentId: 1, contentStatus: "accepted" }, position: 1 },
    ],
    position: 3,
    distanceToNextRowM: 3,
  },
  {
    crops: [
      { distanceToNextCropM: 1, plant: { acceptedTaxonName: "Soja",   acceptedFamilyName: "Famileae", colorHex: "#7ab87a", id: 1, contentId: 1, contentStatus: "accepted" }, position: 1 },
      { distanceToNextCropM: 0.5, plant: { acceptedTaxonName: "Feijão", acceptedFamilyName: "Famileae", colorHex: "#5a9e3a", id: 1, contentId: 1, contentStatus: "accepted" }, position: 2 },
      { distanceToNextCropM: 0.5, plant: { acceptedTaxonName: "Milho",  acceptedFamilyName: "Famileae", colorHex: "#e6a817", id: 1, contentId: 1, contentStatus: "accepted" }, position: 3 },
    ],
    position: 4,
    distanceToNextRowM: 2,
  },
];

const MAX_ZOOM = 22;

interface CroppingFeatureGroupProps {
  drawingMode: boolean,
  fieldLatLngs: LatLng[][],
  croppingPattern?: PatternRow[],
  rowsAngleDeg?: number,
  rowsOffsetM?: number,
  cropsOffsetM?: number,
  onFieldEdited: (field: GJPolygon) => void,
  fieldPolygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
}

export function CroppingFeatureGroup({
  drawingMode,
  fieldLatLngs,
  croppingPattern=CROPPING_PATTERN,
  rowsAngleDeg=0,
  rowsOffsetM=0,
  cropsOffsetM=0,
  onFieldEdited,
  fieldPolygonProps
}: CroppingFeatureGroupProps) {

  const onEdited = (e: DrawEvents.Edited) => {
    const focusLayer = e.layers.getLayers()[0];
    if (focusLayer instanceof PolygonLayer) {
      onFieldEdited(focusLayer.toGeoJSON().geometry as GJPolygon);
    }
  };

  const getPolygonAreaDisplay = (polygonLatLngs: LatLng[][]) => {
    const polygonArea = GeometryUtil.geodesicArea(polygonLatLngs[0]);
    return `${Math.round(polygonArea)} m²`;
  }

  // Recompute geometry only when relevant props change
  const fieldLayers = useMemo<CroppingLayers>(
    () =>
      computeCroppingLayers(fieldLatLngs[0], croppingPattern, rowsAngleDeg, rowsOffsetM, cropsOffsetM),
    [fieldLatLngs, croppingPattern, rowsAngleDeg, rowsOffsetM, cropsOffsetM]
  );

  return (
    <FeatureGroup key={fieldLatLngs.toString()}>
      <MapBoundsFraming bounds={latLngBounds(fieldLatLngs[0])} maxZoom={MAX_ZOOM} />
      <FeatureGroup>
        <Polygon positions={fieldLatLngs} pathOptions={{color: 'orange', weight: 1, opacity: 1, fillOpacity: 0}} {...fieldPolygonProps}>
          <Tooltip permanent={false} direction='center'>
            {getPolygonAreaDisplay(fieldLatLngs)}
          </Tooltip>
        </Polygon>
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
      {fieldLayers && <>
      <CropRows rows={fieldLayers.rows} />
      <CropMarkers crops={fieldLayers.crops} />
      </>}
    </FeatureGroup>
  );
}
