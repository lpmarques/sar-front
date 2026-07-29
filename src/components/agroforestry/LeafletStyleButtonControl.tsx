import { ControlPosition } from "leaflet";
import React, { PropsWithChildren } from "react";
import { Button, ButtonProps, MantineStyleProp, Tooltip } from "@mantine/core";
import { MapControl } from ".";
 
interface LeafletStyleButtonControlProps extends PropsWithChildren<ButtonProps> {
  position: ControlPosition;
  label?: React.ReactNode;
  style?: MantineStyleProp;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export default function LeafletStyleButtonControl({ position, label, style, children, onClick, ...buttonProps }: LeafletStyleButtonControlProps) {
  const button = (
    <Button
      variant="default"
      onClick={onClick}
      {...buttonProps}
      className="leaflet-bar"
      style={{
        width: 35,
        height: 35,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      {children}
    </Button>
  );

  return (
    <MapControl position={position}>
      {label ? 
      <Tooltip label={label}>
        {button}
      </Tooltip> :
      <>{button}</>}
    </MapControl>
  )
}
