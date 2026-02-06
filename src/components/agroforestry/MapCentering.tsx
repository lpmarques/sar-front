import { LatLngExpression } from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

interface MapCenteringProps {
  center: LatLngExpression,
  zoom: number,
}

export default function MapCentering({ center, zoom }: MapCenteringProps) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [center, map]);

  return null;
};