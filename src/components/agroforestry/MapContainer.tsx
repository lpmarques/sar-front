import { ComponentPropsWithRef } from "react";
import {
  AttributionControl,
  MapContainer as LeafletMapContainer,
} from "react-leaflet";

export type MapContainerProps = ComponentPropsWithRef<typeof LeafletMapContainer>;

export default function MapContainer({ children, ref, ...props }: MapContainerProps) {
  return (
    <LeafletMapContainer
      ref={ref}
      {...props}
      attributionControl={false}
    >
      <AttributionControl prefix='<a href="https://leafletjs.com">Leaflet</a>' />
      {children}
    </LeafletMapContainer>
  )
}
