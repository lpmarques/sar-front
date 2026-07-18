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

import { GeometryUtil, LatLng } from "leaflet";
import 'leaflet-geometryutil';
import { clipLineToPoly, DEG2RAD, getBBox, latLngCentroid, latLngToMeters, metersToLatLng, Point2D, pointInPoly } from "../../utils/agroforestry";
import { CircleMarker, Polyline, Tooltip } from "react-leaflet";
import { CroppingSummary, CroppingSummaryCrops, PatternCrop, PatternRow } from "../../apis/agroforestry";
import { useEffect, useMemo } from "react";
import { plantFullLabel } from "../../utils/catalog";
import { capitalize } from "../../utils/common";

const SQ_METERS_PER_HECTARE = 10000;

/** A single rendered crop marker. */
interface CropLayer {
  coords: LatLng;
  name: string;
  color: string;
  patternRowPos: number;
  patternCropPos: number;
}

/** A single rendered row: two endpoints (lat/lng) and a display colour. */
interface RowLayer {
  coords: [LatLng, LatLng];
  color: string;
  patternRowPos: number;
}

export interface CroppingLayers {
  rows: RowLayer[];
  crops: CropLayer[];
}

interface CroppingLayersProps {
  fieldCoords: LatLng[],
  patternRows: PatternRow[],
  rowsAngleDeg?: number,
  rowsOffsetM?: number,
  cropsOffsetM?: number,
  onCroppingSummarized: (summary: CroppingSummary) => void,
}

export default function CroppingLayers({
  fieldCoords,
  patternRows,
  rowsAngleDeg=0,
  rowsOffsetM=0,
  cropsOffsetM=0,
  onCroppingSummarized,
}: CroppingLayersProps) {

  const fieldCentroid = latLngCentroid(fieldCoords);
  
  // Recompute geometry only when relevant props change
  const croppingLayers = useMemo<CroppingLayers>(
    () => computeCroppingLayers(fieldCoords, patternRows, rowsAngleDeg, rowsOffsetM, cropsOffsetM),
    [fieldCentroid.lat, fieldCentroid.lng, patternRows, rowsAngleDeg, rowsOffsetM, cropsOffsetM]
  );

  // Recompute summary only when geometry changes
  useEffect(() => {
      const croppingSummary = computeCroppingSummary(fieldCoords, patternRows, croppingLayers.crops);
      onCroppingSummarized(croppingSummary);
    },
    [croppingLayers]
  );

  if (croppingLayers) {
    return <>
      <CropRows rows={croppingLayers.rows} />
      <CropMarkers crops={croppingLayers.crops} />
    </>
  }
}

function computeCroppingSummary(
  fieldCoords: LatLng[],
  patternRows: PatternRow[],
  cropLayers: CropLayer[]
) {
  const fieldAreaSqrm = GeometryUtil.geodesicArea(fieldCoords);

  const computeIndividualCropArea = (patternRow: PatternRow, patternCrop: PatternCrop) => {
    return patternCrop.distanceToNextCropM*patternRow.distanceToNextRowM;
  }

  const computeCropDensity = (individualsCount: number) => {
    return Math.floor(individualsCount/fieldAreaSqrm*SQ_METERS_PER_HECTARE);
  }

  const initCropSummary = (patternRow: PatternRow, patternCrop: PatternCrop) => {
    return {
      plant: patternCrop.plant,
      metrics: {
        individualsCount: 1,
        occupiedAreaSqrm: computeIndividualCropArea(patternRow, patternCrop),
        densityPerHa: computeCropDensity(1),
      }
    };
  }

  const summaryCrops = cropLayers.reduce(
    (crops: CroppingSummaryCrops, crop) => {
      const patternRow = patternRows[crop.patternRowPos-1]
      const patternCrop = patternRow.crops[crop.patternCropPos-1];
      const cropKey = patternCrop.plant.acceptedTaxonName;
      if (!Object.keys(crops).includes(cropKey))
        crops[cropKey] = initCropSummary(patternRow, patternCrop);

      const { individualsCount, occupiedAreaSqrm } = crops[cropKey].metrics;
      crops[cropKey].metrics = {
        individualsCount: individualsCount + 1,
        occupiedAreaSqrm: occupiedAreaSqrm + computeIndividualCropArea(patternRow, patternCrop),
        densityPerHa: computeCropDensity(individualsCount + 1),
      };

      return crops;
    }, {}
  );

  const croppingSummary = Object.values(summaryCrops).reduce(
    (summary: CroppingSummary, crop) => {
      summary.individualsCount += crop.metrics.individualsCount;
      summary.densityPerHa += crop.metrics.densityPerHa;

      return summary;
    }, {
    individualsCount: 0,
    densityPerHa: 0,
    crops: summaryCrops,
  });

  return croppingSummary;
}

/**
 * Computes all row polylines and crop marker positions that lie inside the
 * field polygon, honouring the repeating row/crop pattern.
 *
 * The function works entirely in metric (metre) coordinate system
 * projected from the polygon centroid, then reprojects results back to
 * lat/lng for Leaflet.
 */

function computeCroppingLayers(
  fieldCoords: LatLng[],
  patternRows: PatternRow[],
  rowsAngleDeg: number = 0,
  rowsOffsetM: number = 0,
  cropsOffsetM: number = 0,
): CroppingLayers {
  // 1. Derive a stable metric origin from the polygon centroid
  const originLatLng = latLngCentroid(fieldCoords);

  // 2. Project the polygon into metric space
  const polyMeters: Point2D[] = fieldCoords.map(latLng =>
    latLngToMeters(latLng, originLatLng)
  );

  const bbox = getBBox(polyMeters);
  const cx = (bbox.minX + bbox.maxX) / 2;
  const cy = (bbox.minY + bbox.maxY) / 2;
  const diagonalM = Math.hypot(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);

  const totalRowSpacingM = patternRows.reduce((s, row) => s + row.distanceToNextRowM, 0);
  const rowsSizesM = patternRows.map(row => row.crops.reduce((s, crop) => s + crop.distanceToNextCropM, 0));
  const longestRowSizeM = Math.min(...rowsSizesM);
  const avgRowSpacingM = totalRowSpacingM / patternRows.length;
  
  // 3. Unit vectors for the row direction and its perpendicular
  const angle = (rowsAngleDeg + 90) * -DEG2RAD;
  const dir: Point2D = [Math.cos(angle), Math.sin(angle)];   // along the row
  const perp: Point2D = [-Math.sin(angle), Math.cos(angle)]; // across rows

  const dirOffsetM = cropsOffsetM % longestRowSizeM;
  const perpOffsetM = rowsOffsetM % totalRowSpacingM;

  const numSweeps = Math.ceil((diagonalM + totalRowSpacingM) / avgRowSpacingM ) + 1;

  const rows: RowLayer[] = [];
  const crops: CropLayer[] = [];

  const getSweepLineOrigin = (refPoint: Point2D, distanceFromRef: number): Point2D => {
    const ox = refPoint[0] + perp[0] * distanceFromRef;
    const oy = refPoint[1] + perp[1] * distanceFromRef;

    return [ox, oy];
  }

  const getPatternRowIndex = (sweepNum: number): number => {
    return ((sweepNum % patternRows.length) + patternRows.length) % patternRows.length;
  }
  
  const halfSweeps = Math.ceil(numSweeps/2);
  const initPatternRowIndex = getPatternRowIndex(-halfSweeps-1);
  let sweepOrigin = getSweepLineOrigin([cx, cy], (-halfSweeps-1) * avgRowSpacingM + perpOffsetM);
  let distanceToNextRowM = patternRows[initPatternRowIndex].distanceToNextRowM;

  for (let ri = -halfSweeps; ri <= halfSweeps; ri++) {
    // 4. Pick the row definition by cycling through the pattern
    const patternRowIndex = getPatternRowIndex(ri);
    const patternRow = patternRows[patternRowIndex];

    // 5. Translate the row origin along the perpendicular axis
    sweepOrigin = getSweepLineOrigin(sweepOrigin, distanceToNextRowM);
    distanceToNextRowM = patternRow.distanceToNextRowM;
    const [ox, oy] = sweepOrigin;

    // Extend the sweep line well past the bounding box in both directions
    const reach = diagonalM/2 + longestRowSizeM;
    const ax = ox - dir[0] * reach;
    const ay = oy - dir[1] * reach;
    const bx = ox + dir[0] * reach;
    const by = oy + dir[1] * reach;

    // 6. Clip the infinite sweep line to the polygon boundary
    const clipped = clipLineToPoly(ax, ay, bx, by, polyMeters);// [[ax, ay], [bx, by]]//
    if (!clipped) continue;

    const totalCropSpacingM = patternRow.crops.reduce((s, patternCrop) => s + patternCrop.distanceToNextCropM, 0);
    const minCropSpacingM = Math.min(...patternRow.crops.map(patternCrop => patternCrop.distanceToNextCropM));

    const [[sx, sy], [ex, ey]] = clipped;
    const rowLen = Math.hypot(ex - sx, ey - sy);
    if (rowLen < minCropSpacingM) continue;

    const startLL = metersToLatLng([sx, sy], originLatLng);
    const endLL = metersToLatLng([ex, ey], originLatLng);

    rows.push({
      coords: [startLL, endLL],
      patternRowPos: patternRowIndex+1,
      color: "#888888",
    });

    // 7. Sample crop positions along the clipped segment
    const avgCropSpacingM = totalCropSpacingM / patternRow.crops.length;
    const sweepLen = Math.hypot(bx - ax, by - ay);
    const numCrops = Math.floor(sweepLen / avgCropSpacingM);

    const getCropPoint = (refPoint: Point2D, distanceFromRef: number): Point2D => {
      const mx = refPoint[0] + dir[0] * distanceFromRef;
      const my = refPoint[1] + dir[1] * distanceFromRef;

      return [mx, my];
    }
    
    const rowCropsOffsetM = patternRow.cropsOffsetM % rowsSizesM[patternRowIndex];
    let cropPoint = getCropPoint([ax, ay], dirOffsetM + rowCropsOffsetM);

    for (let ci = 0; ci <= numCrops; ci++) {
      // 8. Cycle the crop sequence within this row's definition
      const patternCropIndex = ci % patternRow.crops.length;
      const patternCrop = patternRow.crops[patternCropIndex];

      // Belt-and-suspenders check: required for concave polygons where the
      // clipped segment may still briefly exit the boundary.
      if (pointInPoly(cropPoint, polyMeters)) {
        crops.push({
          coords: metersToLatLng(cropPoint, originLatLng),
          name: patternCrop.plant.mainPopularName,
          color: patternCrop.plant.colorHex,
          patternRowPos: patternRowIndex+1,
          patternCropPos: patternCropIndex+1,
        });
      }

      cropPoint = getCropPoint(cropPoint, patternCrop.distanceToNextCropM);
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
          positions={row.coords}
          pathOptions={{ color: row.color, weight: 1.5, opacity: 1 }}
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
          center={crop.coords}
          radius={4}
          pathOptions={{
            color: crop.color,
            fillColor: crop.color,
            fillOpacity: 0.85,
            weight: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -6]}>
            <strong>{capitalize(crop.name)}</strong>
            <br />
            Posição no padrão: Linha {crop.patternRowPos}, Cultivo {crop.patternCropPos}
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
