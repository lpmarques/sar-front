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
} from "@mantine/core";
import {
  IconChevronLeft,
  IconExternalLink,
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
import { ArrowPolyline, CropLegend, MapBoundsFraming, NativityBadge } from ".";

interface CroppingPatternPreviewProps {
  pattern: CroppingPatternReadData;
  onSelect?: (patternId: number) => void;
  onBackToList?: () => void;
}

const BACKGROUND_COLOR_HEX = "#fafafa";
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
const SPACING_COLOR = "var(--mantine-color-gray-7)";

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
  const rowLayouts = rows.map((row) => {
    const rowXM = xCursorM;
    const rowLengthM = row.crops.reduce(
      (sum, crop) => sum + crop.distanceToNextCropM,
      0
    );
    xCursorM += row.distanceToNextRowM;
    return { row, rowXM, rowLengthM };
  });

  const totalXM = xCursorM + PATTERN_RIGHT_PADDING_M;
  const longestLineM = Math.max(
    0,
    ...rowLayouts.map((r) => r.rowLengthM + r.row.cropsOffsetM)
  );
  const totalYM = PATTERN_TOP_PADDING_M + ROW_LABEL_GAP_M + longestLineM + PATTERN_BOTTOM_PADDING_M;

  return { rowLayouts, totalXM, totalYM };
}

interface RenderedCrop {
  crop: PatternCrop;
  rowIndex: number;
  cropIndex: number;
  xM: number;
  yM: number;
}

interface RenderedRow {
  rowIndex: number;
  rowXM: number;
  rowStartYM: number;
  rowEndYM: number;
  rowStartOffsetM: number;
  rowSpacingYM: number;
  rowSpacingStartXM: number;
  rowSpacingEndXM: number;
  rowSpacingLengthM: number;
  rowSpacingLabel: string;
  rowLengthM: number;
  crops: RenderedCrop[];
  cropSpacings: {
    cropIndex: number;
    xM: number;
    startYM: number;
    endYM: number;
    lengthM: number;
    label: string;
  }[];
}

function renderRows(
  pattern: CroppingPatternReadData
): { rows: RenderedRow[]; totalXM: number; totalYM: number } {
  const { rowLayouts, totalXM, totalYM } = buildPreviewGeometry(pattern);

  const rows: RenderedRow[] = rowLayouts.map(({ row, rowXM, rowLengthM }, rowIndex) => {
    const rowStartYM = PATTERN_TOP_PADDING_M;
    const rowEndYM = rowStartYM + rowLengthM;
    const rowSpacingYM = rowStartYM;
    const rowSpacingLengthM = row.distanceToNextRowM;
    const rowSpacingStartXM = rowXM;
    const rowSpacingEndXM = rowXM + rowSpacingLengthM;

    const crops: RenderedCrop[] = [];
    const cropSpacings: RenderedRow["cropSpacings"] = [];

    let cropYM = rowStartYM + row.cropsOffsetM;
    row.crops.forEach((crop, cropIndex) => {
      crops.push({
        crop,
        rowIndex,
        cropIndex,
        xM: rowXM,
        yM: cropYM,
      });

      cropSpacings.push({
        cropIndex,
        xM: rowXM,
        startYM: cropYM,
        endYM: cropYM + crop.distanceToNextCropM,
        lengthM: crop.distanceToNextCropM,
        label: formatLengthM(crop.distanceToNextCropM),
      });

      cropYM += crop.distanceToNextCropM;
    });

    return {
      rowIndex,
      rowXM,
      rowStartYM,
      rowEndYM,
      rowStartOffsetM: row.cropsOffsetM,
      rowSpacingYM,
      rowSpacingStartXM,
      rowSpacingEndXM,
      rowSpacingLengthM,
      rowSpacingLabel: formatLengthM(row.distanceToNextRowM),
      rowLengthM,
      crops,
      cropSpacings,
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
    const repeatedSelection = selectedCrop &&
      selectedCrop.crop.plant.acceptedTaxonName === c.crop.plant.acceptedTaxonName;
    
    if (repeatedSelection)
      return setSelectedCrop(null);
    
    setSelectedCrop(c);
  }

  const handleRowSelect = (r: RenderedRow) => {
    setSelectedCrop(null);
    const repeatedSelection = selectedRow &&
      selectedRow.rowIndex === r.rowIndex;
    
    if (repeatedSelection)
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
  const bounds = useMemo(() => L.latLngBounds(
    [[0, 0], [totalYM, totalXM]]
  ), [totalYM, totalXM]);

  const rowLat = (yM: number) => totalYM - yM;

  // Inline-styled divIcon factories
  const rowLabelIcon = (label: string, anchor: [number, number]) =>
    L.divIcon({
      className: "pattern-preview-label pattern-preview-label--row",
      html: `<div class="pattern-preview-label__inner">${label}</div>`,
      iconAnchor: anchor,
    });
  const spacingLabelIcon = (label: string, anchor: [number, number]) =>
    L.divIcon({
      className: "pattern-preview-label pattern-preview-label--spacing",
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
        background: BACKGROUND_COLOR_HEX,
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

      {/* Row labels at the top */}
      {rows.map((r) => {
        const row = pattern.rows[r.rowIndex];
        const labelText = `Linha ${row.position}`;
        const lat = rowLat(r.rowStartYM - ROW_LABEL_GAP_M);
        return (
          <Marker
            key={`row-label-${r.rowIndex}`}
            position={[lat, r.rowXM]}
            icon={rowLabelIcon(labelText, [20, 0])}
            interactive={true}
            keyboard={false}
            eventHandlers={{
              click: () => onRowSelect(r),
            }}
          />
        );
      })}

      {/* Per-row geometry */}
      {rows.map((r) => {
        return (
          <RowGeometry
            key={`row-${r.rowIndex}`}
            row={r}
            rowLat={rowLat}
            selectedRow={selectedRow}
            selectedCrop={selectedCrop}
            onCropSelect={onCropSelect}
            spacingLabelIcon={spacingLabelIcon}
          />
        );
      })}

      {/* Row-to-row spacing lines (horizontal, between adjacent rows) */}
      {rows.map((r) =>
        r.rowIndex < rows.length ? (
          <FeatureGroup>
            <ArrowPolyline
              key={`rs-${r.rowIndex}`}
              positions={[
                [rowLat(r.rowSpacingYM), r.rowSpacingStartXM + ROW_SPACING_PADDING_M],
                [rowLat(r.rowSpacingYM), r.rowSpacingEndXM - ROW_SPACING_PADDING_M],
              ]}
              pathOptions={{
                color: SPACING_COLOR,
                weight: 1,
                dashArray: "4 4",
              }}
            />
            {/* Spacing label (midpoint, above the line) */}
            <Marker
              key={`rs-label-${r.rowIndex}`}
              position={[
                rowLat(r.rowSpacingYM - CROP_SPACING_LABEL_GAP_M),
                (r.rowSpacingStartXM + r.rowSpacingEndXM) / 2,
              ]}
              icon={spacingLabelIcon(r.rowSpacingLabel, [10, 6])}
              interactive={false}
              keyboard={false}
            />
          </FeatureGroup>
        ) : null
      )}
    </MapContainer>
    </>
  );
}

interface RowGeometryProps {
  row: RenderedRow;
  rowLat: (yM: number) => number;
  selectedRow: RenderedRow | null;
  selectedCrop: RenderedCrop | null;
  onCropSelect: (crop: RenderedCrop) => void;
  spacingLabelIcon: (label: string, anchor: [number, number]) => L.DivIcon;
}

function RowGeometry({
  row: r,
  rowLat,
  selectedRow,
  selectedCrop,
  onCropSelect,
  spacingLabelIcon,
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
            dashArray: "4 4",
          }}
          startHead={false}
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
      {r.cropSpacings.map((s) => {
        return (
          <FeatureGroup key={`cs-${r.rowIndex}-${s.cropIndex}`}>
            <ArrowPolyline
              positions={[
                [rowLat(s.startYM + CROP_SPACING_PADDING_M + CROP_RADIUS_M), s.xM],
                [rowLat(s.endYM - CROP_SPACING_PADDING_M - CROP_RADIUS_M), s.xM],
              ]}
              pathOptions={{
                color: SPACING_COLOR,
                weight: 1,
                dashArray: "4 4",
              }}
            />
            <Marker
              position={[
                rowLat((s.startYM + s.endYM) / 2),
                s.xM - CROP_SPACING_LABEL_GAP_M,
              ]}
              icon={spacingLabelIcon(s.label, spacingLabelAnchor)}
              interactive={false}
              keyboard={false}
            />
          </FeatureGroup>
        );
      })}

      {/* Crop circles */}
      {r.crops.map((c) => {
        const isSelected = 
          selectedCrop?.crop.plant.acceptedTaxonName === c.crop.plant.acceptedTaxonName ||
          selectedRow?.rowIndex === r.rowIndex;
          // selectedCrop?.rowIndex === c.rowIndex &&
          // selectedCrop?.cropIndex === c.cropIndex;
        return (
          <CircleMarker
            key={`crop-${r.rowIndex}-${c.cropIndex}`}
            center={[rowLat(c.yM), c.xM]}
            radius={CROP_RADIUS_M * PX_PER_M}
            pathOptions={{
              color: isSelected ? TEXT_COLOR : "transparent",
              weight: isSelected ? 2 : 0,
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
        color: var(--mantine-color-dark-7);
        background-color: ${BACKGROUND_COLOR_HEX};
      }
      .pattern-preview-label--row .pattern-preview-label__inner {
        font-weight: 600;
      }
      .pattern-preview-label--spacing .pattern-preview-label__inner {
        color: var(--mantine-color-gray-7);
      }
    `}</style>
  );
}