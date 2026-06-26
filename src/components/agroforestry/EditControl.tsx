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

import { LeafletEventHandlerFn } from "leaflet";
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { EditControl as LeafletEditControl, EditControlProps } from "react-leaflet-draw";
// import { EditControl as LeafletEditControl, EditControlProps } from "../reactleafletdraw";

// This wrapper bypasses a known react-leaflet-draw's EditControl bug where it fails to 
// clear out stale event handlers, applying changes to current and previously selected layers.
// Issue: https://github.com/alex3165/react-leaflet-draw/issues/192
export default function EditControl({ onEdited, onEditStart, onEditStop, ...props }: EditControlProps) {
  const map = useMap();
  const onEditedRef = useRef(onEdited);
  const onEditStartRef = useRef(onEditStart);
  const onEditStopRef = useRef(onEditStop);

  onEditedRef.current = onEdited;
  onEditStartRef.current = onEditStart;
  onEditStopRef.current = onEditStop;

  useEffect(() => {
    const handleEdited = onEditedRef.current as LeafletEventHandlerFn;
    const handleEditStart = onEditStartRef.current as LeafletEventHandlerFn;
    const handleEditStop = onEditStopRef.current as LeafletEventHandlerFn;

    handleEdited && map.on('draw:edited', handleEdited);
    handleEditStart && map.on('draw:editstart', handleEditStart);
    handleEditStop && map.on('draw:editstop', handleEditStop);

    return () => {
      handleEdited && map.off('draw:edited', handleEdited);
      handleEditStart && map.off('draw:editstart', handleEditStart);
      handleEditStop && map.off('draw:editstop', handleEditStop);
    }
  }, [map]);

  return (
    <>
      <LeafletEditControl {...props} />
    </>
  )
}
