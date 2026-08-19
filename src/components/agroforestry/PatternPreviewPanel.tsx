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
import { Fragment, PropsWithChildren, ReactNode, useEffect, useMemo, useState } from "react";
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
import { MapBoundsFraming, ArrowPolyline, LeafletStyleButtonControl, ShapeMarker } from ".";
import { BBox } from "../../utils/agroforestry";

const PX_PER_M = 30;
const PATTERN_LEFT_PADDING_M = 1.4;
const PATTERN_BOTTOM_PADDING_M = 0;
const PATTERN_RIGHT_PADDING_M = 1;
const PATTERN_TOP_PADDING_M = 1.5;
const ROW_START_OFFSET_LABEL_GAP_M = 0.4;
const ROW_LABEL_GAP_M = 1.25;
const CROP_RADIUS_M = 0.3;
const CROP_SPACING_LABEL_GAP_M = 0.4;
const SPACING_PADDING_M = 0.1;

/**
 * Sizes for the hover-overlay shape markers. Tuned to match the spacing
 * labels visually.
 */
const ADD_CROP_SHAPE_RADIUS_PX = 11;
const OFFSET_SHAPE_RADIUS_PX = 9;
const SPACING_SHAPE_RADIUS_PX = 8;
const ROW_ARROW_SHAPE_RADIUS_PX = 5;
const ROW_ARROW_SHAPES_GAP_M = 0.4;

const BACKGROUND_COLOR = "#fafafa";
const TEXT_COLOR = "var(--mantine-color-dark-7)";
const TEXT_REP_COLOR = "var(--mantine-color-gray-6)";
const SPACING_COLOR = "var(--mantine-color-gray-7)";
const SPACING_REP_COLOR = "var(--mantine-color-gray-6)";

/**
 * Placeholder plant used in the synthetic `CroppingPatternReadData` while a
 * pending crop has no plant picked. White fill at the marker layer makes the
 * "pending" state visually obvious.
 */
export const PENDING_PLANT: PlantReadData = {
  id: 0,
  contentId: 0,
  contentStatus: 'proposed',
  acceptedTaxonName: '',
  acceptedFamilyName: '',
  mainPopularName: 'Pendente',
  colorHex: '#ffffff',
};

/**
 * Formats a metre distance for axis labels, falling back to centimetres when
 * the value is sub-metre (so 0.5m reads "50 cm").
 */
function formatLengthM(m: number): string {
  const roundIfFloat = (n: number) => Number.isInteger(n) ? n : n.toFixed(2);

  if (Math.abs(m) < 1) {
    const cm = Math.round(m * 100);
    return `${roundIfFloat(cm)} cm`;
  }
  return `${roundIfFloat(m)} m`;
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

/**
 * Calculates start and end edges for a spacing arrow that A) is proportional to spacing length,
 * B) is limited by min and max values and C) prevents a negative distance between arrow heads
 * when spacing length is too small
 */
function calcSpacingArrowEdges({
  spacingStartM,
  spacingEndM,
  minPaddingM = 0,
  maxPaddingM = CROP_RADIUS_M + SPACING_PADDING_M,
}: {
  spacingStartM: number,
  spacingEndM: number,
  minPaddingM?: number,
  maxPaddingM?: number,
}) {
  const spacingLengthM = spacingEndM - spacingStartM;
  const arrowPaddingM = Math.min(
    Math.max(
      minPaddingM,
      (spacingLengthM - CROP_RADIUS_M * 2) / 2
    ),
    maxPaddingM
  );
    
  const arrowStartM = Math.min(spacingStartM + arrowPaddingM, spacingEndM);
  const arrowEndM = Math.max(spacingEndM - arrowPaddingM, spacingStartM);

  return [arrowStartM, arrowEndM];
}

export interface CropPosition {
  rowIndex: number;
  cropIndex: number;
}

interface SelectedCrop extends CropPosition {
  kind: 'crop';
}

interface SelectedRow {
  kind: 'row';
  rowIndex: number;
}

interface SelectedRowOffset {
  kind: 'rowOffset';
  rowIndex: number;
}

interface SelectedRowSpacing {
  kind: 'rowSpacing';
  afterRowIndex: number;
}

interface SelectedCropSpacing {
  kind: 'cropSpacing';
  rowIndex: number;
  afterCropIndex: number;
}

export type SelectedSpacing = SelectedRowOffset | SelectedRowSpacing | SelectedCropSpacing;

/** Coordinates of an element in the rendered layout. */
export type SelectedElement = SelectedRow | SelectedCrop | SelectedSpacing;

export type PendingElement = (SelectedRow | SelectedCrop) & {
  isLast: boolean;
};

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
  /** If set, the geometry renders a dashed pending crop at the position. */
  pendingElement?: PendingElement | null;
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
  pendingElement = null,
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
    const labelYM = r.rowStartYM - ROW_LABEL_GAP_M;

    const hasLeft = i > 0 && onRowMoveLeft !== undefined;
    const hasRight = i < (nonRepRows.length - 1) && onRowMoveRight !== undefined;
    const arrowsYM = labelYM - ROW_LABEL_GAP_M / 3;
    
    const leftArrow = edit && !r.isRep && hasLeft && (
      <TriangleArrowMarker
        key={`row-arrow-left-${i}`}
        latLng={[rowYToLat(arrowsYM), r.rowXM - ROW_ARROW_SHAPES_GAP_M / 2]}
        radiusPx={ROW_ARROW_SHAPE_RADIUS_PX}
        rotation={-90}
        onClick={() => onRowMoveLeft?.(r.rowIndex)}
      />
    );
    const rightArrow = edit && !r.isRep && hasRight && (
      <TriangleArrowMarker
        key={`row-arrow-right-${i}`}
        latLng={[rowYToLat(arrowsYM), r.rowXM + ROW_ARROW_SHAPES_GAP_M / 2]}
        radiusPx={ROW_ARROW_SHAPE_RADIUS_PX}
        rotation={90}
        onClick={() => onRowMoveRight?.(r.rowIndex)}
      />
    );

    return (
      <Fragment key={`row-label-fragment-${i}`}>
        <Marker
          key={`row-label-${i}`}
          position={[rowYToLat(labelYM), r.rowXM]}
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
        minZoom={5}
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
            isSelected={selectedElement?.kind === 'rowSpacing' && selectedElement?.afterRowIndex === r.rowIndex}
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
  const {
    onAddRowLast,
    onAddCropFirst,
    onAddCropBetween,
    onAddCropLast,
    onSetRowOffset,
    onEditRowOffset,
    onEditCropSpacing,
  } = editHandlers;

  const isSelectedRow = selectedElement?.kind === 'row' && selectedElement.rowIndex === r.rowIndex;
  const selectedCrop = selectedElement?.kind === 'crop' ? selectedElement : null;
  const selectedOffset = selectedElement?.kind === 'rowOffset' ? selectedElement : null;
  const selectedSpacing = selectedElement?.kind === 'cropSpacing' ? selectedElement : null;

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
          [10, 6],
        )}
        edit={edit}
        isRep={r.isRep}
        isSelected={selectedOffset?.rowIndex === r.rowIndex}
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
        const isSelectedSpacing = selectedSpacing?.rowIndex === c.rowIndex
          && selectedSpacing?.afterCropIndex === c.cropIndex;
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
            isSelected={isSelectedSpacing}
            rowYToLat={rowYToLat}
            onEditSpacing={() => onEditCropSpacing?.(r.rowIndex, c.cropIndex)}
            onAddCrop={() => onAddCropBetween?.(r.rowIndex, c.cropIndex)}
          />
        );
      })}
    </Fragment>
  );

  const repElements = (
    <Fragment>
      {r.isRep &&
        <RowOffset
          startYM={r.rowStartYM}
          endYM={r.rowStartYM + r.rowStartOffsetM}
          xM={r.rowXM}
          edit={edit}
          isRep={r.isRep}
          isSelected={selectedOffset?.rowIndex === r.rowIndex}
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
        const isSelectedSpacing = selectedSpacing?.rowIndex === c.rowIndex
          && selectedSpacing?.afterCropIndex === c.cropIndex;
        return (
          <CropSpacing
            key={`cs-${j}`}
            startYM={c.spacingStartYM}
            endYM={c.spacingEndYM}
            xM={c.spacingXM}
            edit={edit}
            isRep={c.isRep}
            isSelected={isSelectedSpacing}
            rowYToLat={rowYToLat}
            onEditSpacing={() => onEditCropSpacing?.(r.rowIndex, c.cropIndex)}
            onAddCrop={() => onAddCropBetween?.(r.rowIndex, c.cropIndex)}
          />
        );
      })}
    </Fragment>
  )

  const addElements = (
    <Fragment>
      {/* Plus-icon at the end of the last non-rep crop. */}
      {!r.isRep && r.crops.length > 0 && (
        <CirclePlusMarker
          latLng={[rowYToLat(repCrops[0].cropYM), r.rowXM]}
          radiusPx={ADD_CROP_SHAPE_RADIUS_PX}
          onClick={() => onAddCropLast?.(r.rowIndex)} // TODO: when clicked, a placeholder crop should show-up
        >
          <LeafletTooltip direction="bottom" offset={[0, 6]}>
            Adicionar cultivo (fim)
          </LeafletTooltip>
        </CirclePlusMarker>
      )}
     
      {/**
      * Plus-icon after the last row's geometry, used to add a new row.
      * Placed at the right of the last row's end-of-crops plus-icon.
      */}
      {r.isRep && (
        <CirclePlusMarker
          latLng={[rowYToLat(r.rowStartYM), r.rowXM]}
          radiusPx={ADD_CROP_SHAPE_RADIUS_PX}
          onClick={onAddRowLast} // TODO: when clicked, a placeholder row should show-up
        >
          <LeafletTooltip direction="top" offset={[0, -6]}>
            Adicionar linha
          </LeafletTooltip>
        </CirclePlusMarker>
      )}
    </Fragment>
  )

  const topRepCrop = repCrops[0];
  const botRepCrop = repCrops[repCrops.length-1];
  const repsBBox: BBox = {
    minX: topRepCrop.cropXM - CROP_RADIUS_M,
    maxX: botRepCrop.cropXM + CROP_RADIUS_M,
    minY: rowYToLat(botRepCrop.cropYM + CROP_RADIUS_M),
    maxY: rowYToLat(topRepCrop.cropYM - CROP_RADIUS_M),
  }

  return (
    <FeatureGroup>
      {nonRepElements}
      {edit 
        ? showReps
          ? <ShowOnHoverBox boundingBox={repsBBox} placeholder={repElements}>
              {addElements}
            </ShowOnHoverBox>
          : addElements
        : showReps && repElements
      }
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
  isSelected,
  rowYToLat,
  onEditSpacing,
  onAddCrop,
}: {
  startYM: number;
  endYM: number;
  xM: number;
  labelIcon?: L.DivIcon;
  edit: boolean;
  isRep: boolean;
  isSelected: boolean;
  rowYToLat: (yM: number) => number;
  onEditSpacing: () => void;
  onAddCrop: () => void;
}) {
  const [arrowStartYM, arrowEndYM] = calcSpacingArrowEdges({
    spacingStartM: startYM,
    spacingEndM: endYM,
  });

  const arrowPositions: L.LatLngExpression[] = [
    [rowYToLat(arrowStartYM), xM],
    [rowYToLat(arrowEndYM), xM],
  ];
  const labelLatLng: L.LatLngExpression = [
    rowYToLat((startYM + endYM) / 2),
    xM - CROP_SPACING_LABEL_GAP_M,
  ];
  const addCropLatLng: L.LatLngExpression = [
    rowYToLat((startYM + endYM) / 2),
    xM + CROP_SPACING_LABEL_GAP_M,
  ];

  const diamondRadiusM = SPACING_SHAPE_RADIUS_PX / PX_PER_M;

  const spacingBB: BBox = {
    minX: xM - CROP_SPACING_LABEL_GAP_M - diamondRadiusM,
    maxX: xM + CROP_SPACING_LABEL_GAP_M + CROP_RADIUS_M,
    minY: rowYToLat(arrowStartYM),
    maxY: rowYToLat(arrowEndYM),
  };

  const label = labelIcon && (
    <Marker
      position={labelLatLng}
      icon={labelIcon}
      interactive={false}
      zIndexOffset={1}
    />
  );

  const addCropMarker = (
    <CirclePlusMarker
      latLng={addCropLatLng}
      radiusPx={ADD_CROP_SHAPE_RADIUS_PX}
      onClick={onAddCrop}
    >
      <LeafletTooltip direction="top" offset={[0, -6]}>
        Inserir cultivo
      </LeafletTooltip>
    </CirclePlusMarker>
  );

  return (
    <FeatureGroup>
      <ArrowPolyline
        positions={arrowPositions}
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
      {edit && !isRep
        ? isSelected
          ? (
            <Fragment>
              <DiamondMarker
                latLng={labelLatLng}
                radiusPx={SPACING_SHAPE_RADIUS_PX}
                onClick={onEditSpacing}
              >
                {label}
              </DiamondMarker>
              <ShowOnHoverBox boundingBox={spacingBB}>
                {addCropMarker}
              </ShowOnHoverBox>
            </Fragment>
          ) : (
            <ShowOnHoverBox boundingBox={spacingBB} placeholder={label}>
              <DiamondMarker
                latLng={labelLatLng}
                radiusPx={SPACING_SHAPE_RADIUS_PX}
                onClick={onEditSpacing}
              >
                {label}
                <LeafletTooltip direction="top" offset={[0, -6]}>
                  Alterar espaçamento
                </LeafletTooltip>
              </DiamondMarker>
              {addCropMarker}
            </ShowOnHoverBox>
          )
        : label
      }
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
  isSelected,
  rowYToLat,
  onEditSpacing,
  onAddRow,
}: {
  yM: number;
  startXM: number;
  endXM: number;
  labelIcon: L.DivIcon;
  edit: boolean;
  isSelected: boolean;
  rowYToLat: (yM: number) => number;
  onEditSpacing: () => void;
  onAddRow: () => void;
}) {
  const [arrowStartXM, arrowEndXM] = calcSpacingArrowEdges({
    spacingStartM: startXM,
    spacingEndM: endXM,
  });

  const arrowPositions: L.LatLngExpression[] = [
    [rowYToLat(yM), arrowStartXM],
    [rowYToLat(yM), arrowEndXM],
  ];
  const labelLatLng: L.LatLngExpression = [
    rowYToLat(yM - CROP_SPACING_LABEL_GAP_M),
    (startXM + endXM) / 2,
  ];
  const addCropLatLng: L.LatLngExpression = [
    rowYToLat(yM + CROP_SPACING_LABEL_GAP_M),
    (startXM + endXM) / 2
  ];

  const diamondRadiusM = SPACING_SHAPE_RADIUS_PX / PX_PER_M;

  const spacingBB: BBox = {
    minX: arrowStartXM,
    maxX: arrowEndXM,
    minY: rowYToLat(yM - CROP_SPACING_LABEL_GAP_M - diamondRadiusM),
    maxY: rowYToLat(yM + CROP_SPACING_LABEL_GAP_M + CROP_RADIUS_M),
  }

  const label = (
    <Marker
      position={labelLatLng}
      icon={labelIcon}
      interactive={false}
      zIndexOffset={1}
    />
  );

  const addCropMarker = (
    <CirclePlusMarker
      latLng={addCropLatLng}
      radiusPx={ADD_CROP_SHAPE_RADIUS_PX}
      onClick={onAddRow}
    >
      <LeafletTooltip direction="bottom" offset={[0, 6]}>
        Inserir linha
      </LeafletTooltip>
    </CirclePlusMarker>
  );

  return (
    <FeatureGroup>
      <ArrowPolyline
        positions={arrowPositions}
        pathOptions={{ color: SPACING_COLOR, weight: 1 }}
      />
      {edit
        ? isSelected
          ? (
            <Fragment>
              <DiamondMarker
                latLng={labelLatLng}
                radiusPx={SPACING_SHAPE_RADIUS_PX}
                onClick={onEditSpacing}
              >
                {label}
              </DiamondMarker>
              <ShowOnHoverBox boundingBox={spacingBB}>
                {addCropMarker}
              </ShowOnHoverBox>
            </Fragment>
          ) : (
            <ShowOnHoverBox boundingBox={spacingBB} placeholder={label}>
              {label}
              <DiamondMarker
                latLng={labelLatLng}
                radiusPx={SPACING_SHAPE_RADIUS_PX}
                onClick={onEditSpacing}
              >
                <LeafletTooltip direction="top" offset={[0, -6]}>
                  Altrar espaçamento
                </LeafletTooltip>
              </DiamondMarker>
              {addCropMarker}
            </ShowOnHoverBox>
          )
        : label
      }
    </FeatureGroup>
  );
}

/**
 * Feature group for a row start-offset line. Shows a downward triangle around
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
  isSelected,
  rowYToLat,
  onSetOffset,
  onEditOffset,
  onAddCrop,
}: {
  startYM: number;
  endYM: number;
  xM: number;
  labelIcon?: L.DivIcon;
  edit: boolean;
  isRep: boolean;
  isSelected: boolean;
  rowYToLat: (yM: number) => number;
  onSetOffset?: () => void;
  onEditOffset?: () => void;
  onAddCrop?: () => void;
}) {
  const midYM = (startYM + endYM) / 2;
  const [_, arrowEndYM] = calcSpacingArrowEdges({
    spacingStartM: startYM,
    spacingEndM: endYM,
    minPaddingM: CROP_RADIUS_M,
  });

  const arrowPositions: L.LatLngExpression[] = [
    [rowYToLat(startYM), xM],
    [rowYToLat(arrowEndYM), xM],
  ];
  const labelLatLng: L.LatLngExpression = [
    rowYToLat(midYM - CROP_RADIUS_M / 2),
    xM - ROW_START_OFFSET_LABEL_GAP_M,
  ];
  const addCropLatLng: L.LatLngExpression = [
    rowYToLat(midYM - CROP_RADIUS_M / 2 + 0.02),
    xM + ROW_START_OFFSET_LABEL_GAP_M,
  ];

  const triangleSideM = OFFSET_SHAPE_RADIUS_PX / PX_PER_M;

  const offsetBB: BBox = {
    minX: xM - ROW_START_OFFSET_LABEL_GAP_M - triangleSideM,
    maxX: xM + ROW_START_OFFSET_LABEL_GAP_M + CROP_RADIUS_M,
    minY: rowYToLat(startYM - CROP_RADIUS_M - ROW_LABEL_GAP_M / 2),
    maxY: rowYToLat(arrowEndYM),
  };

  const label = labelIcon && (
    <Marker
      position={labelLatLng}
      icon={labelIcon}
      interactive={false}
      zIndexOffset={1}
    />
  );

  const addCropMarker = (
    <CirclePlusMarker
      latLng={addCropLatLng}
      radiusPx={ADD_CROP_SHAPE_RADIUS_PX}
      onClick={onAddCrop}
    >
      <LeafletTooltip direction="top" offset={[0, -6]}>
        Adicionar cultivo (início)
      </LeafletTooltip>
    </CirclePlusMarker>
  );

  const offsetLength = endYM - startYM;

  if (offsetLength === 0 && edit && !isRep)
    return (
      <NullOffsetMarkers
        startYM={startYM}
        xM={xM}
        isSelected={isSelected}
        rowYToLat={rowYToLat}
        onSetOffset={onSetOffset}
        onAddCrop={onAddCrop}
      />
    )

  if (offsetLength > 0)
    return (
      <FeatureGroup>
        <ArrowPolyline
          positions={arrowPositions}
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
        {edit && !isRep
          ? isSelected
            ? (
              <Fragment>
                <TriangleDownMarker
                  latLng={labelLatLng}
                  radiusPx={OFFSET_SHAPE_RADIUS_PX}
                  onClick={onEditOffset}
                >
                  {label}
                </TriangleDownMarker>
                <ShowOnHoverBox boundingBox={offsetBB}>
                  {addCropMarker}
                </ShowOnHoverBox>
              </Fragment>
            ) : (
              <ShowOnHoverBox boundingBox={offsetBB} placeholder={label}>
                <TriangleDownMarker
                  latLng={labelLatLng}
                  radiusPx={OFFSET_SHAPE_RADIUS_PX}
                  onClick={onEditOffset}
                >
                  {label}
                  <LeafletTooltip direction="top" offset={[0, -6]}>
                    Alterar deslocamento
                  </LeafletTooltip>
                </TriangleDownMarker>
                {addCropMarker}
              </ShowOnHoverBox>
            )
          : label
        }
      </FeatureGroup>
    );
}

/**
 * When a row has no start-offset (`cropsOffsetM === 0`), revealx triangle +
 * circle+plus icons between the row label and the first crop on hover.
 * Click triangle → set offset; click circle+plus → add a new first crop.
 */
function NullOffsetMarkers({
  startYM,
  xM,
  isSelected,
  onSetOffset,
  onAddCrop,
  rowYToLat,
}: {
  startYM: number;
  xM: number;
  isSelected: boolean;
  onSetOffset?: () => void;
  onAddCrop?: () => void;
  rowYToLat: (yM: number) => number;
}) {
  const midYM = startYM - ROW_LABEL_GAP_M / 2;

  const triangleLatLng: L.LatLngExpression = [
    rowYToLat(midYM),
    xM - ROW_START_OFFSET_LABEL_GAP_M,
  ];
  const addCropLatLng: L.LatLngExpression = [
    rowYToLat(midYM + 0.02),
    xM + ROW_START_OFFSET_LABEL_GAP_M,
  ];

  const triangleSideM = OFFSET_SHAPE_RADIUS_PX / PX_PER_M;

  const offsetBB: BBox = {
    minX: xM - ROW_START_OFFSET_LABEL_GAP_M - triangleSideM,
    maxX: xM + ROW_START_OFFSET_LABEL_GAP_M + CROP_RADIUS_M,
    minY: rowYToLat(midYM - CROP_RADIUS_M),
    maxY: rowYToLat(midYM + CROP_RADIUS_M),
  };

  const addCropMarker = (
    <CirclePlusMarker
      latLng={addCropLatLng}
      radiusPx={ADD_CROP_SHAPE_RADIUS_PX}
      onClick={onAddCrop}
    >
      <LeafletTooltip direction="top" offset={[0, -6]}>
        Adicionar cultivo (início)
      </LeafletTooltip>
    </CirclePlusMarker>
  );

  if (isSelected) {
    return (
      <Fragment>
        <TriangleDownMarker
          latLng={triangleLatLng}
          radiusPx={OFFSET_SHAPE_RADIUS_PX}
          onClick={onSetOffset}
        />
        <ShowOnHoverBox boundingBox={offsetBB}>
          {addCropMarker}
        </ShowOnHoverBox>
      </Fragment>
    )
  }
  
  return (
    <ShowOnHoverBox boundingBox={offsetBB}>
      <TriangleDownMarker
        latLng={triangleLatLng}
        radiusPx={OFFSET_SHAPE_RADIUS_PX}
        onClick={onSetOffset}
      >
        <LeafletTooltip direction="top" offset={[0, -6]}>
          Criar deslocamento
        </LeafletTooltip>
      </TriangleDownMarker>
      {addCropMarker}
    </ShowOnHoverBox>
  );
}

/**
 * Subscribes to Leaflet's `zoomend` event and returns the current zoom level
 * as React state, so consumers re-render when the map is zoomed. Leaflet
 * doesn't put the new zoom on the event payload, so the handler reads it
 * back from the map. We also re-read once inside the effect to catch any
 * zoom change that happened between render and listener attachment (e.g. a
 * resize-triggered fitBounds during mount).
 */
function useMapZoom(): number {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useEffect(() => {
    const handler = () => setZoom(map.getZoom());
    map.on('zoomend', handler);
    setZoom(map.getZoom());
    return () => {
      map.off('zoomend', handler);
    };
  }, [map]);
  return zoom;
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
        background-color: transparent;
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
        width: ${ADD_CROP_SHAPE_RADIUS_PX * 2}px;
        height: ${ADD_CROP_SHAPE_RADIUS_PX * 2}px;
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

/**
 * Circle-with-plus-icon hover marker. Rendered as a `Marker` with a custom
 * `divIcon` so the plus is crisp at any zoom.
 */
function CirclePlusMarker({
  latLng,
  radiusPx,
  children,
  onClick,
  onMouseOver,
  onMouseOut,
}: {
  latLng: L.LatLngExpression;
  radiusPx: number;
  children?: React.ReactNode;
  onClick?: () => void;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
}) {
  const icon = L.divIcon({
    className: 'pattern-preview-circle-plus',
    html: `<div class="pattern-preview-circle-plus__inner"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#5f6368" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>`,
    iconSize: [radiusPx * 2, radiusPx * 2],
    iconAnchor: [radiusPx, radiusPx],
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
    >
      {children}
    </Marker>
  );
}

function DiamondMarker({
  latLng,
  radiusPx,
  children,
  onClick,
  onMouseOver,
  onMouseOut,
}: {
  latLng: L.LatLngExpression;
  radiusPx: number;
  children?: React.ReactNode;
  onClick?: () => void;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
}) {
  return (
    <ShapeMarker
      shape="diamond"
      latLng={latLng}
      radiusPx={radiusPx}
      pathOptions={{ color: "#9aa0a6", fillColor: "#ffffff", fillOpacity: 0, weight: 1 }}
      interactive
      onClick={onClick}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
    >
      {children}
    </ShapeMarker>
  );
}

function TriangleDownMarker({
  latLng,
  radiusPx,
  rotation,
  children,
  onClick,
  onMouseOver,
  onMouseOut,
}: {
  latLng: L.LatLngExpression;
  radiusPx: number;
  rotation?: number;
  children?: React.ReactNode;
  onClick?: () => void;
  onMouseOver?: () => void;
  onMouseOut?: () => void;
}) {
  return (
    <ShapeMarker
      shape="triangle-down"
      latLng={latLng}
      radiusPx={radiusPx}
      rotation={rotation}
      pathOptions={{ color: "#9aa0a6", fillColor: "#ffffff", fillOpacity: 0, weight: 1 }}
      interactive
      onClick={onClick}
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
    >
      {children}
    </ShapeMarker>
  );
}

function TriangleArrowMarker({
  latLng,
  radiusPx,
  rotation,
  onClick,
}: {
  latLng: L.LatLngExpression;
  radiusPx: number;
  rotation: number;
  onClick?: () => void;
}) {
  return (
    <ShapeMarker
      shape="triangle"
      latLng={latLng}
      radiusPx={radiusPx}
      rotation={rotation}
      pathOptions={{ color: "#5f6368", fillColor: "#9aa0a6", fillOpacity: 1, weight: 0.5 }}
      interactive
      onClick={onClick}
    />
  );
}

interface ShowOnHoverBoxProps extends PropsWithChildren {
  boundingBox: BBox;
  placeholder?: ReactNode;
}

function ShowOnHoverBox({ boundingBox, placeholder, children }: ShowOnHoverBoxProps) {
  const [hovered, setHovered] = useState(false);
  const { minX, maxX, minY, maxY } = boundingBox;

  return (
    <FeatureGroup
      eventHandlers={{
        mouseover: () => setHovered(true),
        mouseout: () => setHovered(false),
      }}
    >
      <Polygon
        positions={[
          [maxY, minX],
          [maxY, maxX],
          [minY, maxX],
          [minY, minX],
        ]}
        pathOptions={{
          fillOpacity: 0,
          opacity: 0,
        }}
      />
      {hovered ? children : placeholder}
    </FeatureGroup>
  )
}