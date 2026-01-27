import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { MaptilerLayer } from "@maptiler/leaflet-maptilersdk";
import * as maptilersdk from '@maptiler/sdk';

export default function MaptilerVectorLayer({ style }: { style: maptilersdk.ReferenceMapStyle }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const mtLayer = new MaptilerLayer({
      apiKey: maptilersdk.config.apiKey,
      style: style,
    });

    mtLayer.addTo(map);

    return () => {
      map.removeLayer(mtLayer);
    };
  }, [map, style]);

  return null;
};
