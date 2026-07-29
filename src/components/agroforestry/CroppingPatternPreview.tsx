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
import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Tooltip as LeafletTooltip,
  useMap,
  FeatureGroup,
} from "react-leaflet";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip as MantineTooltip,
  UnstyledButton,
} from "@mantine/core";
import {
  IconChevronLeft,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import {
  CroppingPatternReadData,
  PatternCrop,
  PatternRow,
} from "../../apis/agroforestry";
import { getPlantPopularNameList, PlantReadData } from "../../apis/catalog";
import { useAuth } from "../../hooks/useAuth";
import { useProject } from "../../hooks/useProject";
import { QueryLoader } from "../common/QueryLoader";
import FieldView from "../common/FieldView";
import { PlantFullNameLabel } from "../catalog";
import { UserName } from "../user";
import { ArrowPolyline, CropLegend, LeafletStyleButtonControl, MapBoundsFraming, MapControl, NativityBadge } from ".";

interface CroppingPatternPreviewProps {
  pattern: CroppingPatternReadData;
  onSelect?: (patternId: number) => void;
  onBackToList?: () => void;
}

const BACKGROUND_COLOR = "#fafafa";
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

  // Pre-compute per-row line length (sum of crop distances) and the
  // X offset accumulated from previous rows' inter-row distances.
  let xCursorM = PATTERN_LEFT_PADDING_M;
  
  const rowLayouts = [];
  const layoutsCount = rows.length + 1;

  for (let i=0; i<layoutsCount; i++) {
    const row = rows[i % rows.length];
    const rowXM = xCursorM;
    const rowLengthM = row.crops.reduce(
      (sum, crop) => sum + crop.distanceToNextCropM,
      0
    ) + row.cropsOffsetM;

    rowLayouts.push({ row, rowXM, rowLengthM });
    xCursorM += row.distanceToNextRowM;
  };

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

function renderRows(
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

export default function CroppingPatternPreview({pattern, onBackToList, onSelect}: CroppingPatternPreviewProps) {
  const { user } = useAuth();
  const [selectedRow, setSelectedRow] = useState<RenderedRow | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<RenderedCrop | null>(null);

  const isAuthor = user?.id === pattern.author.id;

  const handleCropSelect = (c: RenderedCrop) => {
    setSelectedRow(null);
    const secondSelection = selectedCrop &&
      selectedCrop.crop.plant.acceptedTaxonName === c.crop.plant.acceptedTaxonName;
    
    if (secondSelection)
      return setSelectedCrop(null);
    
    setSelectedCrop(c);
  }

  const handleRowSelect = (r: RenderedRow) => {
    setSelectedCrop(null);
    const secondSelection = selectedRow && selectedRow.rowIndex === r.rowIndex;
    
    if (secondSelection)
      return setSelectedRow(null);
    
    setSelectedRow(r);
  }

  const { rows, totalXM, totalYM } = useMemo(
    () => renderRows(pattern),
    [pattern]
  );

  const panelHeightPx = Math.max(400, totalYM * PX_PER_M);

  return (
    <Stack gap="md">
      {onBackToList &&
      <Group justify="space-between" align="center">
        <Button
          variant="subtle"
          size="xs"
          w={160}
          leftSection={<IconChevronLeft size={16} />}
          onClick={onBackToList}
        >
          Voltar para a lista
        </Button>
        <Text p={0} fw={600} fz="md">{pattern.name}</Text>
        <div style={{width: 160}}/> {/* spacer to keep title centered */}
      </Group>}

      <Group align="flex-start" gap="md" wrap="nowrap">
        <Box
          style={{
            flex: 1,
            minWidth: 0,
            height: panelHeightPx,
          }}
        >
          <PatternPreviewPanel
            pattern={pattern}
            renderedRows={rows}
            selectedRow={selectedRow}
            selectedCrop={selectedCrop}
            onRowSelect={(row: RenderedRow) => handleRowSelect(row)}
            onCropSelect={(crop: RenderedCrop) => handleCropSelect(crop)}
            totalXM={totalXM}
            totalYM={totalYM}
          />
        </Box>

        <Paper
          withBorder
          p="sm"
          w={280}
          style={{ minHeight: panelHeightPx }}
        >
          {selectedCrop ? (
            <PlantInfoPanel plant={selectedCrop.crop.plant} />
          ) : selectedRow ? (
            <RowInfoPanel row={pattern.rows[selectedRow.rowIndex]} />
          ) : (
            <PatternInfoPanel pattern={pattern} />
          )}
        </Paper>
      </Group>

      <Group justify="space-between" gap="xs">
        <Group gap="xs">
          {onSelect &&
          <Button onClick={() => onSelect(pattern.id)}>
            Selecionar padrão
          </Button>}
          <Button variant="default" disabled>
            Clonar padrão
          </Button>
        {isAuthor && <>
          <Button variant="default" disabled>
            Editar padrão
          </Button>
          <MantineTooltip label="Excluir padrão">
            <ActionIcon
              variant="outline"
              color="red"
              size="lg"
              onClick={() => {
                /* TODO: wire to deleteCroppingPattern mutation */
              }}
            >
              <IconTrash size={18} />
            </ActionIcon>
          </MantineTooltip>
          </>}
        </Group>
      </Group>
    </Stack>
  );
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
function PatternPreviewPanel({
  pattern,
  renderedRows: rows,
  selectedRow,
  selectedCrop,
  onRowSelect,
  onCropSelect,
  totalXM,
  totalYM,
}: PatternPreviewPanelProps) {
  const [ viewReps, setViewReps ] = useState(true);
  const bounds = useMemo(() => L.latLngBounds(
    [[0, 0], [totalYM, totalXM]]
  ), [totalYM, totalXM]);

  const rowLat = (yM: number) => totalYM - yM;

  // Inline-styled divIcon factories
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
        label={viewReps ? "Ocultar repetições" : "Mostrar repetições"}
        onClick={() => setViewReps(v => !v)}
      >
        {viewReps ?
        <IconEyeOff color="var(--mantine-color-gray-8)" /> :
        <IconEye color="var(--mantine-color-gray-8)" />}
      </LeafletStyleButtonControl>

      {/* <Polygon positions={[[
        bounds.getSouthEast(),
        bounds.getNorthEast(),
        bounds.getNorthWest(),
        bounds.getSouthWest(),
      ]]} /> */}

      {/* Row labels at the top */}
      {rows.map((r, i) => {
        const row = pattern.rows[r.rowIndex];
        const labelText = `Linha ${row.position}`;
        const lat = rowLat(r.rowStartYM - ROW_LABEL_GAP_M);
        return (
          <>
          {(!r.isRep || viewReps) &&
          <Marker
            key={`row-label-${i}`}
            position={[lat, r.rowXM]}
            icon={rowLabelIcon(labelText, [20, 0], r.isRep)}
            interactive={true}
            keyboard={false}
            eventHandlers={{
              click: () => onRowSelect(r),
            }}
          />}
          </>
        );
      })}

      {/* Per-row geometry */}
      {rows.map((r, i) => 
        <>
        {(!r.isRep || viewReps) &&
        <RowGeometry
          key={`row-${i}`}
          index={i}
          row={r}
          rowLat={rowLat}
          selectedRow={selectedRow}
          selectedCrop={selectedCrop}
          onCropSelect={onCropSelect}
          spacingLabelIcon={spacingLabelIcon}
          viewReps={viewReps}
        />}
        </>
      )}

      {/* Row-to-row spacing lines (horizontal, between adjacent rows) */}
      {rows.slice(0, rows.length-1).map((r, i) =>
        <FeatureGroup>
          <ArrowPolyline
            key={`rs-${i}`}
            positions={[
              [rowLat(r.spacingYM), r.spacingStartXM + ROW_SPACING_PADDING_M],
              [rowLat(r.spacingYM), r.spacingEndXM - ROW_SPACING_PADDING_M],
            ]}
            pathOptions={{
              color: SPACING_COLOR,
              weight: 1,
            }}
          />
          {/* Spacing label (midpoint, above the line) */}
          <Marker
            key={`rs-label-${i}`}
            position={[
              rowLat(r.spacingYM - CROP_SPACING_LABEL_GAP_M),
              (r.spacingStartXM + r.spacingEndXM) / 2,
            ]}
            icon={spacingLabelIcon(r.spacingLabel, [10, 6])}
            interactive={false}
            keyboard={false}
          />
        </FeatureGroup>
      )}
    </MapContainer>
    </>
  );
}

interface RowGeometryProps {
  index: number,
  row: RenderedRow;
  rowLat: (yM: number) => number;
  selectedRow: RenderedRow | null;
  selectedCrop: RenderedCrop | null;
  onCropSelect: (crop: RenderedCrop) => void;
  spacingLabelIcon: (label: string, anchor: [number, number], isRep?: boolean) => L.DivIcon;
  viewReps: boolean;
}

function RowGeometry({
  index: i,
  row: r,
  rowLat,
  selectedRow,
  selectedCrop,
  onCropSelect,
  spacingLabelIcon,
  viewReps,
}: RowGeometryProps) {
  const offsetLineStartXM = r.rowStartYM;
  const offsetLineEndXM = r.rowStartYM + r.rowStartOffsetM - CROP_RADIUS_M;
  const spacingLabelAnchor: [number, number] = [14, 8];

  return (
    <>
      {/* Start-offset line (top → cropsOffsetM, dashed) */}
      {r.rowStartOffsetM > 0 &&
      <FeatureGroup>
        <ArrowPolyline
          positions={[
            [rowLat(offsetLineStartXM), r.rowXM],
            [rowLat(offsetLineEndXM), r.rowXM],
          ]}
          pathOptions={{
            color: SPACING_COLOR,
            weight: 1,
          }}
          backHead={false}
        />
        <Marker
          position={[
            rowLat((offsetLineStartXM+offsetLineEndXM)/2),
            r.rowXM - ROW_START_OFFSET_LABEL_GAP_M,
          ]}
          icon={spacingLabelIcon(
            formatLengthM(r.rowStartOffsetM),
            spacingLabelAnchor
          )}
          interactive={false}
          keyboard={false}
        />
      </FeatureGroup>}

      {/* Per-crop spacing lines (top-down) */}
      {r.crops.slice(0, r.crops.length-1).map((c, j) => {
        return (
          <>
          {(!c.isRep || viewReps) &&
          <FeatureGroup key={`cs-${i}-${j}`}>
            <ArrowPolyline
              positions={[
                [rowLat(c.spacingStartYM + CROP_SPACING_PADDING_M + CROP_RADIUS_M), c.spacingXM],
                [rowLat(c.spacingEndYM - CROP_SPACING_PADDING_M - CROP_RADIUS_M), c.spacingXM],
              ]}
              pathOptions={{
                color: SPACING_COLOR,
                weight: 1,
                dashArray: c.isRep ? "3 3" : undefined,
              }}
              arrowHeadOptions={{
                pathOptions: {
                  stroke: c.isRep,
                  dashArray: undefined,
                  fillColor: c.isRep ? BACKGROUND_COLOR : SPACING_COLOR,
                }
              }}
            />
            {!c.isRep &&
            <Marker
              position={[
                rowLat((c.spacingStartYM + c.spacingEndYM) / 2),
                c.spacingXM - CROP_SPACING_LABEL_GAP_M,
              ]}
              icon={spacingLabelIcon(c.spacingLabel, spacingLabelAnchor, c.isRep)}
              interactive={false}
              keyboard={false}
            />}
          </FeatureGroup>}
          </>
        );
      })}

      {/* Crop circles */}
      {r.crops.map((c, j) => {
        const isSelected = 
          selectedCrop?.crop.plant.acceptedTaxonName === c.crop.plant.acceptedTaxonName ||
          selectedRow?.rowIndex === r.rowIndex;
          // selectedCrop?.rowIndex === c.rowIndex &&
          // selectedCrop?.cropIndex === c.cropIndex;
        return (
          <>
          {(!c.isRep || viewReps) &&
          <CircleMarker
            key={`crop-${i}-${j}`}
            center={[rowLat(c.cropYM), c.cropXM]}
            radius={CROP_RADIUS_M * PX_PER_M}
            pathOptions={{
              color: TEXT_COLOR,
              weight: isSelected ? 2 : (c.isRep ? 0.85 : 0.75 ),
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
          </CircleMarker>}
          </>
        );
      })}
    </>
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

function PatternInfoPanel({ pattern }: { pattern: CroppingPatternReadData }) {
  return (
    <Stack justify="space-between" h="100%">
      <Stack align="left">
        <Text fz={15}>
          {pattern.description}
        </Text>
        <FieldView fz="sm" label="Publicado por">
          <UserName fz="sm" user={pattern.author} />
        </FieldView>
      </Stack>
      <Text fz="sm" c="dimmed" ta="center">
        Clique em uma linha ou em um cultivo (círculo) para ver detalhes.
      </Text>
    </Stack>
  )
}

function RowInfoPanel({ row }: { row: PatternRow }) {
  const cropsLegend = row.crops.map(c => 
    <CropLegend plant={c.plant} />
  );

  return (
    <Stack gap="sm">
      <Text fw="bold">
        Linha {row.position}
      </Text>
      <FieldView fz={15} label="Função">
        {row.purpose}
      </FieldView>
      <FieldView fz={15} label="Sequência de cultivos">
        {cropsLegend}
      </FieldView>
    </Stack>
  );
}

function PlantInfoPanel({ plant }: { plant: PlantReadData }) {
  const { plantsFitnessMap } = useProject();

  const plantFitness = plantsFitnessMap[plant.acceptedTaxonName];

  const popularNamesQueryOptions = {
    queryKey: [
      'plantPopularNameList',
      plant.id.toString(),
    ],
    queryFn: getPlantPopularNameList
  }
  const popularNames = useQuery(popularNamesQueryOptions);

  if (!popularNames.data)
    return <QueryLoader {...popularNamesQueryOptions}/>;

  return (
    <Stack gap="xs">
      <Group gap={6} wrap="nowrap" align="baseline">
        <Text fw="bold" fs="italic" style={{ flex: 1 }}>
          {plant.acceptedTaxonName}
        </Text>
        {plantFitness &&
        <NativityBadge plantFitness={plantFitness} />}
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => window.open(`/plants/${plant.id}`, "_blank")}
          aria-label="Abrir página da planta em nova aba"
        >
          <IconExternalLink size={14} />
        </ActionIcon>
      </Group>
      <Stack gap={10}>
        {popularNames.data.length > 0 &&
        <Text fz={15}>
          {popularNames.data.map(item => item.name).join(", ")}
        </Text>}
      </Stack>
    </Stack>
  );
}

/**
 * Inline styles for the Leaflet divIcon labels used to render text on the map.
 * Leaflet wraps each icon in its own `.leaflet-div-icon` element so the styling
 * is namespaced by our custom classNames.
 */
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
    `}</style>
  );
}