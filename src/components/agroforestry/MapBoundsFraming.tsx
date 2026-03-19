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

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import * as L from 'leaflet';

interface MapBoundsFramingProps {
  bounds: L.LatLngBounds,
  maxZoom: number,
}

export default function MapBoundsFraming({ bounds, maxZoom }: MapBoundsFramingProps) {
  const map = useMap();
  const center = bounds.getCenter();

  useEffect(() => {
    map.fitBounds(bounds, {
      padding: [20, 20], // Adds 20px buffer so polygon doesn't touch edges
      maxZoom: maxZoom,  // Prevents extreme zooming on very small polygons
    });
  }, [center, map]);

  return null;
};