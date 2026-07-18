import { useEffect, useRef } from "react";
import { PolylineProps, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-polylinedecorator";

interface ArrowPolylineProps extends PolylineProps {
  startHead?: boolean,
  endHead?: boolean,
  arrowHeadOptions?: L.Symbol.ArrowHeadOptions;
}

export default function ArrowPolyline({ 
  positions,
  pathOptions,
  startHead=true,
  endHead=true,
  arrowHeadOptions,
}: ArrowPolylineProps): null {
  const map = useMap();
  const polylineRef = useRef<L.Polyline | null>(null);
  const decoratorRef = useRef<any>(null); // Kept as 'any' due to custom plugin type limitations

  useEffect(() => {
    if (!map) return;

    // 1. Create and add the base polyline layer
    polylineRef.current = L.polyline(positions, pathOptions).addTo(map);

    // 2. Setup the directional arrow patterns
    decoratorRef.current = L.polylineDecorator(polylineRef.current, {
      patterns: [
        // First head
        ...(startHead ? [{
          offset: 0, // At the beginning of line
          repeat: 0,
          ...({ reverse: true } as any),
          symbol: L.Symbol.arrowHead({
            pixelSize: 6,
            pathOptions: {
              stroke: false, 
              fillOpacity: 1,
              ...pathOptions,
            },
            ...arrowHeadOptions,
            headAngle: 360 + (arrowHeadOptions?.headAngle ?? 45), // Facing back
          }),
        }] : []),
        // Second head
        ...(endHead ? [{
          offset: "100%", // At the end of line 
          repeat: 0,
          symbol: L.Symbol.arrowHead({
            pixelSize: 6,       
            headAngle: 45, // Facing forward
            pathOptions: {
              stroke: false, 
              fillOpacity: 1,
              ...pathOptions,
            },
            ...arrowHeadOptions,
          }),
        }] : []),
      ],
    }).addTo(map);

    // Clean up layers when component unmounts or coordinates change
    return () => {
      if (polylineRef.current && map.hasLayer(polylineRef.current)) {
        map.removeLayer(polylineRef.current);
      }
      if (decoratorRef.current && map.hasLayer(decoratorRef.current)) {
        map.removeLayer(decoratorRef.current);
      }
    };
  }, [map, positions, pathOptions, arrowHeadOptions]);

  return null; // Imperative Leaflet rendering
}