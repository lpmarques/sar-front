import { Control, ControlPosition, DomEvent, DomUtil } from "leaflet";
import { PropsWithChildren, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";

interface MapControlProps {
  position: ControlPosition, // "bottomleft" | "bottomright" | "topleft" | "topright",
  disableClickPropagation?: boolean;
}

export default function MapControl({ position, disableClickPropagation, children }: PropsWithChildren<MapControlProps>) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const map = useMap();

  useEffect(() => {
    // Create a new map control
    const CustomMapControl = new Control({position});

    CustomMapControl.onAdd = () => {
      const section = DomUtil.create('section');
      if (disableClickPropagation === true) {
        // All click events will stop at the control and not pass through to the map
        DomEvent.disableClickPropagation(section);
      }
      return section;
    };

    // Add the control to the map
    map.addControl(CustomMapControl);

    // Store the container element to use in the portal
    setContainer(CustomMapControl.getContainer() ?? null);

    // Clean up when the component unmounts
    return () => {
      map.removeControl(CustomMapControl);
    };
  }, [map, position, disableClickPropagation]);

  return container ? createPortal(children, container) : null;
}