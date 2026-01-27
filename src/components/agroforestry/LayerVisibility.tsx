import { Marker, Polygon } from "leaflet";
import React from "react";
import { useMap } from "react-leaflet";

interface LayerVisibilityProps {
  children: React.ReactNode
  layer: Polygon | Marker
}

export default function LayerVisibility({ layer, children }: LayerVisibilityProps) {
  const map = useMap();

  if (map.hasLayer(layer))
    return null;

  return children;
}