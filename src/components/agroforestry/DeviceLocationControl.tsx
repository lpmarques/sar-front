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

import { ControlPosition } from "leaflet";
import { useMap } from "react-leaflet";
import { Button } from "@mantine/core";
import { IconCurrentLocationFilled } from "@tabler/icons-react";
import { MapControl } from ".";
import { useState } from "react";

export interface DeviceLocationControlProps {
  position?: ControlPosition,
  zoom: number,
}

export default function DeviceLocationControl({ position="topleft", zoom }: DeviceLocationControlProps) {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const flyToCurrentLocation = () => {
    map.locate().on("locationfound", function (e) {
      map.flyTo(e.latlng, zoom);
      setLocating(false);
    });
    setLocating(true);
  };

  return (
    <MapControl position={position}>
      <Button
        variant="default"
        title="Centralizar sua lozalização"
        loading={locating}
        onClick={() => flyToCurrentLocation()}
        className="leaflet-bar"
        style={{
            width: '33px',
            height: '33px',
            padding: '0px',
            marginLeft: '0px'
          }
        }
      >
        <IconCurrentLocationFilled color="var(--mantine-color-gray-7)"/>
      </Button>
    </MapControl>
  )
}