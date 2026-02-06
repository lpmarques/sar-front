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
