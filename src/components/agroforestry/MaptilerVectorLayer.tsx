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

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { MaptilerLayer } from "@maptiler/leaflet-maptilersdk";
import * as maptilersdk from '@maptiler/sdk';

export default function MaptilerVectorLayer({ style }: { style: maptilersdk.ReferenceMapStyle }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const mtLayer = new MaptilerLayer({
      apiKey: maptilersdk.config.apiKey,
      style: style,
    });

    mtLayer.addTo(map);

    return () => {
      map.removeLayer(mtLayer);
    };
  }, [map, style]);

  return null;
};
