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

import { Marker, Polygon } from "leaflet";
import React from "react";
import { useMap } from "react-leaflet";

interface LayerVisibilityProps {
  children: React.ReactNode
  layer: Polygon | Marker
}

export default function LayerVisibility({ layer, children }: LayerVisibilityProps) {
  const map = useMap();

  if (map.hasLayer(layer))
    return null;

  return children;
}