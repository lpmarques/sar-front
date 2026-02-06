import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import * as L from 'leaflet';

interface MapBoundsFramingProps {
  bounds: L.LatLngBounds,
  maxZoom: number,
}

export default function MapBoundsFraming({ bounds, maxZoom }: MapBoundsFramingProps) {
  const map = useMap();
  const center = bounds.getCenter();

  useEffect(() => {
    map.fitBounds(bounds, {
      padding: [20, 20], // Adds 20px buffer so polygon doesn't touch edges
      maxZoom: maxZoom,  // Prevents extreme zooming on very small polygons
    });
  }, [center, map]);

  return null;
};