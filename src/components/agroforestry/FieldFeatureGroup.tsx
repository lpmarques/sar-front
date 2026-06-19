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
import { getCroppingPattern } from "../../apis/agroforestry";
import { positionToLatLng } from "../../utils/agroforestry";
import { useQuery } from "@tanstack/react-query";
import { useProject } from "../../hooks/useProject";
import { CroppingLayers, EditControl } from ".";
import { useCallback, useMemo, useRef, useState } from "react";
import { EditControlProps } from "react-leaflet-draw";

const MAX_ZOOM = 30;

interface FieldFeatureGroupProps {
  fieldPolygonProps?: Omit<PolygonProps, 'key' | 'positions'>,
}

export default function FieldFeatureGroup({ fieldPolygonProps }: FieldFeatureGroupProps) {
  const { fields, selectedFieldIndex, inputsEnabled, enableInputs, disableInputs, replaceField } = useProject();
  const [polygonVersion, setPolygonVersion] = useState<number>(0);

  const field = selectedFieldIndex !== null ? fields[selectedFieldIndex] : undefined;
  const fieldLatLngs = useMemo(() => field?.polygon && positionToLatLng(field.polygon.coordinates), []);

  const polygonRef = useRef<any>(null);

  const onPolygonEditStart = () => {
    disableInputs();
    if (polygonRef.current)
      polygonRef.current.editing.enable();
  };

  const onPolygonEditStop = () => {
    enableInputs();
    if (polygonRef.current)
      polygonRef.current.editing.disable();
  };

  const onPolygonEdited = useCallback((e: DrawEvents.Edited) => {
    if (!field) return

    const layer = e.layers.getLayers()[0];
    if (layer instanceof PolygonLayer) {
      replaceField({
        ...field,
        polygon: layer.toGeoJSON().geometry as GJPolygon
      });
    }
    setPolygonVersion((prev) => prev + 1);
  }, []);

  const croppingPatternQueryOptions = {
    queryKey: ['croppingPattern', field?.cropping?.patternId?.toString() ?? '0'],
    queryFn: getCroppingPattern,
    enabled: (field?.cropping?.patternId ?? 0) > 0,
  };
  const croppingPattern = useQuery(croppingPatternQueryOptions);

  if (selectedFieldIndex !== null && field && fieldLatLngs) {
    return (
      <FeatureGroup key={selectedFieldIndex}>
        <MapBoundsFraming bounds={latLngBounds(fieldLatLngs[0])} maxZoom={MAX_ZOOM} deps={[selectedFieldIndex]} />
        <FieldPolygon
          // ref={polygonRef}
          id={selectedFieldIndex}
          version={polygonVersion}
          positions={fieldLatLngs}
          extraPolygonProps={fieldPolygonProps}
          extraEditControlProps={{
            onEdited: onPolygonEdited,
            // onEditStart: onPolygonEditStart,
            // onEditStop: onPolygonEditStop,
          }}
        />
        {croppingPattern.data &&
        <CroppingLayers
          fieldCoords={fieldLatLngs[0]}
          patternRows={croppingPattern.data.rows}
          rowsAngleDeg={field.cropping?.rowsAngleDeg ?? undefined}
          rowsOffsetM={field.cropping?.rowsOffsetM ?? undefined}
          cropsOffsetM={field.cropping?.cropsOffsetM ?? undefined}
          onCroppingSummarized={(summary) => replaceField({...field, cropping: {...field.cropping!, summary}})}
        />}
      </FeatureGroup>
    );
  }
}

interface FieldPolygonProps {
  id: number,
  // ref: React.RefObject<any>,
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

  console.log(`render polygon ${id} version ${version}`);

  return (
    <FeatureGroup>
      <Polygon
        // ref={ref}
        key={`polygon-${id}-${version}`}
        positions={positions}
        pathOptions={{color: 'orange', weight: 1, opacity: 1, fillOpacity: 0}}
        {...extraPolygonProps}
      >
        <Tooltip permanent={false} direction='center'>
          {getPolygonAreaDisplay(positions)}
        </Tooltip>
      </Polygon>
      <EditControl
        key={`edit-control-${id}-${version}`}
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