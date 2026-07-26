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
  Layer,
  Marker as MarkerLayer,
  Polygon as PolygonLayer,
} from "leaflet";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  FeatureGroup,
  PolygonProps,
  Tooltip,
} from "react-leaflet";
import { EditControlProps } from "react-leaflet-draw";
import { useQuery } from "@tanstack/react-query";
import area from "@turf/area";
import booleanContains from '@turf/boolean-contains';
import { polygon } from "@turf/helpers";
import { CroppingSummary, getCroppingPattern } from "../../apis/agroforestry";
import { useProject } from "../../hooks/useProject";
import { latLngToPosition, pointInPoly, positionToLatLng } from "../../utils/agroforestry";
import { Optionalize } from "../../utils/common";
import { openAlertModal } from "../common/alerts";
import { CroppingLayers, MapBoundsFraming, PolygonDrawing } from ".";

const MAX_ZOOM = 30;

interface FieldFeatureGroupProps {
  onCroppingComputed?: () => void;
  editControlProps?: Optionalize<Omit<EditControlProps, 'key' | 'draw'>, 'position'>,
  extraPolygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
}

export default function FieldFeatureGroup({
  onCroppingComputed=() => {},
  editControlProps,
  extraPolygonProps,
}: FieldFeatureGroupProps) {
  const { farm, fields, selectedFieldIndex, replaceField } = useProject();
  
  const field = selectedFieldIndex !== null ? fields[selectedFieldIndex] : undefined;
  const fieldRef = useRef(field);
  fieldRef.current = field;

  const fieldCoords = useMemo(() => {
    return fieldRef.current && positionToLatLng(fieldRef.current.polygon.coordinates);
  }, [fieldRef.current?.polygon.coordinates]);
  const [forcedEditCancels, setForcedEditCancels] = useState(0);

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
    
  const handleEditVertex = (e: DrawEvents.EditVertex) => {
    const layers = e.layers.getLayers();
    const errors = layers.reduce((errors: Error[], vertex) => {
      const err = validatePolygonVertex(vertex);
      if (err) errors.push(err);
      return errors;
    }, []);

    if (errors.length > 0) {
      openAlertModal({
        title: 'Pontos inválidos',
        message: `A área de cultivo não pode extrapolar os limites da propriedade.
          Reposicione os pontos inválidos.`
      });
    }
    editControlProps?.onEditVertex && editControlProps.onEditVertex(e);
  };

  const handleEdited = useCallback((e: DrawEvents.Edited) => {
    const layer = e.layers.getLayers()[0];
    
    if (layer instanceof PolygonLayer && fieldRef.current) {
      const polygon = layer.toGeoJSON().geometry as GJPolygon;

      if (!booleanContains(farm.polygon!, polygon)) {
        openAlertModal({
          title: 'Polígono inválido',
          message: 'A área de cultivo não pode extrapolar os limites da propriedade.'
        });

        // When invalid polygon, force Polygon re-render with previous coords via key change only
        return setForcedEditCancels(c => c + 1);
      }

      replaceField({
        ...fieldRef.current,
        polygon: layer.toGeoJSON().geometry as GJPolygon
      });
    }
    editControlProps?.onEdited && editControlProps.onEdited(e);
  }, [replaceField]);

  const croppingPatternQueryOptions = {
    queryKey: ['croppingPattern', field?.cropping?.patternId?.toString() ?? '0'],
    queryFn: getCroppingPattern,
    enabled: (field?.cropping?.patternId ?? 0) > 0,
  };
  const croppingPattern = useQuery(croppingPatternQueryOptions);

  const handleCroppingComputed = useCallback((summary: CroppingSummary) => {
    const currentField = fieldRef.current;

    if (currentField?.cropping)
      replaceField({
        ...currentField,
        cropping: {
          ...currentField.cropping,
          summary
        }
      })

    onCroppingComputed();
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
          key={forcedEditCancels}
          coords={fieldCoords}
          editControlProps={{
            edit: {
              remove: false,
            },
            ...editControlProps,
            onEdited: handleEdited,
            onEditVertex: handleEditVertex,
          }}
          {...extraPolygonProps}
          pathOptions={{
            color: 'orange',
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0,
            ...extraPolygonProps?.pathOptions
          }}
        >
          {polygonTooltip}
        </PolygonDrawing>
        {croppingPattern.data &&
        <CroppingLayers
          fieldCoords={fieldCoords[0]}
          pattern={croppingPattern.data}
          rowsAngleDeg={field.cropping?.rowsAngleDeg ?? undefined}
          rowsOffsetM={field.cropping?.rowsOffsetM ?? undefined}
          cropsOffsetM={field.cropping?.cropsOffsetM ?? undefined}
          onComputed={handleCroppingComputed}
        />}
        <MapBoundsFraming bounds={latLngBounds(fieldCoords[0])} maxZoom={MAX_ZOOM} deps={[selectedFieldIndex]} />
      </FeatureGroup>
    );
  }
}
