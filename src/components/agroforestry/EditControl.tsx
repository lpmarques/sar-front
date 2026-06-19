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
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { EditControl as LeafletEditControl, EditControlProps } from "react-leaflet-draw";

// This wrapper bypasses a known react-leaflet-draw's EditControl bug where it 
// fails to clear out previous (stale) event handlers and keeps calling them after 
// a new version is passed (such as one that edits a different polygon).
// Issue: https://github.com/alex3165/react-leaflet-draw/issues/192
export default function EditControl({ onEdited, ...props }: EditControlProps) {
  const map = useMap();

  useEffect(() => {
    const handleEdited = onEdited as LeafletEventHandlerFn;

    map.on('draw:edited', handleEdited);

    return () => {
      map.off('draw:edited', handleEdited);
    }
  }, [map]);

  return (
    <>
      <LeafletEditControl {...props} />
    </>
  )
}
