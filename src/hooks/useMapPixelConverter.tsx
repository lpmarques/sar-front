import { useCallback, useEffect, useState } from "react";
import { useMap } from "react-leaflet";

export function useMapPixelConverter(unitsPerMeter: number = 1) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on("zoomend", onZoom);
    return () => { map.off("zoomend", onZoom); };
  }, [map]);

  // 2. Convert raw meters to screen pixels at the current zoom level
  const metersToPixels = useCallback((meters: number) => {
    const mapUnits = meters * unitsPerMeter;
    // Leaflet projects map units to pixels using the zoom factor
    return mapUnits * Math.pow(2, zoom);
  }, [zoom, unitsPerMeter]);

  // 3. Convert screen pixels back to meters at the current zoom level
  const pixelsToMeters = useCallback((pixels: number) => {
    const mapUnits = pixels / Math.pow(2, zoom);
    return mapUnits / unitsPerMeter;
  }, [zoom, unitsPerMeter]);

  return { metersToPixels, pixelsToMeters };
}
