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
const CROP_SPACING_LABEL_GAP_M = 0.4;

/**
 * Sizes for the hover-overlay shape markers. Tuned to match the spacing
 * labels visually.
 */
const HOVER_SHAPE_RADIUS_PX = 12;
const ROW_ARROW_SHAPE_RADIUS_PX = 5;
const ROW_ARROW_SHAPE_GAP_M = 0.3;

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
    console.log(rowStartYM);

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

interface PatternPreviewPanelProps {
  pattern: CroppingPatternReadData;
  renderedRows: RenderedRow[];
  selectedRow: RenderedRow | null;
  selectedCrop: RenderedCrop | null;
  onRowSelect: (row: RenderedRow) => void;
  onCropSelect: (crop: RenderedCrop) => void;
  totalXM: number;
  totalYM: number;
};

/**
 * Map-based preview. We use `L.CRS.Simple` so coordinates are in plain metres
 * with no projection. LatLng is (y, x) for Simple, so we flip y against the
 * total height to keep "y down on screen".
 */
export default function PatternPreviewPanel({
  pattern,
  renderedRows: rows,
  selectedRow,
  selectedCrop,
  onRowSelect,
  onCropSelect,
  totalXM,
  totalYM,
}: PatternPreviewPanelProps) {
  const [showReps, setShowReps] = useState(true);
  const bounds = useMemo(() => L.latLngBounds(
    [[0, 0], [totalYM, totalXM]]
  ), [totalYM, totalXM]);

  const rowToPreviewY = (yM: number) => totalYM - yM;

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
    
  /**
   * Renders a row's label with permanent left/right arrow triangles that swap
   * the row's position with its neighbour. Triangles are drawn via
   * `TriangleArrowMarker` (a `L.shapeMarker` rotated triangle).
   */
  const renderRowLabel = (r: RenderedRow, i: number) => {
    if (r.isRep && !showReps) return null;

    const row = pattern.rows[r.rowIndex];
    const labelText = `Linha ${row.position}`;
    const lat = rowToPreviewY(r.rowStartYM - ROW_LABEL_GAP_M);
    const labelLatLng: L.LatLngExpression = [lat, r.rowXM];
    return (
      <Fragment key={`row-label-fragment-${i}`}>
        <Marker
          key={`row-label-${i}`}
          position={labelLatLng}
          icon={rowLabelIcon(labelText, [20, 0], r.isRep)}
          interactive={true}
          keyboard={false}
          eventHandlers={{
            click: () => onRowSelect(r),
          }}
        />
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

    return (
      <Fragment key={`row-fragment-${i}`}>
        {r.rowStartOffsetM > 0 && 
        <RowOffset
          startYM={r.rowStartYM}
          endYM={r.rowStartYM + r.rowStartOffsetM}
          xM={r.rowXM}
          labelIcon={spacingLabelIcon(
            formatLengthM(r.rowStartOffsetM),
            [14, 8],
          )}
          rowToPreviewY={rowToPreviewY}
        />}

        {r.crops.slice(0, -1).map((c, j) => {
          if (c.isRep && !showReps) return null;
          return (
            <CropSpacing
              key={`cs-${i}-${j}`}
              startYM={c.spacingStartYM}
              endYM={c.spacingEndYM}
              xM={c.spacingXM}
              labelIcon={spacingLabelIcon(
                c.spacingLabel,
                [10, 6],
                c.isRep
              )}
              isRep={c.isRep}
              rowToPreviewY={rowToPreviewY}
            />
          );
        })}

        {r.crops.map((c, j) => {
          if (c.isRep && !showReps) return null;
          const isSelected =
            selectedCrop?.crop.plant.acceptedTaxonName === c.crop.plant.acceptedTaxonName ||
            selectedRow?.rowIndex === r.rowIndex;
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
                click: () => onCropSelect(c),
              }}
            >
              <LeafletTooltip direction="top" offset={[0, -4]}>
                <PlantFullNameLabel fw="bold" plant={c.crop.plant} />
              </LeafletTooltip>
            </CircleMarker>
            </Fragment>
          );
        })}
      </Fragment>
    );
  };

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

      {/* Row labels at the top */}
      {rows.map((r, i) => renderRowLabel(r, i))}

      {/* Per-row geometry */}
      {rows.map((r, i) => renderRowGeometry(r, i))}

      {/* Row-to-row spacing lines (horizontal, between adjacent rows) */}
      {rows.slice(0, -1).map((r, i) =>
        <RowSpacing
          key={`rs-${i}`}
          yM={r.spacingYM}
          startXM={r.spacingStartXM}
          endXM={r.spacingEndXM}
          labelIcon={spacingLabelIcon(r.spacingLabel, [10, 6])}
          rowToPreviewY={rowToPreviewY}
        />
      )}
    </MapContainer>
    </>
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
  isRep,
  rowToPreviewY,
}: {
  startYM: number;
  endYM: number;
  xM: number;
  labelIcon: L.DivIcon;
  isRep: boolean;
  rowToPreviewY: (yM: number) => number;
}) {

  return (
    <FeatureGroup>
      <ArrowPolyline
        positions={[
          [rowToPreviewY(startYM + CROP_SPACING_PADDING_M + CROP_RADIUS_M), xM],
          [rowToPreviewY(endYM - CROP_SPACING_PADDING_M - CROP_RADIUS_M), xM],
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
        position={[
          rowToPreviewY((startYM + endYM) / 2),
          xM - CROP_SPACING_LABEL_GAP_M,
        ]}
        icon={labelIcon}
        interactive={false}
        keyboard={false}
      />}
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
  rowToPreviewY,
}: {
  yM: number;
  startXM: number;
  endXM: number;
  labelIcon: L.DivIcon;
  rowToPreviewY: (yM: number) => number;
}) {

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
        position={[
          rowToPreviewY(yM - CROP_SPACING_LABEL_GAP_M),
          (startXM + endXM) / 2,
        ]}
        icon={labelIcon}
        interactive={false}
        keyboard={false}
      />
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
  rowToPreviewY,
}: {
  startYM: number;
  endYM: number;
  xM: number;
  labelIcon: L.DivIcon;
  rowToPreviewY: (yM: number) => number;
}) {

  return (
    <FeatureGroup>
      <ArrowPolyline
        positions={[
          [rowToPreviewY(startYM), xM],
          [rowToPreviewY(endYM - CROP_RADIUS_M), xM],
        ]}
        pathOptions={{ color: SPACING_COLOR, weight: 1 }}
        backHead={false}
      />
      <Marker
        position={[
          rowToPreviewY((startYM + endYM) / 2),
          xM - ROW_START_OFFSET_LABEL_GAP_M,
        ]}
        icon={labelIcon}
        interactive={false}
        keyboard={false}
      />
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
