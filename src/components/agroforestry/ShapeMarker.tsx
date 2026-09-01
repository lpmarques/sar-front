import * as L from "leaflet";
import { Marker } from "react-leaflet";

/**
 * Hover-overlay shapes for the editor's spacing interactivity. We render them
 * via a `react-leaflet` `Marker` with a custom `divIcon` containing an
 * inline SVG — same approach as `CirclePlusMarker` below — so the lifecycle is
 * owned by React and stays stable across parent re-renders (which keeps
 * `ShowOnHoverBox`'s hovered ternary from thrashing markers on/off the map).
 *
 * Visually these mirror the equations used by `leaflet-svg-shape-markers`
 * (see `buildShapePath` below), with `radius` in CSS pixels.
 */

/**
 * Names supported by `ShapeMarker`. The path math is taken verbatim
 * from `leaflet-svg-shape-markers`, except `triangle-down` (which the
 * plugin renders by mirror-image and we now honour explicitly).
 */
type ShapeName =
  | "diamond"
  | "square"
  | "triangle"
  | "triangle-down"
  | "circle"
  | "x"
  | "star"
  | `star-${number}`
  | "arrowhead"
  | "arrowhead-up"
  | "arrowhead-down";

/**
 * Builds the SVG path data and a *square* viewBox centred on the path's
 * `(0, 0)` (which equals the shape's geometric centroid and is the lat/lng
 * in screen space). Using a square viewBox lets `ShapeMarker` anchor
 * via `iconAnchor = [size/2, size/2]` without `preserveAspectRatio`
 * letterboxing pulling asymmetric shapes (like `triangle` / `triangle-down`)
 * off-centre.
 *
 * Path vertex offsets are in CSS pixels. Mirrors the math in
 * `leaflet-svg-shape-markers`'s `_updateShape` (read from
 * `node_modules/.vite/deps/leaflet-svg-shape-markers.js`).
 */
function buildShapePath(
  shape: ShapeName,
  r: number,
): { kind: "path" | "circle"; d: string; viewBox: [number, number, number, number]; hitArea: number; extent: number } {
  const S = Math.sqrt(2) * r;
  // Square viewBox side: large enough to contain the path's farthest vertex
  // from the path-data origin (which is the centroid for every shape below).
  const extent = (half: number): number => half;

  switch (shape) {
    case "diamond":
      return {
        kind: "path",
        d: `M ${-S} 0 L 0 ${-S} ${S} 0 0 ${S} ${-S} 0 Z`,
        viewBox: [-extent(S), -extent(S), 2 * extent(S), 2 * extent(S)],
        hitArea: 2 * S,
        extent: extent(S),
      };
    case "square":
      return {
        kind: "path",
        d: `M ${-r} ${-r} L ${r} ${-r} ${r} ${r} ${-r} ${r} Z`,
        viewBox: [-extent(r), -extent(r), 2 * extent(r), 2 * extent(r)],
        hitArea: 2 * r,
        extent: extent(r),
      };
    case "triangle":
      // Apex at (0, -1.5r), base at (±1.3r, +0.75r). Farthest vertex from
      // the centroid `(0, 0)` is the apex at distance 1.5r.
      return {
        kind: "path",
        d: `M ${-1.3 * r} ${0.75 * r} L 0 ${-1.5 * r} ${1.3 * r} ${0.75 * r} Z`,
        viewBox: [-1.5 * r, -1.5 * r, 3 * r, 3 * r],
        hitArea: 3 * r,
        extent: 1.5 * r,
      };
    case "triangle-down":
      // Apex at (0, +1.5r), base at (±1.3r, -0.75r). Farthest vertex from
      // the centroid `(0, 0)` is the apex at distance 1.5r.
      return {
        kind: "path",
        d: `M ${-1.3 * r} ${-0.75 * r} L 0 ${1.5 * r} ${1.3 * r} ${-0.75 * r} Z`,
        viewBox: [-1.5 * r, -1.5 * r, 3 * r, 3 * r],
        hitArea: 3 * r,
        extent: 1.5 * r,
      };
    case "circle":
      return {
        kind: "circle",
        d: "",
        viewBox: [-extent(r), -extent(r), 2 * extent(r), 2 * extent(r)],
        hitArea: 2 * r,
        extent: extent(r),
      };
    case "x":
      return {
        kind: "path",
        d: `M ${r / 2} ${r / 2} L ${-r / 2} ${-r / 2} M ${-r / 2} ${r / 2} L ${r / 2} ${-r / 2}`,
        viewBox: [-extent(r), -extent(r), 2 * extent(r), 2 * extent(r)],
        hitArea: 2 * r,
        extent: extent(r),
      };
    case "arrowhead":
    case "arrowhead-up":
      // Farthest vertex from centroid `(0, 0)` is one of the base corners
      // at (±1.3r, +1.3r), distance `1.3r * sqrt(2) ≈ 1.84r`. Apex at
      // (0, -1.3r) is only 1.3r away. Use the corner distance so the
      // base isn't clipped.
      return {
        kind: "path",
        d: `M ${1.3 * r} ${1.3 * r} L 0 ${-1.3 * r} ${-1.3 * r} ${1.3 * r} 0 ${0.5 * r} ${1.3 * r} ${1.3 * r} Z`,
        viewBox: [-1.3 * Math.sqrt(2) * r, -1.3 * Math.sqrt(2) * r, 2.6 * Math.sqrt(2) * r, 2.6 * Math.sqrt(2) * r],
        hitArea: 2.6 * Math.sqrt(2) * r,
        extent: 1.3 * Math.sqrt(2) * r,
      };
    case "arrowhead-down":
      return {
        kind: "path",
        d: `M ${-1.3 * r} ${-1.3 * r} L 0 ${1.3 * r} ${1.3 * r} ${-1.3 * r} 0 ${-0.5 * r} ${-1.3 * r} ${-1.3 * r} Z`,
        viewBox: [-1.3 * Math.sqrt(2) * r, -1.3 * Math.sqrt(2) * r, 2.6 * Math.sqrt(2) * r, 2.6 * Math.sqrt(2) * r],
        hitArea: 2.6 * Math.sqrt(2) * r,
        extent: 1.3 * Math.sqrt(2) * r,
      };
  }

  // Star (with optional point count: `star-7`, `star-12`, ...; default 5).
  if (shape === "star" || shape.startsWith("star-")) {
    const points = shape === "star"
      ? 5
      : (() => {
          const parsed = parseInt(shape.split(/[^0-9a-z]/i)[1] ?? "", 10);
          return Number.isFinite(parsed) && parsed > 2 ? parsed : 5;
        })();
    // Golden-ratio proportion used by the plugin: outer radius = r, inner = r / ratio.
    const ratio = 0.5 * (1 + Math.sqrt(5)) + 1;
    const inner = r / ratio;
    const segments: string[] = [];
    for (let i = 0; i < points; i++) {
      const outerX = r * Math.sin((2 * Math.PI) / points * i);
      const outerY = r * Math.cos((2 * Math.PI) / points * i);
      const innerX = inner * Math.sin((Math.PI / points) + (2 * Math.PI) / points * i);
      const innerY = inner * Math.cos((Math.PI / points) + (2 * Math.PI) / points * i);
      segments.push(`${i === 0 ? "M" : "L"} ${outerX} ${outerY} L ${innerX} ${innerY}`);
    }
    segments.push("Z");
    return {
      kind: "path",
      d: segments.join(" "),
      viewBox: [-extent(r), -extent(r), 2 * extent(r), 2 * extent(r)],
      hitArea: 2 * r,
      extent: extent(r),
    };
  }

  // Unreachable given the `ShapeName` union, but keep a sane fallback.
  return {
    kind: "circle",
    d: "",
    viewBox: [-extent(r), -extent(r), 2 * extent(r), 2 * extent(r)],
    hitArea: 2 * r,
    extent: extent(r),
  };
}

interface ShapeMarkerProps {
  shape: ShapeName;
  latLng: L.LatLngExpression;
  radiusPx: number;
  rotation?: number;
  pathOptions: L.PathOptions;
  interactive: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
}

/**
 * Declarative shape marker. Renders a `react-leaflet` `Marker` with a
 * `divIcon` containing an inline SVG, so React owns the lifecycle. This
 * avoids adding/removing layers imperatively, which previously caused
 * `ShowOnHoverBox` to thrash markers on/off the map during hover toggles.
 *
 * `pathOptions` uses `L.PathOptions` field names (`color`, `fillColor`,
 * `fillOpacity`, `weight`, `opacity`, `stroke`, `dashArray`,
 * `lineCap`, `lineJoin`) and translates them to SVG attributes on the
 * inner `<path>`/`<circle>`.
 */
export default function ShapeMarker({
  shape,
  latLng,
  radiusPx,
  rotation,
  pathOptions,
  interactive,
  children,
  onClick,
  onMouseOver,
  onMouseOut,
}: ShapeMarkerProps) {
  const { kind, d, viewBox, hitArea } = buildShapePath(shape, radiusPx);
  const rotationDeg = rotation ?? 0;

  // Add a small padding around the SVG so the stroke weight doesn't clip and
  // the click/touch target is forgiving. The viewBox is square and centred
  // on the path-data origin `(0, 0)`, so `iconAnchor = [size/2, size/2]`
  // pins the shape's centroid to the marker's lat/lng — rotations then
  // pivot around the centroid, matching `leaflet-svg-shape-markers`'s
  // behaviour where `_point` (the marker's screen position) sits at the
  // path's `(0, 0)`.
  const padding = 2;
  const size = Math.ceil(hitArea + 2 * padding + (pathOptions.weight ?? 0));

  const stroke = pathOptions.color ?? "#3388ff";
  const fill = pathOptions.fillColor ?? stroke;
  const fillOpacity = pathOptions.fillOpacity ?? 0.2;
  const opacity = pathOptions.opacity ?? 1;
  const weight = pathOptions.weight ?? 1;
  const strokeStyle = `stroke="${stroke}" stroke-width="${weight}" stroke-opacity="${opacity}" fill-opacity="${fillOpacity}" fill="${fill}"`;
  const fillRule = pathOptions.fillRule ?? "nonzero";
  const lineCap = pathOptions.lineCap ?? "round";
  const lineJoin = pathOptions.lineJoin ?? "round";
  const isX = shape === "x";
  const transform = `rotate(${rotationDeg})`;

  const svgInner =
    kind === "circle" ? (
      `<circle cx="0" cy="0" r="${radiusPx}" ${strokeStyle} fill-rule="${fillRule}" transform="${transform}"/>`
    ) : isX ? (
      `<path d="${d}" stroke="${stroke}" stroke-width="${weight}" stroke-opacity="${opacity}" stroke-linecap="${lineCap}" fill="none" transform="${transform}"/>`
    ) : (
      `<path d="${d}" ${strokeStyle} fill-rule="${fillRule}" stroke-linejoin="${lineJoin}" transform="${transform}"/>`
    );

  const html = `
    <svg xmlns="http://www.w3.org/2000/svg"
         viewBox="${viewBox[0]} ${viewBox[1]} ${viewBox[2]} ${viewBox[3]}"
         width="${size}" height="${size}"
         style="overflow: visible; pointer-events: ${interactive ? 'auto' : 'none'}; cursor: ${interactive && onClick ? 'pointer' : 'default'};">
      ${svgInner}
    </svg>`;

  const icon = L.divIcon({
    className: 'pattern-preview-shape',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  const eventHandlers: Record<string, (() => void) | undefined> = {
    click: onClick,
  };
  if (onMouseOver) eventHandlers.mouseover = onMouseOver;
  if (onMouseOut) eventHandlers.mouseout = onMouseOut;

  return (
    <Marker
      position={latLng}
      icon={icon}
      interactive={interactive}
      keyboard={false}
      eventHandlers={eventHandlers}
    >
      {children}
    </Marker>
  );
}
