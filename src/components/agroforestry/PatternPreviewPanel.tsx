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
  Polygon,
} from "react-leaflet";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { CroppingPatternReadData, PatternCrop } from "../../apis/agroforestry";
import { PlantReadData } from "../../apis/catalog";
import { PlantFullNameLabel } from "../catalog";
import { MapBoundsFraming, ArrowPolyline, LeafletStyleButtonControl } from ".";
import { getBBox } from "../../utils/agroforestry";

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
const CROP_SPACING_LABEL_GAP_M = 0.4;

/**
 * Sizes for the hover-overlay shape markers. Tuned to match the spacing
 * labels visually.
 */
const HOVER_SHAPE_RADIUS_PX = 12;
const ROW_ARROW_SHAPE_RADIUS_PX = 5;
const ROW_ARROW_SHAPES_GAP_M = 0.3;

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
      radiusPx={ROW_ARROW_SHAPE_RADIUS_PX}
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
  onMouseOver,
  onMouseOut,
}: {
  latLng: L.LatLngExpression;
  onClick?: () => void;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
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
        mouseover: onMouseOver,
        mouseout: onMouseOut,
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
export function buildPreviewGeometry(pattern: CroppingPatternReadData) {
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

interface RenderedCrop {
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

interface RenderedRow {
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

export interface CropPosition {
  rowIndex: number;
  cropIndex: number;
}

interface SelectedRow {
  type: 'row';
  rowIndex: number;
}

interface SelectedCrop extends CropPosition {
  type: 'crop';
}

interface SelectedRowOffset {
  type: 'spacing';
  rowIndex: number;
}

interface SelectedRowSpacing {
  type: 'spacing';
  afterRowIndex: number;
}

interface SelectedCropSpacing {
  type: 'spacing';
  rowIndex: number;
  afterCropIndex: number;
}

/**
 * Coordinates of a crop in the rendered layout, used by the editor to address
 * a specific crop by position rather than by plant.
 */
export type SelectedElement = SelectedRow | SelectedCrop | SelectedRowOffset | SelectedRowSpacing | SelectedCropSpacing;

interface PatternEditHandlers {
  /** Called when the user clicks the (always-visible) row-arrange arrows. */
  onRowMoveLeft?: (rowIndex: number) => void;
  onRowMoveRight?: (rowIndex: number) => void;
  /** Called when the user clicks the plus-icon after the last row of the pattern. */
  onAddRowLast?: () => void;
  /** Called when the user clicks the plus-icon between two existing rows. */
  onAddRowBetween?: (afterRowIndex: number) => void;
  /** Called when the user clicks a plus-icon next to a row start-offset line. */
  onAddCropFirst?: (rowIndex: number) => void;
  /** Called when the user clicks a plus-icon between two existing crops. */
  onAddCropBetween?: (rowIndex: number, afterCropIndex: number) => void;
  /** Called when the user clicks the plus-icon at the end of a row of crops. */
  onAddCropLast?: (rowIndex: number) => void;
  /** Called when the user clicks the empty-offset triangle (set offset). */
  onSetRowOffset?: (rowIndex: number) => void;
  /** Called when the user clicks a row-offset triangle (edit length). */
  onEditRowOffset?: (rowIndex: number) => void;
  /** Called when the user clicks a row-spacing diamond (edit length). */
  onEditRowSpacing?: (rowIndex: number) => void;
  /** Called when the user clicks a crop-spacing diamond (edit length). */
  onEditCropSpacing?: (rowIndex: number, cropIndex: number) => void;
}

interface PatternPreviewPanelProps {
  pattern: CroppingPatternReadData;
  /** Crop or row currently selected (by position) in the side panel. */
  selectedElement: SelectedElement | null;
  /** Called when the user clicks the a row label. */
  onRowSelect: (rowIndex: number) => void;
  /** Called when the user clicks a crop. */
  onCropSelect: (pos: CropPosition) => void;
  edit?: boolean;
  editHandlers?: PatternEditHandlers;
};

/**
 * Map-based preview. We use `L.CRS.Simple` so coordinates are in plain metres
 * with no projection. LatLng is (y, x) for Simple, so we flip y against the
 * total height to keep "y down on screen".
 */
export default function PatternPreviewPanel({
  pattern,
  selectedElement,
  onRowSelect,
  onCropSelect,
  edit = false,
  editHandlers = {},
}: PatternPreviewPanelProps) {
  const [showReps, setShowReps] = useState(!edit);
  
  const { rows, totalXM, totalYM } = useMemo(
    () => renderRows(pattern),
    [pattern]
  );
  const bounds = useMemo(() => L.latLngBounds(
    [[0, 0], [totalYM, totalXM]]
  ), [totalYM, totalXM]);

  const rowYToLat = (yM: number) => totalYM - yM;

  const {
    onRowMoveLeft,
    onRowMoveRight,
    onAddRowBetween,
    onEditRowSpacing,
  } = editHandlers;

  const rowLabelIcon = (label: string, anchor: [number, number], isRep?: boolean) =>
    L.divIcon({
      className: isRep ?
        "pattern-preview-label pattern-preview-label--row--rep" :
        "pattern-preview-label pattern-preview-label--row",
      html: `<div class="pattern-preview-label__inner">${label}</div>`,
      iconAnchor: anchor,
    });
  const spacingLabelIcon = (label: string, anchor: [number, number], isRep?: boolean) =>
    L.divIcon({
      className: isRep ?
        "pattern-preview-label pattern-preview-label--spacing--rep" :
        "pattern-preview-label pattern-preview-label--spacing",
      html: `<div class="pattern-preview-label__inner">${label}</div>`,
      iconAnchor: anchor,
    });

  const nonRepRows = rows.filter(r => !r.isRep);
  
  /**
   * Renders a row's label with permanent left/right arrow triangles that swap
   * the row's position with its neighbour. Triangles are drawn via
   * `TriangleArrowMarker` (a `L.shapeMarker` rotated triangle).
   */
  const renderRowLabel = (r: RenderedRow, i: number) => {
    if (r.isRep && !showReps) return null;

    const row = pattern.rows[r.rowIndex];
    const labelText = `Linha ${row.position}`;
    const labelY = r.rowStartYM - ROW_LABEL_GAP_M;

    const hasLeft = i > 0 && onRowMoveLeft !== undefined;
    const hasRight = i < (nonRepRows.length - 1) && onRowMoveRight !== undefined;
    const arrowsLat = rowYToLat(labelY - ROW_LABEL_GAP_M/3);
    
    const leftArrow = edit && !r.isRep && hasLeft && (
      <TriangleArrowMarker
        key={`row-arrow-left-${i}`}
        latLng={[arrowsLat, r.rowXM - ROW_ARROW_SHAPES_GAP_M]}
        rotation={-90}
        onClick={() => onRowMoveLeft?.(r.rowIndex)}
      />
    );
    const rightArrow = edit && !r.isRep && hasRight && (
      <TriangleArrowMarker
        key={`row-arrow-right-${i}`}
        latLng={[arrowsLat, r.rowXM + ROW_ARROW_SHAPES_GAP_M]}
        rotation={90}
        onClick={() => onRowMoveRight?.(r.rowIndex)}
      />
    );

    return (
      <Fragment key={`row-label-fragment-${i}`}>
        <Marker
          key={`row-label-${i}`}
          position={[rowYToLat(labelY), r.rowXM]}
          icon={rowLabelIcon(labelText, [20, 0], r.isRep)}
          interactive={true}
          keyboard={false}
          eventHandlers={{
            click: () => onRowSelect(r.rowIndex),
          }}
        />
        {leftArrow}
        {rightArrow}
      </Fragment>
    );
  };

  return (
    <Fragment>
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

        {/* Row labels at the top */}
        {rows.map((r, i) => renderRowLabel(r, i))}

        {/* Per-row geometry */}
        {rows.map((r, i) => (
          <RowGeometry
            key={`row-geom-${i}`}
            row={r}
            isLastRow={i === rows.length-1}
            selectedElement={selectedElement}
            showReps={showReps}
            edit={edit}
            editHandlers={editHandlers}
            onRowSelect={onRowSelect}
            onCropSelect={onCropSelect}
            rowYToLat={rowYToLat}
          />
        ))}

        {/* Row-to-row spacing lines (horizontal, between adjacent rows) */}
        {rows.slice(0, -1).map((r, i) => (
          <RowSpacing
            key={`rs-${i}`}
            yM={r.spacingYM}
            startXM={r.spacingStartXM}
            endXM={r.spacingEndXM}
            labelIcon={spacingLabelIcon(r.spacingLabel, [10, 6])}
            edit={edit}
            rowYToLat={rowYToLat}
            onEditSpacing={() => onEditRowSpacing?.(r.rowIndex)}
            onAddRow={() => onAddRowBetween?.(r.rowIndex)}
          />
        ))}
      </MapContainer>
    </Fragment>
  );
}

/**
 * Renders a single row's geometry: the start-offset line (or empty-offset
 * hover icons), crop spacings (with hover overlays) and crop circles (or
 * pending dashed circle). Crops are clickable per position.
 */
function RowGeometry({
  row: r,
  selectedElement,
  showReps,
  edit,
  editHandlers,
  onCropSelect,
  rowYToLat,
}: {
  row: RenderedRow;
  isLastRow: boolean;
  selectedElement: SelectedElement | null;
  showReps: boolean;
  edit: boolean;
  editHandlers: PatternEditHandlers;
  onRowSelect: (rowIndex: number) => void;
  onCropSelect: (pos: CropPosition) => void;
  rowYToLat: (yM: number) => number;
}) {
  const [repsHovered, setRepsHovered] = useState(false);
  const {
    onAddRowLast,
    onAddCropFirst,
    onAddCropBetween,
    onAddCropLast,
    onSetRowOffset,
    onEditRowOffset,
    onEditCropSpacing,
  } = editHandlers;

  const isSelectedRow = selectedElement?.type === 'row' && selectedElement.rowIndex === r.rowIndex;
    
  const selectedCrop = selectedElement?.type === 'crop' ? selectedElement : null;

  const spacingLabelIcon = (label: string, anchor: [number, number], isRep?: boolean) =>
    L.divIcon({
      className: isRep ?
        "pattern-preview-label pattern-preview-label--spacing--rep" :
        "pattern-preview-label pattern-preview-label--spacing",
      html: `<div class="pattern-preview-label__inner">${label}</div>`,
      iconAnchor: anchor,
    });

  const repCrops = r.crops.filter(c => c.isRep);
  const nonRepCrops = r.crops.filter(c => !c.isRep);

  const nonRepElements = r.isRep ? null : (
    <Fragment>
      <RowOffset
        startYM={r.rowStartYM}
        endYM={r.rowStartYM + r.rowStartOffsetM}
        xM={r.rowXM}
        labelIcon={spacingLabelIcon(
          formatLengthM(r.rowStartOffsetM),
          [14, 8],
        )}
        edit={edit}
        isRep={r.isRep}
        rowYToLat={rowYToLat}
        onSetOffset={() => onSetRowOffset?.(r.rowIndex)}
        onEditOffset={() => onEditRowOffset?.(r.rowIndex)}
        onAddCrop={() => onAddCropFirst?.(r.rowIndex)}
      />

      {nonRepCrops.map((c, j) => {
        if (c.isRep && !showReps) return null;
        const isSelectedCrop = selectedCrop?.rowIndex === c.rowIndex && selectedCrop?.cropIndex === c.cropIndex;
        return (
          <Crop
            key={`crop-${j}`}
            yM={c.cropYM}
            xM={c.cropXM}
            color={c.crop.plant.colorHex}
            plant={c.crop.plant}
            isRep={c.isRep}
            isSelected={isSelectedRow || isSelectedCrop}
            onCropSelect={() => onCropSelect({ rowIndex: c.rowIndex, cropIndex: c.cropIndex })}
            rowYToLat={rowYToLat}
          />
        );
      })}

      {nonRepCrops.map((c, j) => {
        if (c.isRep && !showReps) return null;
        return (
          <CropSpacing
            key={`cs-${j}`}
            startYM={c.spacingStartYM}
            endYM={c.spacingEndYM}
            xM={c.spacingXM}
            labelIcon={spacingLabelIcon(
              c.spacingLabel,
              [10, 6],
              c.isRep
            )}
            edit={edit}
            isRep={c.isRep}
            rowYToLat={rowYToLat}
            onEditSpacing={() => onEditCropSpacing?.(r.rowIndex, c.cropIndex)}
            onAddCrop={() => onAddCropBetween?.(r.rowIndex, c.cropIndex)}
          />
        );
      })}
    </Fragment>
  );

  const topRepCrop = repCrops[0];
  const botRepCrop = repCrops[repCrops.length-1];
  const repsBounds: L.LatLngExpression[] = [
    [rowYToLat(topRepCrop.cropYM - CROP_RADIUS_M*1.5), topRepCrop.cropXM - CROP_RADIUS_M*1.5],
    [rowYToLat(topRepCrop.cropYM - CROP_RADIUS_M*1.5), topRepCrop.cropXM + CROP_RADIUS_M*1.5],
    [rowYToLat(botRepCrop.cropYM + CROP_RADIUS_M*1.5), botRepCrop.cropXM + CROP_RADIUS_M*1.5],
    [rowYToLat(botRepCrop.cropYM + CROP_RADIUS_M*1.5), botRepCrop.cropXM - CROP_RADIUS_M*1.5],
  ];
  const repElements = (
    <FeatureGroup>
      {edit && 
        <Polygon
          positions={repsBounds}
          pathOptions={{
            fillColor: BACKGROUND_COLOR,
            opacity: 0,
          }}
          eventHandlers={{
            mouseover: () => setRepsHovered(true),
            mouseout: () => setRepsHovered(false),
          }}
        />
      }
      {!repsHovered &&
        <Fragment>
          {r.isRep &&
            <RowOffset
              startYM={r.rowStartYM}
              endYM={r.rowStartYM + r.rowStartOffsetM}
              xM={r.rowXM}
              labelIcon={spacingLabelIcon(
                formatLengthM(r.rowStartOffsetM),
                [14, 8],
              )}
              edit={edit}
              isRep={r.isRep}
              rowYToLat={rowYToLat}
              onSetOffset={() => onSetRowOffset?.(r.rowIndex)}
              onEditOffset={() => onEditRowOffset?.(r.rowIndex)}
              onAddCrop={() => onAddCropFirst?.(r.rowIndex)}
            />
          }

          {repCrops.map((c, j) => {
            if (c.isRep && !showReps) return null;
            const isSelectedCrop = selectedCrop?.rowIndex === c.rowIndex && selectedCrop?.cropIndex === c.cropIndex;
            return (
              <Crop
                key={`crop-${j}`}
                yM={c.cropYM}
                xM={c.cropXM}
                color={c.crop.plant.colorHex}
                plant={c.crop.plant}
                isRep={c.isRep}
                isSelected={isSelectedRow || isSelectedCrop}
                onCropSelect={() => onCropSelect({ rowIndex: c.rowIndex, cropIndex: c.cropIndex })}
                rowYToLat={rowYToLat}
              />
            );
          })}

          {repCrops.slice(0, -1).map((c, j) => {
            if (c.isRep && !showReps) return null;
            return (
              <CropSpacing
                key={`cs-${j}`}
                startYM={c.spacingStartYM}
                endYM={c.spacingEndYM}
                xM={c.spacingXM}
                labelIcon={spacingLabelIcon(
                  c.spacingLabel,
                  [10, 6],
                  c.isRep
                )}
                edit={edit}
                isRep={c.isRep}
                rowYToLat={rowYToLat}
                onEditSpacing={() => onEditCropSpacing?.(r.rowIndex, c.cropIndex)}
                onAddCrop={() => onAddCropBetween?.(r.rowIndex, c.cropIndex)}
              />
            );
          })}
        </Fragment>
      }
    </FeatureGroup>
  )

  const addElements = (
    <Fragment>
      {/* Plus-icon at the end of the last non-rep crop. */}
      {!r.isRep && r.crops.length > 0 && (
        <CirclePlusMarker
          latLng={[rowYToLat(repCrops[0].cropYM), r.rowXM]}
          onClick={() => onAddCropLast?.(r.rowIndex)} // TODO: when clicked, a placeholder crop should show-up
          onMouseOver={() => setRepsHovered(true)}
          onMouseOut={() => setRepsHovered(false)}
        />
      )}
     
      {/**
      * Plus-icon after the last row's geometry, used to add a new row.
      * Placed at the right of the last row's end-of-crops plus-icon.
      */}
      {r.isRep && (
        <CirclePlusMarker
          latLng={[rowYToLat(r.rowStartYM), r.rowXM]}
          onClick={onAddRowLast} // TODO: when clicked, a placeholder row should show-up
          onMouseOver={() => setRepsHovered(true)}
          onMouseOut={() => setRepsHovered(false)}
        />
      )}
    </Fragment>
  )

  return (
    <FeatureGroup>
      {nonRepElements}
      {showReps && repElements}
      {edit && (!showReps || repsHovered) && addElements}
    </FeatureGroup>
  )
}

/**
 * Renders a colored circle marker representing a crop at a specific position.
 */
function Crop({
  yM,
  xM,
  color,
  plant,
  isRep,
  isSelected,
  onCropSelect,
  rowYToLat,
}: {
  yM: number;
  xM: number;
  color: string;
  plant: PlantReadData;
  isRep: boolean;
  isSelected: boolean;
  onCropSelect: () => void;
  rowYToLat: (yM: number) => number;
}) {


  return (
    <CircleMarker
      center={[rowYToLat(yM), xM]}
      radius={CROP_RADIUS_M * PX_PER_M}
      pathOptions={{
        color: TEXT_COLOR,
        weight: isSelected ? 2 : (isRep ? 0.85 : 0.75),
        dashArray: isRep ? "3 3" : undefined,
        fillColor: color,
        fillOpacity: 1,
      }}
      eventHandlers={{
        click: onCropSelect,
      }}
    >
      <LeafletTooltip direction="top" offset={[0, -4]}>
        <PlantFullNameLabel fw="bold" plant={plant} />
      </LeafletTooltip>
    </CircleMarker>
  );  
}

/**
 * Renders a vertical spacing line + its label + hover overlays for the
 * writing-mode editor. Hovering the label reveals a diamond around it
 * (click → onEditSpacing) and a circle+plus to its right (click →
 * onAddCropBetween).
 */
function CropSpacing({
  startYM,
  endYM,
  xM,
  labelIcon,
  edit,
  isRep,
  rowYToLat,
  onEditSpacing,
  onAddCrop,
}: {
  startYM: number;
  endYM: number;
  xM: number;
  labelIcon: L.DivIcon;
  edit: boolean;
  isRep: boolean;
  rowYToLat: (yM: number) => number;
  onEditSpacing: () => void;
  onAddCrop: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const labelLatLng: L.LatLngExpression = [
    rowYToLat((startYM + endYM) / 2),
    xM - CROP_SPACING_LABEL_GAP_M,
  ];

  // TODO: try wraping the FeatureGroup children into a wider shape marker and passing the eventHandlers into it
  return (
    <FeatureGroup>
      <ArrowPolyline
        positions={[
          [rowYToLat(startYM + CROP_SPACING_PADDING_M + CROP_RADIUS_M), xM],
          [rowYToLat(endYM - CROP_SPACING_PADDING_M - CROP_RADIUS_M), xM],
        ]}
        pathOptions={{
          color: SPACING_COLOR,
          weight: 1,
          dashArray: isRep ? "3 3" : undefined,
        }}
        arrowHeadOptions={{
          pathOptions: {
            stroke: isRep,
            dashArray: undefined,
            fillColor: isRep ? BACKGROUND_COLOR : SPACING_COLOR,
          }
        }}
      />
      {!isRep &&
        <Marker
          position={labelLatLng}
          icon={labelIcon}
          interactive={edit}
          keyboard={false}
          eventHandlers={{
            mouseover: () => setHovered(true),
            mouseout: () => setHovered(false),
          }}
        />
      }
      {edit && hovered && (
        <>
          <DiamondMarker
            latLng={labelLatLng}
            onClick={onEditSpacing}
            onMouseOver={() => setHovered(true)}
            onMouseOut={() => setHovered(false)}
          />
          <CirclePlusMarker
            latLng={labelLatLng}
            onClick={onAddCrop}
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
function RowSpacing({
  yM,
  startXM,
  endXM,
  labelIcon,
  edit,
  rowYToLat,
  onEditSpacing,
  onAddRow,
}: {
  yM: number;
  startXM: number;
  endXM: number;
  labelIcon: L.DivIcon;
  edit: boolean;
  rowYToLat: (yM: number) => number;
  onEditSpacing: () => void;
  onAddRow: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const labelLatLng: L.LatLngExpression = [
    rowYToLat(yM - CROP_SPACING_LABEL_GAP_M),
    (startXM + endXM) / 2,
  ];

  return (
    <FeatureGroup>
      <ArrowPolyline
        positions={[
          [rowYToLat(yM), startXM + ROW_SPACING_PADDING_M],
          [rowYToLat(yM), endXM - ROW_SPACING_PADDING_M],
        ]}
        pathOptions={{ color: SPACING_COLOR, weight: 1 }}
      />
      <Marker
        position={labelLatLng}
        icon={labelIcon}
        interactive={edit}
        keyboard={false}
        eventHandlers={{
          mouseover: () => setHovered(true),
          mouseout: () => setHovered(false),
        }}
      />
      {edit && hovered && (
        <>
          <DiamondMarker
            latLng={labelLatLng}
            onClick={onEditSpacing}
            onMouseOver={() => setHovered(true)}
            onMouseOut={() => setHovered(false)}
          />
          <CirclePlusMarker
            latLng={[rowYToLat(yM), (startXM + endXM) / 2]}
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
function RowOffset({
  startYM,
  endYM,
  xM,
  labelIcon,
  edit,
  isRep,
  rowYToLat,
  onSetOffset,
  onEditOffset,
  onAddCrop,
}: {
  startYM: number;
  endYM: number;
  xM: number;
  labelIcon: L.DivIcon;
  edit: boolean;
  isRep: boolean;
  rowYToLat: (yM: number) => number;
  onSetOffset?: () => void;
  onEditOffset?: () => void;
  onAddCrop?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const offsetLength = endYM - startYM;
  const labelLatLng: L.LatLngExpression = [
    rowYToLat((startYM + endYM) / 2),
    xM - ROW_START_OFFSET_LABEL_GAP_M,
  ];

  if (offsetLength === 0 && edit && !isRep)
    return (
      <NullOffsetMarkers
        startYM={startYM}
        xM={xM}
        onSetOffset={onSetOffset}
        onAddCrop={onAddCrop}
        rowYToLat={rowYToLat}
      />
    )

  if (offsetLength > 0)
    return (
      <FeatureGroup>
        <ArrowPolyline
          positions={[
            [rowYToLat(startYM), xM],
            [rowYToLat(endYM - CROP_RADIUS_M), xM],
          ]}
          pathOptions={{
            color: SPACING_COLOR,
            weight: 1,
            dashArray: isRep ? "3 3" : undefined,
          }}
          backHead={false}
          arrowHeadOptions={{
            pathOptions: {
              stroke: isRep,
              dashArray: undefined,
              fillColor: isRep ? BACKGROUND_COLOR : SPACING_COLOR,
            }
          }}
        />
        {!isRep &&
          <Marker
            position={labelLatLng}
            icon={labelIcon}
            interactive={edit}
            keyboard={false}
            eventHandlers={{
              mouseover: () => setHovered(true),
              mouseout: () => setHovered(false),
            }}
          />
        }
        {edit && hovered && (
          <>
            <TriangleDownMarker
              latLng={labelLatLng}
              onClick={onEditOffset}
              onMouseOver={() => setHovered(true)}
              onMouseOut={() => setHovered(false)}
            />
            <CirclePlusMarker
              latLng={labelLatLng}
              onClick={onAddCrop}
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
function NullOffsetMarkers({
  startYM,
  xM,
  onSetOffset,
  onAddCrop,
  rowYToLat,
}: {
  startYM: number;
  xM: number;
  onSetOffset?: () => void;
  onAddCrop?: () => void;
  rowYToLat: (yM: number) => number;
}) {
  const [hovered, setHovered] = useState(false);

  const midYM = startYM / 2;
  const anchorLatLng: L.LatLngExpression = [rowYToLat(midYM), xM];
  const triangleLatLng: L.LatLngExpression = [
    rowYToLat(midYM),
    xM - ROW_START_OFFSET_LABEL_GAP_M,
  ];
  const circlePlusLatLng: L.LatLngExpression = [
    rowYToLat(midYM),
    xM + ROW_START_OFFSET_LABEL_GAP_M,
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
            onClick={onAddCrop}
          />
        </>
      )}
    </FeatureGroup>
  );
}

/**
 * Forces the Leaflet map to recompute its size whenever its parent might have
 * changed (e.g. modal scrolling, panel resizes). Without this, the map can
 * render with the wrong projection after layout shifts.
 */
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
