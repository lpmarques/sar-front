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
  LatLng,
  latLngBounds,
  Polygon as PolygonLayer,
} from "leaflet";
import { useCallback, useMemo, useRef } from "react";
import {
  FeatureGroup,
  PolygonProps,
  Tooltip,
} from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import { CroppingSummary, getCroppingPattern } from "../../apis/agroforestry";
import { useProject } from "../../hooks/useProject";
import { latLngToPosition, positionToLatLng } from "../../utils/agroforestry";
import { CroppingLayers, MapBoundsFraming, PolygonDrawing } from ".";
import area from "@turf/area";
import { polygon } from "@turf/helpers";

const MAX_ZOOM = 30;

interface FieldFeatureGroupProps {
  onEditStart?: () => void;
  onEditStop?: () => void;
  extraPolygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
}

export default function FieldFeatureGroup({
  onEditStart = () => {},
  onEditStop = () => {},
  extraPolygonProps,
}: FieldFeatureGroupProps) {
  const { fields, selectedFieldIndex, replaceField } = useProject();
  
  const field = selectedFieldIndex !== null ? fields[selectedFieldIndex] : undefined;
  const fieldRef = useRef(field);
  fieldRef.current = field;

  const fieldCoords = useMemo(() => {
    return fieldRef.current && positionToLatLng(fieldRef.current.polygon.coordinates);
  }, [fieldRef.current?.polygon.coordinates]);

  const onPolygonEdited = useCallback((e: DrawEvents.Edited) => {
    const layer = e.layers.getLayers()[0];
    
    if (layer instanceof PolygonLayer) {
      replaceField({
        ...fieldRef.current,
        polygon: layer.toGeoJSON().geometry as GJPolygon
      });
    }
  }, [replaceField]);

  const croppingPatternQueryOptions = {
    queryKey: ['croppingPattern', field?.cropping?.patternId?.toString() ?? '0'],
    queryFn: getCroppingPattern,
    enabled: (field?.cropping?.patternId ?? 0) > 0,
  };
  const croppingPattern = useQuery(croppingPatternQueryOptions);

  const onCroppingSummarized = useCallback((summary: CroppingSummary) => {
    const currentField = fieldRef.current;

    if (currentField?.cropping)
      replaceField({
        ...currentField,
        cropping: {
          ...currentField.cropping,
          summary
        }
      })
  }, [replaceField]);
  
  const getPolygonAreaDisplay = (polygonLatLngs: LatLng[][]) => {
    const polygonArea = area(polygon(latLngToPosition(polygonLatLngs)));
    return `${Math.round(polygonArea)} m²`;
  }

  const polygonTooltip = fieldCoords &&
    <Tooltip permanent={false} direction='center'>
      {getPolygonAreaDisplay(fieldCoords)}
    </Tooltip>;

  if (selectedFieldIndex !== null && field && fieldCoords) {
    return (
      <FeatureGroup key={selectedFieldIndex}>
        <PolygonDrawing
          coords={fieldCoords}
          pathOptions={{color: 'orange', weight: 1, opacity: 1, fillOpacity: 0}}
          editControlProps={{
            edit: {
              remove: false,
            },
            onEditStart: onEditStart,
            onEdited: onPolygonEdited,
            onEditStop: onEditStop,
          }}
          {...extraPolygonProps}
        >
          {polygonTooltip}
        </PolygonDrawing>
        {croppingPattern.data &&
        <CroppingLayers
          fieldCoords={fieldCoords[0]}
          patternRows={croppingPattern.data.rows}
          rowsAngleDeg={field.cropping?.rowsAngleDeg ?? undefined}
          rowsOffsetM={field.cropping?.rowsOffsetM ?? undefined}
          cropsOffsetM={field.cropping?.cropsOffsetM ?? undefined}
          onCroppingSummarized={onCroppingSummarized}
        />}
        <MapBoundsFraming bounds={latLngBounds(fieldCoords[0])} maxZoom={MAX_ZOOM} deps={[selectedFieldIndex]} />
      </FeatureGroup>
    );
  }
}
