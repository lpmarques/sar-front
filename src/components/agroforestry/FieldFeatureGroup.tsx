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
import {
  FeatureGroup,
  Polygon,
  PolygonProps,
  Tooltip,
} from "react-leaflet";
import MapBoundsFraming from "./MapBoundsFraming";
import { CroppingSummary, getCroppingPattern } from "../../apis/agroforestry";
import { positionToLatLng } from "../../utils/agroforestry";
import { useQuery } from "@tanstack/react-query";
import { useProject } from "../../hooks/useProject";
import { CroppingLayers, EditControl } from ".";
import { useCallback, useMemo, useRef, useState } from "react";
import { EditControlProps } from "react-leaflet-draw";

const MAX_ZOOM = 30;

interface FieldFeatureGroupProps {
  onEditStart?: () => void;
  onEditStop?: () => void;
  extraPolygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
}

export default function FieldFeatureGroup({ onEditStart, onEditStop, extraPolygonProps }: FieldFeatureGroupProps) {
  const { fields, selectedFieldIndex, replaceField } = useProject();
  const [polygonVersion, setPolygonVersion] = useState(1);
  
  const field = selectedFieldIndex !== null ? fields[selectedFieldIndex] : undefined;
  const fieldRef = useRef(field);
  fieldRef.current = field;
  
  const editedRef = useRef(false);
  editedRef.current = false;
  const [editCancels, setEditCancels] = useState(0);

  // useMemo is necessary to stabilize fieldLatLngs, preventing desyncing between react state and 
  // leaflet layer on re-renders. On the other hand, fieldLatLngs should be recalculated when 
  // A) coordinates change or B) an edit session is canceled (since apparently leaflet-draw directly 
  // updates the array during edit and fails to revert repositioned vertexes after edit is canceled)
  const fieldLatLngs = useMemo(
    () => {
      const currentField = fieldRef.current;
      return currentField?.polygon && positionToLatLng(currentField.polygon.coordinates);
    },
    [field?.polygon.coordinates, editCancels]
  );

  // TODO: remove inputsEnabled from ProjectProvider to prevent re-rendering of FieldsMap during polygon edit.
  // Instead, declare it directly in ProjectDashboard and pass only callbacks into FieldsMap/FieldFeatureGroup 
  // as onEditStart and onEditStop props.
  // const onPolygonEditStart = useCallback(disableInputs, [disableInputs]);
  // const onPolygonEditStop = useCallback(enableInputs, [enableInputs]);

  const onPolygonEditStop = useCallback(() => {
    const currentField = fieldRef.current;
    if (!currentField) return

    if (!editedRef.current) {
      setEditCancels(c => c + 1); // triggers fieldLatLngs recalc, discarding any change in state that leaflet failed to revert
    }
    setPolygonVersion(v => v + 1); // forces Polygon to remount, ensuring up-to-date layer and discarding any canceled change that leaflet failed to revert
  }, []);

  const onPolygonEdited = useCallback((e: DrawEvents.Edited) => {
    editedRef.current = true;
    const currentField = fieldRef.current;
    if (!currentField) return

    const layer = e.layers.getLayers()[0];
    if (layer instanceof PolygonLayer) {
      replaceField({
        ...currentField,
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

  // The key to avoid desync between react state and leaflet DOM elements is in 
  // ensuring that react-leaflet-draw's EditControl never re-renders during an edit, 
  // but also forcing both EditControl and controled layer to remount when the layer's 
  // positions change (even if as result of the edit itself).
  // 
  // Hooks such as useMemo and useCallback prevent re-renders on parent from triggering 
  // child re-rendering by stabilizing complex-typed props (arrays/objs and functions).
  // Conversely, the use of versioned 'key' props can ensure that the child re-renders 
  // when relevant state changes actually occur in parent.
  if (selectedFieldIndex !== null && field && fieldLatLngs) {
    return (
      <FeatureGroup key={selectedFieldIndex}>
        <FieldPolygon
          id={selectedFieldIndex}
          version={polygonVersion}
          positions={fieldLatLngs}
          extraPolygonProps={extraPolygonProps}
          extraEditControlProps={{
            onEdited: onPolygonEdited,
            onEditStop: onPolygonEditStop,
          }}
        />
        {croppingPattern.data &&
        <CroppingLayers
          fieldCoords={fieldLatLngs[0]}
          patternRows={croppingPattern.data.rows}
          rowsAngleDeg={field.cropping?.rowsAngleDeg ?? undefined}
          rowsOffsetM={field.cropping?.rowsOffsetM ?? undefined}
          cropsOffsetM={field.cropping?.cropsOffsetM ?? undefined}
          onCroppingSummarized={onCroppingSummarized}
        />}
        <MapBoundsFraming bounds={latLngBounds(fieldLatLngs[0])} maxZoom={MAX_ZOOM} deps={[selectedFieldIndex]} />
      </FeatureGroup>
    );
  }
}

interface FieldPolygonProps {
  id: number,
  version: number,
  positions: LatLng[][],
  extraPolygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
  extraEditControlProps?: Omit<EditControlProps, 'draw' | 'edit' | 'position'>,
}

function FieldPolygon({ id, version, positions, extraPolygonProps, extraEditControlProps }: FieldPolygonProps) {
  const getPolygonAreaDisplay = (polygonLatLngs: LatLng[][]) => {
    const polygonArea = GeometryUtil.geodesicArea(polygonLatLngs[0]);
    return `${Math.round(polygonArea)} m²`;
  }

  return (
    <FeatureGroup>
      <Polygon
        key={`polygon-${id}-v${version}`}
        positions={positions}
        pathOptions={{color: 'orange', weight: 1, opacity: 1, fillOpacity: 0}}
        {...extraPolygonProps}
      >
        <Tooltip permanent={false} direction='center'>
          {getPolygonAreaDisplay(positions)}
        </Tooltip>
      </Polygon>
      <EditControl
        key={`control-${id}-v${version}`}
        position="topright"
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
        {...extraEditControlProps}
      />
    </FeatureGroup>
  )
}