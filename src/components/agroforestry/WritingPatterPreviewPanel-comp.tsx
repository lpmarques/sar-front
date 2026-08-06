/*
Simulador Agroflorestal Regenera (SAR)
Copyright (C) 2026  Lucas Marques and Regenera Mata Atlântica

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import * as L from "leaflet";
import "leaflet-svg-shape-markers";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Tooltip as LeafletTooltip,
  useMap,
  FeatureGroup,
} from "react-leaflet";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { CroppingPatternReadData, PatternCrop } from "../../apis/agroforestry";
import { PlantFullNameLabel } from "../catalog";
import { MapBoundsFraming, ArrowPolyline, LeafletStyleButtonControl } from ".";

const PX_PER_M = 30;
const PATTERN_LEFT_PADDING_M = 1.4;
const PATTERN_BOTTOM_PADDING_M = 0;
const PATTERN_RIGHT_PADDING_M = 1;
const PATTERN_TOP_PADDING_M = 1.5;
const ROW_START_OFFSET_LABEL_GAP_M = 0.4;
const ROW_SPACING_PADDING_M = 0.45;
const ROW_LABEL_GAP_M = 1.25;
const CROP_RADIUS_M = 0.35;
const CROP_SPACING_PADDING_M = 0.1;
const CROP_SPACING_LABEL_GAP_M = 0.3;

/**
 * Pixel sizes for the hover-overlay shape markers. Tuned to match the spacing
 * labels visually.
 */
const HOVER_SHAPE_RADIUS_PX = 12;
const ROW_ARRROW_SHAPE_RADIUS_PX = 9;

/**
 * Hover-overlay shapes for the editor's spacing interactivity. We render them
 * via `L.shapeMarker` (from `leaflet-svg-shape-markers`) so we get crisp SVG
 * with fillColor/color controlled by Leaflet path options.
 */
function DiamondMarker({
  latLng,
  onClick,
  onMouseOver,
  onMouseOut,
}: {
  latLng: L.LatLngExpression;
  onClick?: () => void;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
}) {
  const map = useMap();
  return (
    <ShapeMarkerLayer
      shape="diamond"
      latLng={latLng}
      radiusPx={HOVER_SHAPE_RADIUS_PX}
      pathOptions={{ color: "#9aa0a6", fillColor: "#ffffff", fillOpacity: 1, weight: 1 }}
      interactive
      map={map}
      onClick={onClick}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
    />
  );
}

function TriangleDownMarker({
  latLng,
  rotation,
  onClick,
  onMouseOver,
  onMouseOut,
}: {
  latLng: L.LatLngExpression;
  rotation?: number;
  onClick?: () => void;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
}) {
  const map = useMap();
  return (
    <ShapeMarkerLayer
      shape="triangle-down"
      latLng={latLng}
      radiusPx={HOVER_SHAPE_RADIUS_PX}
      rotation={rotation ?? 0}
      pathOptions={{ color: "#9aa0a6", fillColor: "#ffffff", fillOpacity: 1, weight: 1 }}
      interactive
      map={map}
      onClick={onClick}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
    />
  );
}

function TriangleArrowMarker({
  latLng,
  rotation,
  onClick,
}: {
  latLng: L.LatLngExpression;
  rotation: number;
  onClick?: () => void;
}) {
  const map = useMap();
  return (
    <ShapeMarkerLayer
      shape="triangle"
      latLng={latLng}
      radiusPx={ROW_ARRROW_SHAPE_RADIUS_PX}
      rotation={rotation}
      pathOptions={{ color: "#5f6368", fillColor: "#9aa0a6", fillOpacity: 1, weight: 0.5 }}
      interactive
      map={map}
      onClick={onClick}
    />
  );
}

/**
 * Imperative leaflet wrapper around `L.ShapeMarker` (from
 * `leaflet-svg-shape-markers`). React-leaflet doesn't expose a binding for
 * it, so we manage the lifecycle in an effect. The marker extends
 * `L.CircleMarker`, so the path options use the same fields.
 */
function ShapeMarkerLayer({
  shape,
  latLng,
  radiusPx,
  rotation,
  pathOptions,
  interactive,
  map,
  onClick,
  onMouseOver,
  onMouseOut,
}: {
  shape: string;
  latLng: L.LatLngExpression;
  radiusPx: number;
  rotation?: number;
  pathOptions: L.PathOptions;
  interactive: boolean;
  map: L.Map;
  onClick?: () => void;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
}) {
  useEffect(() => {
    const marker = (L as any).shapeMarker(latLng, {
      shape,
      radius: radiusPx,
      rotation: rotation ?? 0,
      ...pathOptions,
      interactive,
    }).addTo(map);
    if (onClick) marker.on('click', onClick);
    if (onMouseOver) marker.on('mouseover', onMouseOver);
    if (onMouseOut) marker.on('mouseout', onMouseOut);
    return () => {
      marker.off();
      if (map.hasLayer(marker)) map.removeLayer(marker);
    };
  }, [map, shape, latLng, radiusPx, rotation, pathOptions, interactive, onClick, onMouseOver, onMouseOut]);
  return null;
}

/**
 * Circle-with-plus-icon hover marker. Rendered as a `Marker` with a custom
 * `divIcon` so the plus is crisp at any zoom.
 */
function CirclePlusMarker({
  latLng,
  onClick,
}: {
  latLng: L.LatLngExpression;
  onClick?: () => void;
}) {
  const icon = L.divIcon({
    className: 'pattern-preview-circle-plus',
    html: `<div class="pattern-preview-circle-plus__inner"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#5f6368" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>`,
    iconSize: [HOVER_SHAPE_RADIUS_PX * 2, HOVER_SHAPE_RADIUS_PX * 2],
    iconAnchor: [HOVER_SHAPE_RADIUS_PX, HOVER_SHAPE_RADIUS_PX],
  });
  return (
    <Marker
      position={latLng}
      icon={icon}
      interactive
      keyboard={false}
      eventHandlers={{
        click: onClick,
      }}
    />
  );
}

const BACKGROUND_COLOR = "#fafafa";
const TEXT_COLOR = "var(--mantine-color-dark-7)";
const TEXT_REP_COLOR = "var(--mantine-color-gray-6)";
const SPACING_COLOR = "var(--mantine-color-gray-7)";
const SPACING_REP_COLOR = "var(--mantine-color-gray-6)";

/**
 * Formats a metre distance for axis labels, falling back to centimetres when
 * the value is sub-metre (so 0.5m reads "50 cm").
 */
function formatLengthM(m: number): string {
  if (Math.abs(m) < 1) {
    const cm = Math.round(m * 100);
    return `${cm} cm`;
  }
  return `${m} m`;
}

/**
 * Pure layout: maps pattern rows into SVG-ready geometry. Working in metres
 * (treated as SVG units).
 */
function buildPreviewGeometry(pattern: CroppingPatternReadData) {
  const rows = pattern.rows;

  let xCursorM = PATTERN_LEFT_PADDING_M;

  const rowLayouts = [];
  const layoutsCount = rows.length + 1;

  for (let i = 0; i < layoutsCount; i++) {
    const row = rows[i % rows.length];
    const rowXM = xCursorM;
    const rowLengthM = row.crops.reduce(
      (sum, crop) => sum + crop.distanceToNextCropM,
      0
    ) + row.cropsOffsetM;

    rowLayouts.push({ row, rowXM, rowLengthM });
    xCursorM += row.distanceToNextRowM;
  }

  const totalXM = (xCursorM - rows[0].distanceToNextRowM) + PATTERN_RIGHT_PADDING_M;
  const longestRowLengthM = Math.max(
    0,
    ...rowLayouts.map(r => r.rowLengthM)
  );
  const totalYM = PATTERN_TOP_PADDING_M + ROW_LABEL_GAP_M + longestRowLengthM + PATTERN_BOTTOM_PADDING_M;

  return { rowLayouts, longestRowLengthM, totalXM, totalYM };
}

export interface RenderedCrop {
  crop: PatternCrop;
  rowIndex: number;
  cropIndex: number;
  cropXM: number;
  cropYM: number;
  spacingXM: number;
  spacingStartYM: number;
  spacingEndYM: number;
  spacingLengthM: number;
  spacingLabel: string;
  isRep: boolean;
}

export interface RenderedRow {
  rowIndex: number;
  rowXM: number;
  rowStartYM: number;
  rowEndYM: number;
  rowLengthM: number;
  rowStartOffsetM: number;
  spacingYM: number;
  spacingStartXM: number;
  spacingEndXM: number;
  spacingLengthM: number;
  spacingLabel: string;
  crops: RenderedCrop[];
  isRep: boolean;
}

export function renderRows(
  pattern: CroppingPatternReadData
): { rows: RenderedRow[]; totalXM: number; totalYM: number } {
  const { rowLayouts, longestRowLengthM, totalXM, totalYM } = buildPreviewGeometry(pattern);

  const rows: RenderedRow[] = rowLayouts.map(({ row, rowXM, rowLengthM }, i) => {
    const isRepeatingRow = i >= pattern.rows.length;

    const rowIndex = i % pattern.rows.length;
    const rowStartYM = PATTERN_TOP_PADDING_M;
    const rowEndYM = rowStartYM + rowLengthM;
    const spacingYM = rowStartYM;
    const spacingLengthM = row.distanceToNextRowM;
    const spacingStartXM = rowXM;
    const spacingEndXM = rowXM + spacingLengthM;

    const crops: RenderedCrop[] = [];
    const cropSequenceLengthM = rowStartYM + longestRowLengthM;

    let j = 0;
    let cropYM = rowStartYM + row.cropsOffsetM;
    while (cropYM <= cropSequenceLengthM) {
      const isRepeatingCrop = j >= row.crops.length;

      const cropIndex = j % row.crops.length;
      const crop = row.crops[cropIndex];
      crops.push({
        rowIndex,
        crop,
        cropIndex,
        cropXM: rowXM,
        cropYM: cropYM,
        spacingXM: rowXM,
        spacingStartYM: cropYM,
        spacingEndYM: cropYM + crop.distanceToNextCropM,
        spacingLengthM: crop.distanceToNextCropM,
        spacingLabel: formatLengthM(crop.distanceToNextCropM),
        isRep: isRepeatingRow || isRepeatingCrop,
      });

      j += 1;
      cropYM += crop.distanceToNextCropM;
    }

    return {
      rowIndex,
      rowXM,
      rowStartYM,
      rowEndYM,
      rowLengthM,
      rowStartOffsetM: row.cropsOffsetM,
      spacingYM,
      spacingStartXM,
      spacingEndXM,
      spacingLengthM,
      spacingLabel: formatLengthM(row.distanceToNextRowM),
      crops,
      isRep: isRepeatingRow,
    };
  });

  return { rows, totalXM, totalYM };
}

/**
 * Coordinates of a crop in the rendered layout, used by the editor to address
 * a specific crop by position rather than by plant.
 */
export interface SelectedPosition {
  rowIndex: number;
  cropIndex: number;
}

export interface WritingPatternPreviewPanelProps {
  /**
   * A synthetic `CroppingPatternReadData` assembled by the editor — array
   * index encodes `position`. Passed-in so the geometry layer can read plant
   * `colorHex`/`acceptedTaxonName` directly without a separate lookup map.
   */
  pattern: CroppingPatternReadData;
  /** Crop currently selected (by position) in the side panel. */
  selectedPosition: SelectedPosition | null;
  /** Called when the user clicks a crop. */
  onCropSelect: (position: SelectedPosition) => void;
  /** Called when the user clicks the body of a row. */
  onRowSelect: (rowIndex: number) => void;
  /** Called when the user clicks the (always-visible) row-arrange arrows. */
  onRowMoveLeft?: (rowIndex: number) => void;
  onRowMoveRight?: (rowIndex: number) => void;
  /** Called when the user clicks the plus-icon at the end of a row of crops. */
  onAddCropAtEnd?: (rowIndex: number) => void;
  /** Called when the user clicks the plus-icon after the last row of the pattern. */
  onAddRow?: () => void;
  /** Called when the user clicks a plus-icon between two existing crops. */
  onAddCropBetween?: (rowIndex: number, afterCropIndex: number) => void;
  /** Called when the user clicks a plus-icon next to a row start-offset line. */
  onAddFirstCrop?: (rowIndex: number) => void;
  /** Called when the user clicks a crop-spacing diamond (edit length). */
  onEditCropSpacing?: (rowIndex: number, cropIndex: number) => void;
  /** Called when the user clicks a row-spacing diamond (edit length). */
  onEditRowSpacing?: (rowIndex: number) => void;
  /** Called when the user clicks a row-offset triangle (edit length). */
  onEditRowOffset?: (rowIndex: number) => void;
  /** Called when the user clicks the empty-offset triangle (set offset). */
  onSetRowOffset?: (rowIndex: number) => void;
  /**
   * If set, the geometry renders a dashed pending crop at this position. The
   * form has not yet recorded a plant for it; the user must pick one. Cleared
   * by any other selection.
   */
  pendingCrop?: { rowIndex: number; cropIndex: number } | null;
  /**
   * If set, a single dashed pending crop is rendered as the entire new row.
   */
  pendingRowIndex?: number | null;
}

/**
 * Interactive preview used by `CroppingPatternEdit`. Renders the same geometry
 * as the read-only `PatternPreviewPanel`, but with per-position crop selection
 * (keyed by row/crop index instead of `acceptedTaxonName`) and (in subsequent
 * steps) hover overlays, row-arrange arrows, plus-icons, and dashed pending
 * circles.
 */
export function WritingPatternPreviewPanel({
  pattern,
  selectedPosition,
  onCropSelect,
  onRowSelect,
  onRowMoveLeft,
  onRowMoveRight,
  onAddCropAtEnd,
  onAddRow,
  onAddCropBetween,
  onAddFirstCrop,
  onEditCropSpacing,
  onEditRowSpacing,
  onEditRowOffset,
  onSetRowOffset,
  pendingCrop = null,
  pendingRowIndex = null,
}: WritingPatternPreviewPanelProps) {
  const [showReps, setShowReps] = useState(false);

  const { rows: rendered, totalXM, totalYM } = useMemo(
    () => renderRows(pattern),
    [pattern]
  );

  const bounds = useMemo(() => L.latLngBounds(
    [[0, 0], [totalYM, totalXM]]
  ), [totalYM, totalXM]);

  const rowToPreviewY = (yM: number) => totalYM - yM;

  // Re-derive "selected" by position, not by taxon name.
  const selectedRenderedCrop = selectedPosition
    ? rendered
        .find(r => r.rowIndex === selectedPosition.rowIndex)
        ?.crops.find(c => c.cropIndex === selectedPosition.cropIndex) ?? null
    : null;

  const rowLabelIcon = (label: string, anchor: [number, number], isRep?: boolean) =>
    L.divIcon({
      className: isRep ?
        "pattern-preview-label pattern-preview-label--row--rep" :
        "pattern-preview-label pattern-preview-label--row",
      html: `<div class="pattern-preview-label__inner">${label}</div>`,
      iconAnchor: anchor,
    });

  /**
   * Renders a row's label with permanent left/right arrow triangles that swap
   * the row's position with its neighbour. Triangles are drawn via
   * `TriangleArrowMarker` (a `L.shapeMarker` rotated triangle).
   */
  const renderRowLabel = (r: RenderedRow, i: number) => {
    if (r.isRep && !showReps) return null;

    const row = pattern.rows[r.rowIndex];
    const labelText = `Linha ${row.position ?? r.rowIndex + 1}`;
    const labelY = r.rowStartYM - ROW_LABEL_GAP_M;
    const arrowsLat = rowToPreviewY(labelY - ROW_LABEL_GAP_M/3);
    const hasLeft = i > 0 && onRowMoveLeft !== undefined;
    const hasRight = i < rendered.length - 1 && onRowMoveRight !== undefined;

    return (
      <Fragment key={`row-label-fragment-${i}`}>
        <Marker
          key={`row-label-${i}`}
          position={[rowToPreviewY(labelY), r.rowXM]}
          icon={rowLabelIcon(labelText, [20, 0], r.isRep)}
          interactive={true}
          keyboard={false}
          eventHandlers={{
            click: () => onRowSelect(r.rowIndex),
          }}
        />
        {hasLeft && (
          <TriangleArrowMarker
            key={`row-arrow-left-${i}`}
            latLng={[arrowsLat, r.rowXM - ROW_ARROW_SHAPE_GAP_M]}
            rotation={-90}
            onClick={() => onRowMoveLeft?.(r.rowIndex)}
          />
        )}
        {hasRight && (
          <TriangleArrowMarker
            key={`row-arrow-right-${i}`}
            latLng={[arrowsLat, r.rowXM + ROW_ARROW_SHAPE_GAP_M]}
            rotation={90}
            onClick={() => onRowMoveRight?.(r.rowIndex)}
          />
        )}
      </Fragment>
    );
  };

  /**
   * Renders a single row's geometry: the start-offset line (or empty-offset
   * hover icons), crop spacings (with hover overlays) and crop circles (or
   * pending dashed circle). Crops are clickable per position.
   */
  const renderRowGeometry = (r: RenderedRow, i: number) => {
    if (r.isRep && !showReps) return null;

    const offsetLineStartYM = r.rowStartYM;
    const offsetLineEndYM = r.rowStartYM + r.rowStartOffsetM - CROP_RADIUS_M;
    const firstCropYM = r.crops[0]?.cropYM ?? r.rowStartYM;
    const isPendingRow = pendingRowIndex !== null && pendingRowIndex === r.rowIndex;

    return (
      <Fragment key={`row-fragment-${i}`}>
        {r.rowStartOffsetM > 0 && (
          <RowOffsetHoverGroup
            startYM={offsetLineStartYM}
            endYM={offsetLineEndYM}
            xM={r.rowXM}
            labelText={formatLengthM(r.rowStartOffsetM)}
            onEditSpacing={() => onEditRowOffset?.(r.rowIndex)}
            onAddFirstCrop={() => onAddFirstCrop?.(r.rowIndex)}
            rowToPreviewY={rowToPreviewY}
          />
        )}
        {r.rowStartOffsetM === 0 && !r.isRep && r.crops.length > 0 && (
          <EmptyStartOffsetMarkers
            firstCropYM={firstCropYM}
            rowXM={r.rowXM}
            onSetOffset={() => onSetRowOffset?.(r.rowIndex)}
            onAddFirstCrop={() => onAddFirstCrop?.(r.rowIndex)}
            rowToPreviewY={rowToPreviewY}
          />
        )}

        {r.crops.slice(0, -1).map((c, j) => {
          if (c.isRep && !showReps) return null;
          if (c.isRep) return null;
          return (
            <CropSpacingHoverGroup
              key={`cs-${i}-${j}`}
              startYM={c.spacingStartYM}
              endYM={c.spacingEndYM}
              xM={c.spacingXM}
              labelText={c.spacingLabel}
              labelAnchorX={CROP_SPACING_LABEL_GAP_M}
              onEditSpacing={() => onEditCropSpacing?.(r.rowIndex, c.cropIndex)}
              onAddCropBetween={() => onAddCropBetween?.(r.rowIndex, c.cropIndex)}
              rowToPreviewY={rowToPreviewY}
            />
          );
        })}

        {r.crops.map((c, j) => {
          const isPendingHere = pendingCrop
            ? pendingCrop.rowIndex === r.rowIndex && pendingCrop.cropIndex === c.cropIndex
            : isPendingRow && j === 0;
          if (c.isRep && !showReps && !isPendingHere) return null;
          const isSelected = selectedRenderedCrop
            ? selectedRenderedCrop.cropIndex === c.cropIndex &&
              selectedRenderedCrop.rowIndex === r.rowIndex
            : false;
          if (isPendingHere) {
            return (
              <Fragment key={`crop-fragment-${i}-${j}`}>
                <CircleMarker
                  key={`pending-crop-${i}-${j}`}
                  center={[rowToPreviewY(c.cropYM), c.cropXM]}
                  radius={CROP_RADIUS_M * PX_PER_M}
                  pathOptions={{
                    color: '#5f6368',
                    weight: 1.5,
                    dashArray: '4 4',
                    fillColor: '#ffffff',
                    fillOpacity: 1,
                  }}
                />
              </Fragment>
            );
          }
          return (
            <Fragment key={`crop-fragment-${i}-${j}`}>
              <CircleMarker
                key={`crop-${i}-${j}`}
                center={[rowToPreviewY(c.cropYM), c.cropXM]}
                radius={CROP_RADIUS_M * PX_PER_M}
                pathOptions={{
                  color: TEXT_COLOR,
                  weight: isSelected ? 2 : (c.isRep ? 0.85 : 0.75),
                  dashArray: c.isRep ? "3 3" : undefined,
                  fillColor: c.crop.plant.colorHex,
                  fillOpacity: 1,
                }}
                eventHandlers={{
                  click: () => onCropSelect({ rowIndex: c.rowIndex, cropIndex: c.cropIndex }),
                }}
              >
                <LeafletTooltip direction="top" offset={[0, -4]}>
                  <PlantFullNameLabel fw="bold" plant={c.crop.plant} />
                </LeafletTooltip>
              </CircleMarker>
            </Fragment>
          );
        })}

        {/* Plus-icon at the end of the last non-rep crop. */}
        {!r.isRep && r.crops.length > 0 && (
          <CirclePlusMarker
            latLng={[rowToPreviewY(r.crops[r.crops.length - 1].cropYM), r.rowXM]}
            onClick={() => onAddCropAtEnd?.(r.rowIndex)}
          />
        )}
      </Fragment>
    );
  };

  /**
   * Plus-icon after the last row's geometry, used to add a new row.
   * Placed at the right of the last row's end-of-crops plus-icon.
   */
  const lastRow = rendered.length > 0 ? rendered[rendered.length - 1] : null;
  const lastRowEndXM = lastRow ? lastRow.rowXM + (lastRow.crops.length > 0 ? CROP_RADIUS_M * 3 : 0) : totalXM;

  return (
    <>
    <PreviewLabelStyles />
    <MapContainer
      crs={L.CRS.Simple}
      bounds={bounds}
      style={{
        height: "100%",
        width: "100%",
        background: BACKGROUND_COLOR,
      }}
      zoomControl={true}
      scrollWheelZoom={true}
      attributionControl={false}
      zoomSnap={0.5}
      zoomDelta={0.5}
      minZoom={4.5}
      maxZoom={8}
    >
      <MapBoundsFraming bounds={bounds} maxZoom={8} padding={0} deps={[bounds]} />

      <PreviewBoundsSizer />

      <LeafletStyleButtonControl
        position="topright"
        size="xs"
        label={showReps ? "Ocultar repetições" : "Mostrar repetições"}
        onClick={() => setShowReps(v => !v)}
      >
        {showReps ?
        <IconEyeOff color="var(--mantine-color-gray-8)" /> :
        <IconEye color="var(--mantine-color-gray-8)" />}
      </LeafletStyleButtonControl>

      {rendered.map((r, i) => renderRowLabel(r, i))}

      {rendered.map((r, i) => renderRowGeometry(r, i))}

      {rendered.slice(0, -1).map((r, i) => (
        <RowSpacingHoverGroup
          key={`rs-${i}`}
          yM={r.spacingYM}
          startXM={r.spacingStartXM}
          endXM={r.spacingEndXM}
          labelText={r.spacingLabel}
          onEditSpacing={() => onEditRowSpacing?.(r.rowIndex)}
          onAddRow={() => onAddRow?.()}
          rowToPreviewY={rowToPreviewY}
        />
      ))}

      {lastRow && onAddRow && (
        <CirclePlusMarker
          latLng={[rowToPreviewY(lastRow.rowStartYM), lastRowEndXM]}
          onClick={() => onAddRow()}
        />
      )}
    </MapContainer>
    </>
  );
}

/**
 * Forces the Leaflet map to recompute its size whenever its parent might have
 * changed (e.g. modal scrolling, panel resizes). Without this, the map can
 * render with the wrong projection after layout shifts.
 */
/**
 * Renders a vertical spacing line + its label + hover overlays for the
 * writing-mode editor. Hovering the label reveals a diamond around it
 * (click → onEditSpacing) and a circle+plus to its right (click →
 * onAddCropBetween).
 */
function CropSpacingHoverGroup({
  startYM,
  endYM,
  xM,
  labelText,
  labelAnchorX,
  onEditSpacing,
  onAddCropBetween,
  rowToPreviewY,
}: {
  startYM: number;
  endYM: number;
  xM: number;
  labelText: string;
  labelAnchorX: number;
  onEditSpacing: () => void;
  onAddCropBetween: () => void;
  rowToPreviewY: (yM: number) => number;
}) {
  const [hovered, setHovered] = useState(false);
  const labelLatLng: L.LatLngExpression = [
    rowToPreviewY((startYM + endYM) / 2),
    xM - labelAnchorX,
  ];
  const diamondLatLng: L.LatLngExpression = labelLatLng;
  const circlePlusLatLng: L.LatLngExpression = [
    rowToPreviewY((startYM + endYM) / 2),
    xM + labelAnchorX,
  ];

  const spacingLabelIcon = L.divIcon({
    className: 'pattern-preview-label pattern-preview-label--spacing',
    html: `<div class="pattern-preview-label__inner">${labelText}</div>`,
    iconAnchor: [10, 6],
  });

  return (
    <FeatureGroup>
      <ArrowPolyline
        positions={[
          [rowToPreviewY(startYM + CROP_SPACING_PADDING_M + CROP_RADIUS_M), xM],
          [rowToPreviewY(endYM - CROP_SPACING_PADDING_M - CROP_RADIUS_M), xM],
        ]}
        pathOptions={{ color: SPACING_COLOR, weight: 1 }}
      />
      <Marker
        position={labelLatLng}
        icon={spacingLabelIcon}
        interactive
        keyboard={false}
        eventHandlers={{
          mouseover: () => setHovered(true),
          mouseout: () => setHovered(false),
        }}
      />
      {hovered && (
        <>
          <DiamondMarker
            latLng={diamondLatLng}
            onClick={onEditSpacing}
            onMouseOver={() => setHovered(true)}
            onMouseOut={() => setHovered(false)}
          />
          <CirclePlusMarker
            latLng={circlePlusLatLng}
            onClick={onAddCropBetween}
          />
        </>
      )}
    </FeatureGroup>
  );
}

/**
 * Renders a horizontal row-spacing line + its label + hover overlays for the
 * writing-mode editor. Hovering the label reveals a diamond around it
 * (click → onEditSpacing) and a circle+plus below it (click → onAddRow).
 */
function RowSpacingHoverGroup({
  yM,
  startXM,
  endXM,
  labelText,
  onEditSpacing,
  onAddRow,
  rowToPreviewY,
}: {
  yM: number;
  startXM: number;
  endXM: number;
  labelText: string;
  onEditSpacing: () => void;
  onAddRow: () => void;
  rowToPreviewY: (yM: number) => number;
}) {
  const [hovered, setHovered] = useState(false);
  const labelLatLng: L.LatLngExpression = [
    rowToPreviewY(yM - CROP_SPACING_LABEL_GAP_M),
    (startXM + endXM) / 2,
  ];

  const spacingLabelIcon = L.divIcon({
    className: 'pattern-preview-label pattern-preview-label--spacing',
    html: `<div class="pattern-preview-label__inner">${labelText}</div>`,
    iconAnchor: [10, 6],
  });

  return (
    <FeatureGroup>
      <ArrowPolyline
        positions={[
          [rowToPreviewY(yM), startXM + ROW_SPACING_PADDING_M],
          [rowToPreviewY(yM), endXM - ROW_SPACING_PADDING_M],
        ]}
        pathOptions={{ color: SPACING_COLOR, weight: 1 }}
      />
      <Marker
        position={labelLatLng}
        icon={spacingLabelIcon}
        interactive
        keyboard={false}
        eventHandlers={{
          mouseover: () => setHovered(true),
          mouseout: () => setHovered(false),
        }}
      />
      {hovered && (
        <>
          <DiamondMarker
            latLng={labelLatLng}
            onClick={onEditSpacing}
            onMouseOver={() => setHovered(true)}
            onMouseOut={() => setHovered(false)}
          />
          <CirclePlusMarker
            latLng={[rowToPreviewY(yM), (startXM + endXM) / 2]}
            onClick={onAddRow}
          />
        </>
      )}
    </FeatureGroup>
  );
}

/**
 * Hover group for a row start-offset line. Shows a downward triangle around
 * the label and a circle+plus to the right (next to where the first crop
 * would be). Used both when the offset exists (label is visible) and when it
 * doesn't (label absent — see `EmptyStartOffsetHover`).
 */
function RowOffsetHoverGroup({
  startYM,
  endYM,
  xM,
  labelText,
  onEditSpacing,
  onAddFirstCrop,
  rowToPreviewY,
}: {
  startYM: number;
  endYM: number;
  xM: number;
  labelText: string;
  onEditSpacing: () => void;
  onAddFirstCrop: () => void;
  rowToPreviewY: (yM: number) => number;
}) {
  const [hovered, setHovered] = useState(false);
  const labelLatLng: L.LatLngExpression = [
    rowToPreviewY((startYM + endYM) / 2),
    xM - ROW_START_OFFSET_LABEL_GAP_M,
  ];
  const triangleLatLng: L.LatLngExpression = labelLatLng;
  const circlePlusLatLng: L.LatLngExpression = [
    rowToPreviewY((startYM + endYM) / 2),
    xM + ROW_START_OFFSET_LABEL_GAP_M,
  ];

  const spacingLabelIcon = L.divIcon({
    className: 'pattern-preview-label pattern-preview-label--spacing',
    html: `<div class="pattern-preview-label__inner">${labelText}</div>`,
    iconAnchor: [14, 8],
  });

  return (
    <FeatureGroup>
      <ArrowPolyline
        positions={[
          [rowToPreviewY(startYM), xM],
          [rowToPreviewY(endYM), xM],
        ]}
        pathOptions={{ color: SPACING_COLOR, weight: 1 }}
        backHead={false}
      />
      <Marker
        position={labelLatLng}
        icon={spacingLabelIcon}
        interactive
        keyboard={false}
        eventHandlers={{
          mouseover: () => setHovered(true),
          mouseout: () => setHovered(false),
        }}
      />
      {hovered && (
        <>
          <TriangleDownMarker
            latLng={triangleLatLng}
            onClick={onEditSpacing}
            onMouseOver={() => setHovered(true)}
            onMouseOut={() => setHovered(false)}
          />
          <CirclePlusMarker
            latLng={circlePlusLatLng}
            onClick={onAddFirstCrop}
          />
        </>
      )}
    </FeatureGroup>
  );
}

/**
 * When a row has no start-offset (`cropsOffsetM === 0`), reveal triangle +
 * circle+plus icons between the row label and the first crop on hover.
 * Click triangle → set offset; click circle+plus → add a new first crop.
 */
function EmptyStartOffsetMarkers({
  firstCropYM,
  rowXM,
  onSetOffset,
  onAddFirstCrop,
  rowToPreviewY,
}: {
  firstCropYM: number;
  rowXM: number;
  onSetOffset: () => void;
  onAddFirstCrop: () => void;
  rowToPreviewY: (yM: number) => number;
}) {
  const [hovered, setHovered] = useState(false);

  const midYM = firstCropYM / 2;
  const anchorLatLng: L.LatLngExpression = [rowToPreviewY(midYM), rowXM];
  const triangleLatLng: L.LatLngExpression = [
    rowToPreviewY(midYM),
    rowXM - ROW_START_OFFSET_LABEL_GAP_M,
  ];
  const circlePlusLatLng: L.LatLngExpression = [
    rowToPreviewY(midYM),
    rowXM + ROW_START_OFFSET_LABEL_GAP_M,
  ];

  return (
    <FeatureGroup>
      <CircleMarker
        center={anchorLatLng}
        radius={12}
        pathOptions={{ fillOpacity: 0, stroke: false, interactive: true }}
        eventHandlers={{
          mouseover: () => setHovered(true),
          mouseout: () => setHovered(false),
        }}
      />
      {hovered && (
        <>
          <TriangleDownMarker
            latLng={triangleLatLng}
            onClick={onSetOffset}
            onMouseOver={() => setHovered(true)}
            onMouseOut={() => setHovered(false)}
          />
          <CirclePlusMarker
            latLng={circlePlusLatLng}
            onClick={onAddFirstCrop}
          />
        </>
      )}
    </FeatureGroup>
  );
}

function PreviewBoundsSizer() {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    invalidate();
    window.addEventListener("resize", invalidate);
    return () => window.removeEventListener("resize", invalidate);
  }, [map]);
  return null;
}

function PreviewLabelStyles() {
  return (
    <style>{`
      .pattern-preview-label .pattern-preview-label__inner {
        white-space: nowrap;
        user-select: none;
        line-height: 1.2;
        font-size: 12px;
        background-color: ${BACKGROUND_COLOR};
      }
      .pattern-preview-label--row .pattern-preview-label__inner {
        font-weight: 600;
        color: ${TEXT_COLOR};
      }
      .pattern-preview-label--row--rep .pattern-preview-label__inner {
        font-weight: 600;
        color: ${TEXT_REP_COLOR};
      }
      .pattern-preview-label--spacing .pattern-preview-label__inner {
        color: ${SPACING_COLOR};
      }
      .pattern-preview-label--spacing--rep .pattern-preview-label__inner {
        color: ${SPACING_REP_COLOR};
      }
      .pattern-preview-circle-plus__inner {
        width: ${HOVER_SHAPE_RADIUS_PX * 2}px;
        height: ${HOVER_SHAPE_RADIUS_PX * 2}px;
        border-radius: 50%;
        background: ${BACKGROUND_COLOR};
        border: 1px solid #9aa0a6;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
    `}</style>
  );
}
