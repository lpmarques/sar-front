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
  LatLng,
} from "leaflet";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  FeatureGroup,
  Polygon,
  PolygonProps,
} from "react-leaflet";
import { EditControlProps } from "react-leaflet-draw";
import { latLngCentroid } from "../../utils/agroforestry";
import { Optionalize } from "../../utils/common";
import { EditControl } from ".";

// The key to avoid desyncing between react state and leaflet DOM elements is in 
// ensuring that react-leaflet-draw's EditControl never re-renders during an edit, 
// but also forcing both EditControl and the controled layer to remount when the layer's 
// positions change (even if as result of the edit itself).
// 
// Hooks such as useMemo and useCallback prevent re-renders on parent from triggering 
// child re-rendering by stabilizing complex-typed props (arrays/objs and functions).
// Conversely, the use of versioned 'key' props can ensure that the child re-renders 
// when relevant state changes actually occur in parent.

interface PolygonDrawingProps extends Omit<PolygonProps, 'key' | 'positions'> {
  coords?: LatLng[][],
  editControlProps?: Optionalize<Omit<EditControlProps, 'draw'>, 'position'>,
  children?: React.ReactNode,
}

export default function PolygonDrawing({ coords, editControlProps, children, ...extraPolygonProps }: PolygonDrawingProps) {  
  const [version, setVersion] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editCancels, setEditCancels] = useState(0);
  const editedRef = useRef(false);
  editedRef.current = false;

  // Deep copying positions from coords is necessary to protect original coordinates from leaflet-draw's direct changes to 
  // positions. Also, useMemo stabilizes positions, preventing desyncing between react state and leaflet layer on re-renders.
  // On the other hand, positions should be recalculated when: 
  // A) coordinates actually change OR 
  // B) an edit session is canceled (since leaflet-draw fails to revert repositioned vertexes after edit cancel)
  const centroid = coords && latLngCentroid(coords[0]); // centroid summarizes coords as stable primitives (lat and lng)
  const positions = useMemo(
    () => {
      return coords && [coords[0].map(point => point.clone())];
    },
    [centroid?.lat, centroid?.lng, editCancels]
  );

  const onCreated = useCallback((e: DrawEvents.Created) => {
    if (editControlProps?.onCreated)
      editControlProps.onCreated(e);

    e.layer.remove(); // removes leaflet-draw's layer to avoid duplication with to-be-rendered react-leaflet's Polygon
  }, []);

  const onEditStart = useCallback((e: DrawEvents.EditStart) => {
    setIsEditing(true);

    if (editControlProps?.onEditStart)
      editControlProps.onEditStart(e);
  }, []);

  const onEdited = useCallback((e: DrawEvents.Edited) => {
    editedRef.current = true;
    
    if (editControlProps?.onEdited)
      editControlProps.onEdited(e);
  }, []);

  const onEditStop = useCallback((e: DrawEvents.EditStop) => {
    if (!editedRef.current) {
      setEditCancels(c => c + 1); // triggers positions recalc, discarding any change in state that leaflet failed to revert
    }
    setVersion(v => v + 1); // forces Polygon to remount, ensuring up-to-date layer and discarding any change in layer that leaflet failed to revert
    
    if (editControlProps?.onEditStop)
      editControlProps.onEditStop(e);

    setIsEditing(false);
  }, []);

  const polygonChildren = isEditing ? undefined : children;

  return (
    <FeatureGroup>
      {positions &&
      <Polygon
        key={`polygon-v${version}`}
        positions={positions}
        {...extraPolygonProps}
        >
          {polygonChildren}
      </Polygon>}
      <EditControl
        key={`control-v${version}`}
        position="topright"
        draw={{
          polygon: positions ? false : true,
          marker: false,
          polyline: false,
          rectangle: false,
          circle: false,
          circlemarker: false,
        }}
        {...editControlProps}
        onCreated={onCreated}
        onEditStart={onEditStart}
        onEditStop={onEditStop}
        onEdited={onEdited}
      />
    </FeatureGroup>
  )
}
