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

import { Button, ButtonProps } from "@mantine/core";
import { ControlPosition } from "leaflet";
import { PropsWithChildren } from "react";
import { MapControl } from ".";

export interface ButtonControlProps extends ButtonProps {
  position: ControlPosition,
  onClick?: React.MouseEventHandler<HTMLButtonElement>,
}

export default function ButtonControl({ position, children, ...buttonProps }: PropsWithChildren<ButtonControlProps>) {
  return (
    <MapControl position={position}>
      {/* <div className="leaflet-bar"> */}
        <Button className="leaflet-bar" {...buttonProps}>
          {children}
        </Button>
      {/* </div> */}
    </MapControl>
  )
}
