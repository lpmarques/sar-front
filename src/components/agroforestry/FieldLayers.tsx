/*
Simulador Agroflorestal Regenera (SAR)
Copyright (C) 2026  Lucas Marques and Regenera Mata Atlântica

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses>.
*/

import { LatLng } from "leaflet";
import { clipLineToPoly, DEG2RAD, getBBox, latLngCentroid, latLngToMeters, metersToLatLng, Point2D, pointInPoly } from "../../utils/agroforestry";
import { CircleMarker, Polyline, Tooltip } from "react-leaflet";

export const ROW_PATTERN: RowDef[] = [
  {
    crops: [
      { species: "Corn",      color: "#e6a817" },
      { species: "Corn",      color: "#e6a817" },
      { species: "Bean",      color: "#5a9e3a" },
    ],
  },
  {
    crops: [
      { species: "Sunflower", color: "#e8d44d" },
      { species: "Pea",       color: "#89c97a" },
      { species: "Pea",       color: "#89c97a" },
    ],
  },
  {
    crops: [
      { species: "Wheat",     color: "#c8a96b" },
      { species: "Wheat",     color: "#c8a96b" },
      { species: "Wheat",     color: "#c8a96b" },
      { species: "Wheat",     color: "#c8a96b" },
    ],
  },
  {
    crops: [
      { species: "Soy",       color: "#7ab87a" },
      { species: "Bean",      color: "#5a9e3a" },
      { species: "Corn",      color: "#e6a817" },
    ],
  },
];

/** A single crop slot within a row: what species it is and how to colour it. */
export interface CropDef {
  species: string;
  /** CSS colour string, e.g. "#e6a817" */
  color: string;
}

/**
 * One entry in the repeating row pattern.
 * The `crops` array is cycled along the full length of each row.
 */
export interface RowDef {
  crops: CropDef[];
}

/** A single rendered crop marker. */
interface CropLayer {
  position: LatLng;
  species: string;
  color: string;
  rowIndex: number;
  cropIndex: number;
}

/** A single rendered row: two endpoints (lat/lng) and a display colour. */
interface RowLayer {
  positions: [LatLng, LatLng];
  rowDefIndex: number;
  color: string;
}

export interface FieldLayers {
  rows: RowLayer[];
  crops: CropLayer[];
}

// ---------------------------------------------------------------------------
// Core geometry computation
// ---------------------------------------------------------------------------

interface ComputeOptions {
  /** Distance between adjacent rows in metres. */
  rowSpacingM: number;
  /** Distance between individual crop markers along a row in metres. */
  cropSpacingM: number;
  /** Row direction angle in degrees (0 = east–west, 90 = north–south). */
  angleDeg: number;
}

/**
 * Computes all row polylines and crop marker positions that lie inside the
 * field polygon, honouring the repeating row/crop pattern.
 *
 * The function works entirely in a local metric (metre) coordinate system
 * projected from the polygon centroid, then reprojects results back to
 * lat/lng for Leaflet.
 */

// TODO: separar cálculo de posições das linhas do cálculo de posições dos plantios (o primeiro gerando entrada para o segundo)
export function computeFieldLayers(
  fieldCoords: LatLng[],
  rowPattern: RowDef[],
  { rowSpacingM, cropSpacingM, angleDeg }: ComputeOptions
): FieldLayers {
  // 1. Derive a stable metric origin from the polygon centroid
  const originLatLng = latLngCentroid(fieldCoords);

  // 2. Project the polygon into metric space
  const polyMeters: Point2D[] = fieldCoords.map(latLng =>
    latLngToMeters(latLng, originLatLng)
  );

  const bbox = getBBox(polyMeters);
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  const diagonal = Math.hypot(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);

  // 3. Unit vectors for the row direction and its perpendicular
  const angle = angleDeg * DEG2RAD;
  const dir: Point2D = [Math.cos(angle), Math.sin(angle)];   // along the row
  const perp: Point2D = [-Math.sin(angle), Math.cos(angle)]; // across rows

  const numSweeps = Math.ceil(diagonal / rowSpacingM) + 1;

  const rows: RowLayer[] = [];
  const crops: CropLayer[] = [];

  for (let ri = -numSweeps; ri <= numSweeps; ri++) {
    // 4. Translate the row origin along the perpendicular axis
    const ox = cx + perp[0] * ri * rowSpacingM;
    const oy = cy + perp[1] * ri * rowSpacingM;

    // Extend the sweep line well past the bounding box in both directions
    const reach = diagonal + rowSpacingM;
    const ax = ox - dir[0] * reach;
    const ay = oy - dir[1] * reach;
    const bx = ox + dir[0] * reach;
    const by = oy + dir[1] * reach;

    // 5. Clip the infinite sweep line to the polygon boundary
    const clipped = clipLineToPoly(ax, ay, bx, by, polyMeters);
    if (!clipped) continue;

    const [[sx, sy], [ex, ey]] = clipped;
    const rowLen = Math.hypot(ex - sx, ey - sy);
    if (rowLen < cropSpacingM) continue;

    // 6. Pick the row definition by cycling through the pattern
    const rowDefIndex =
      ((ri % rowPattern.length) + rowPattern.length) % rowPattern.length;
    const rowDef = rowPattern[rowDefIndex];

    const startLL = metersToLatLng([sx, sy], originLatLng);
    const endLL = metersToLatLng([sx, sy], originLatLng);

    rows.push({
      positions: [startLL, endLL],
      rowDefIndex,
      // Use the first crop colour as the row line colour
      color: "#888888",
    });

    // 7. Sample evenly-spaced crop positions along the clipped segment
    const numCrops = Math.floor(rowLen / cropSpacingM);

    for (let ci = 0; ci <= numCrops; ci++) {
      const t = numCrops === 0 ? 0 : ci / numCrops;
      const mx = sx + (ex - sx) * t;
      const my = sy + (ey - sy) * t;

      // Belt-and-suspenders check: required for concave polygons where the
      // clipped segment may still briefly exit the boundary.
      if (!pointInPoly([mx, my], polyMeters)) continue;

      const position = metersToLatLng([mx, my], originLatLng);

      // 8. Cycle the crop sequence within this row's definition
      const cropDefIndex = ci % rowDef.crops.length;
      const cropDef = rowDef.crops[cropDefIndex];

      crops.push({
        position,
        species: cropDef.species,
        color: cropDef.color,
        rowIndex: rowDefIndex,
        cropIndex: cropDefIndex,
      });
    }
  }

  return { rows, crops };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CropRowsProps {
  rows: RowLayer[];
}

export function CropRows({ rows }: CropRowsProps) {
  return (
    <>
      {rows.map((row, i) => (
        <Polyline
          key={i}
          positions={row.positions}
          pathOptions={{ color: row.color, weight: 1.5, opacity: 0.5 }}
        />
      ))}
    </>
  );
}

interface CropMarkersProps {
  crops: CropLayer[];
}

export function CropMarkers({ crops }: CropMarkersProps) {
  return (
    <>
      {crops.map((crop, i) => (
        <CircleMarker
          key={i}
          center={crop.position}
          radius={5}
          pathOptions={{
            color: crop.color,
            fillColor: crop.color,
            fillOpacity: 0.85,
            weight: 1.2,
          }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            <strong>{crop.species}</strong>
            <br />
            Row pattern {crop.rowIndex + 1}, position {crop.cropIndex + 1}
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
