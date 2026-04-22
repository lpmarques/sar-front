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

import { Position } from "geojson";
import { latLng, LatLng, LatLngTuple } from "leaflet";

// ---------------------------------------------------------------------------
// Internal geometry types (not exported — implementation detail)
// ---------------------------------------------------------------------------

type Point2D = [number, number]; // [x, y] in metres
type BBox = { minX: number; minY: number; maxX: number; maxY: number };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEG2RAD = Math.PI / 180;
const EARTH_R = 6_371_000; // metres

// ---------------------------------------------------------------------------
// Geo-math helpers
// ---------------------------------------------------------------------------

export function positionToLatLng(coords: Position): LatLng;
export function positionToLatLng(coords: Position[]): LatLng[];
export function positionToLatLng(coords: Position[][]): LatLng[][];
export function positionToLatLng(coords: Position | Position[] | Position[][]): LatLng | LatLng[] | LatLng[][] {
  if (typeof coords[0] === 'number')
    return latLng(coords[1] as number, coords[0]);
  if (typeof coords[0][0] === 'number')
    return coords.map(coords => positionToLatLng(coords as Position));

  return coords.map(coords => positionToLatLng(coords as Position[]));
}

// TODO: replace with component linking coordinates to google maps (https://maps.google.com/?q={lat},{long})
export function latLongToString(latitude: number, longitude: number, decimalPlaces: number = 4) {
  const rndFctr = Math.pow(10, decimalPlaces);

  return `${Math.round(latitude*rndFctr)/rndFctr},${Math.round(longitude*rndFctr)/rndFctr}`
}

/** Project a lat/lng coordinate to local X/Y in metres relative to an origin. */
export function toMeters(
  lat: number,
  lng: number,
  originLat: number,
  originLng: number
): Point2D {
  const x =
    (lng - originLng) * DEG2RAD * EARTH_R * Math.cos(originLat * DEG2RAD);
  const y = (lat - originLat) * DEG2RAD * EARTH_R;
  return [x, y];
}

/** Inverse of `toMeters` — convert local metric X/Y back to [lat, lng]. */
export function fromMeters(
  x: number,
  y: number,
  originLat: number,
  originLng: number
): LatLngTuple {
  const lat = originLat + y / EARTH_R / DEG2RAD;
  const lng =
    originLng + x / (EARTH_R * Math.cos(originLat * DEG2RAD)) / DEG2RAD;
  return [lat, lng];
}

/** Axis-aligned bounding box of a list of metric points. */
export function getBBox(points: Point2D[]): BBox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  
  return { minX, minY, maxX, maxY };
}

/**
 * Segment–segment intersection test.
 * Returns the intersection point as a `Point2D`, or `null` if the segments
 * do not cross within their extents.
 */
export function segmentIntersect(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
  dx: number, dy: number
): Point2D | null {
  const rx = bx - ax, ry = by - ay;
  const sx = dx - cx, sy = dy - cy;
  const denom = rx * sy - ry * sx;

  if (Math.abs(denom) < 1e-10) return null;

  const t = ((cx - ax) * sy - (cy - ay) * sx) / denom;
  const u = ((cx - ax) * ry - (cy - ay) * rx) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return [ax + t * rx, ay + t * ry];
  }
  return null;
}

/**
 * Clip a line segment (given as two far-reach points) against a closed polygon.
 *
 * Collects every polygon-edge intersection, sorts by parametric distance from
 * `a`, and returns the outermost two — i.e. the portion of the line that lies
 * inside the polygon. Returns `null` when fewer than two intersections exist.
 */
export function clipLineToPoly(
  ax: number, ay: number,
  bx: number, by: number,
  poly: Point2D[]
): [Point2D, Point2D] | null {
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const hits: { t: number; pt: Point2D }[] = [];

  for (let i = 0; i < poly.length; i++) {
    const [px, py] = poly[i];
    const [qx, qy] = poly[(i + 1) % poly.length];
    const pt = segmentIntersect(ax, ay, bx, by, px, py, qx, qy);
    if (pt) {
      const t = Math.hypot(pt[0] - ax, pt[1] - ay) / len;
      hits.push({ t, pt });
    }
  }

  hits.sort((a, b) => a.t - b.t);

  if (hits.length >= 2) {
    return [hits[0].pt, hits[hits.length - 1].pt];
  }
  return null;
}

/**
 * Ray-casting point-in-polygon test.
 * Returns `true` if (x, y) is strictly inside `poly`.
 */
export function pointInPoly(x: number, y: number, poly: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}
