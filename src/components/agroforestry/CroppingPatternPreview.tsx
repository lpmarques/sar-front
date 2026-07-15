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

import { useMemo, useState } from "react";
import {
  ActionIcon,
  Button,
  Center,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconChevronLeft,
  IconExternalLink,
  IconTrash,
} from "@tabler/icons-react";
import {
  CroppingPatternReadData,
  getCroppingPattern,
  PatternCrop,
  PatternRow,
} from "../../apis/agroforestry";
import { PlantReadData } from "../../apis/catalog";
import { useAuth } from "../../hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { QueryLoader } from "../common/QueryLoader";
import { useParams } from "react-router-dom";

interface CroppingPatternPreviewProps {
  pattern?: CroppingPatternReadData;
  onSelect?: (patternId: number) => void;
  onBackToList?: () => void;
}

const ROW_LEFT_PADDING_M = 4;
const ROW_BOTTOM_PADDING_M = 4;
const ROW_RIGHT_PADDING_M = 4;
const ROW_TOP_PADDING_M = 6;
const CROP_SPACING_LABEL_GAP_M = 1.5;
const ROW_SPACING_PADDING_M = 2;
const ROW_START_OFFSET_LABEL_GAP_M = 1.5;
const CROP_RADIUS_M = 0.6;

const TEXT_PX = 11;
const TEXT_COLOR = "var(--mantine-color-dark-7)";
const TEXT_COLOR_MUTED = "var(--mantine-color-gray-7)";
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

// TODO: refactor to display backend-sourced purpose string
/** Build a human-readable "purpose" string for a row from its crops. */
function describeRowPurpose(row: PatternRow): string {
  const taxa = Array.from(
    new Set(row.crops.map((crop) => crop.plant.acceptedTaxonName))
  );
  if (taxa.length === 0) return "Linha vazia";
  if (taxa.length <= 3) return taxa.join(", ");
  return `${taxa.slice(0, 3).join(", ")} +${taxa.length - 3}`;
}

/**
 * Pure layout: maps pattern rows into SVG-ready geometry. Working in metres
 * (treated as SVG units), so the SVG viewBox equals the bounding box of the
 * resulting geometry plus a small margin.
 */
function buildPreviewGeometry(pattern: CroppingPatternReadData) {
  const rows = pattern.rows;

  // Pre-compute per-row line length (sum of crop distances) and the
  // X offset accumulated from previous rows' inter-row distances.
  let xCursorM = ROW_LEFT_PADDING_M;
  const rowLayouts = rows.map((row) => {
    const rowXM = xCursorM;
    const lineLengthM = row.crops.reduce(
      (sum, crop) => sum + crop.distanceToNextCropM,
      0
    );
    xCursorM += row.distanceToNextRowM;
    return { row, rowXM, lineLengthM };
  });

  const totalXM = xCursorM + ROW_RIGHT_PADDING_M;
  const totalYM = ROW_TOP_PADDING_M + ROW_BOTTOM_PADDING_M;

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
  rowSpacingLabel: string;
  rowSpacingYM: number;
  rowSpacingLabelText: string;
  rowSpacingXM: number;
  rowSpacingEndXM: number;
  lineLengthM: number;
  crops: RenderedCrop[];
  cropSpacings: {
    cropIndex: number;
    xM: number;
    yM: number;
    lengthM: number;
    label: string;
  }[];
}

function renderRows(
  pattern: CroppingPatternReadData
): { rows: RenderedRow[]; totalXM: number; totalYM: number } {
  const { rowLayouts, totalXM, totalYM } = buildPreviewGeometry(pattern);

  let runningPrevRowXM = ROW_LEFT_PADDING_M;

  const rows: RenderedRow[] = rowLayouts.map(({ row, rowXM, lineLengthM }, i) => {
    const rowStartYM = ROW_TOP_PADDING_M;
    const rowEndYM = rowStartYM + lineLengthM;
    const rowSpacingYM = (rowStartYM + rowEndYM) / 2;
    const nextRowXM = rowLayouts[i + 1]?.rowXM ?? totalXM - ROW_RIGHT_PADDING_M;
    const rowSpacingLengthM = Math.max(0, nextRowXM - rowXM);
    const rowSpacingXM = rowXM;
    const rowSpacingEndXM = rowXM + rowSpacingLengthM;

    const crops: RenderedCrop[] = [];
    const cropSpacings: RenderedRow["cropSpacings"] = [];

    let runningCropYM = rowStartYM + row.cropsOffsetM;
    row.crops.forEach((crop, cropIndex) => {
      const cropY = runningCropYM;
      crops.push({
        crop,
        rowIndex: i,
        cropIndex,
        xM: rowXM,
        yM: cropY,
      });

      cropSpacings.push({
        cropIndex,
        xM: rowXM,
        yM: cropY + CROP_RADIUS_M + CROP_SPACING_LABEL_GAP_M,
        lengthM: crop.distanceToNextCropM,
        label: formatLengthM(crop.distanceToNextCropM),
      });

      runningCropYM += crop.distanceToNextCropM;
    });

    return {
      rowIndex: i,
      rowXM,
      rowStartYM,
      rowEndYM,
      rowStartOffsetM: row.cropsOffsetM,
      rowSpacingYM,
      rowSpacingXM,
      rowSpacingEndXM,
      rowSpacingLengthM,
      rowSpacingLabel: formatLengthM(row.distanceToNextRowM),
      rowSpacingLabelText: formatLengthM(row.distanceToNextRowM),
      lineLengthM,
      crops,
      cropSpacings,
    };
  });

  return { rows, totalXM, totalYM };
}

export default function CroppingPatternPreview({
  pattern,
  ...props
}: CroppingPatternPreviewProps) {
  let { patternId } = useParams();
  
  const patternQueryOptions = {
    queryKey: ['croppingPattern', patternId?.toString() ?? '0'],
    queryFn: getCroppingPattern,
    enabled: pattern === undefined,
  };
  const patternQuery = useQuery(patternQueryOptions);

  if (patternQuery.isEnabled && !patternQuery.data)
    return (
      <Center>
        <QueryLoader {...patternQueryOptions} />
      </Center>
    );
    
  const patternData = patternQuery.data ?? pattern!;

  return <CroppingPatternPreviewBody pattern={patternData} {...props} />
}

interface CroppingPatternPreviewBodyProps extends CroppingPatternPreviewProps {
  pattern: CroppingPatternReadData,
}

function CroppingPatternPreviewBody({pattern, onBackToList, onSelect}: CroppingPatternPreviewBodyProps) {
  const { user } = useAuth();
  const [selectedCrop, setSelectedCrop] = useState<RenderedCrop | null>(null);

  const isAuthor = user?.id === pattern.author.id;

  const { rows, totalXM, totalYM } = useMemo(
    () => renderRows(pattern),
    [pattern]
  );

  const previewPanelHeightPx = Math.max(280, totalYM * 14 + 60);

  return (
    <Stack gap="md">
      {onBackToList &&
      <Group justify="space-between" align="center">
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconChevronLeft size={16} />}
          onClick={onBackToList}
        >
          Voltar para a lista
        </Button>
        <Text fw={600} fz="md">{pattern.name}</Text>
        <div /> {/* spacer to keep title centered */}
      </Group>}

      <Group align="flex-start" gap="md" wrap="nowrap">        
        <ScrollArea h={previewPanelHeightPx} style={{ flex: 1 }}>
          <PatternPreviewPanel
            pattern={pattern}
            rows={rows}
            selectedCrop={selectedCrop}
            onCropSelect={(crop: RenderedCrop) => setSelectedCrop(crop)}
            svgProps={{
              viewBox: `0 0 ${totalXM} ${totalYM}`
            }}
          />
        </ScrollArea>

        <Paper
          withBorder
          p="sm"
          w={260}
          style={{ flexShrink: 0, minHeight: previewPanelHeightPx }}
        >
          {selectedCrop ? (
            <PlantInfoPanel plant={selectedCrop.crop.plant} />
          ) : (
            <Stack gap="xs" align="center" justify="center" h="100%">
              <Text fz="sm" c="dimmed" ta="center">
                Clique em um cultivo para ver detalhes da planta.
              </Text>
            </Stack>
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
            Editar padrão
          </Button>
          <Button variant="default" disabled>
            Clonar padrão
          </Button>
        </Group>
        {isAuthor && (
          <Tooltip label="Excluir padrão">
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
          </Tooltip>
        )}
      </Group>
    </Stack>
  );
}

interface PatternPreviewPanelProps {
  pattern: CroppingPatternReadData;
  rows: RenderedRow[];
  selectedCrop: RenderedCrop | null;
  onCropSelect: (crop: RenderedCrop) => void;
  svgProps?: React.SVGProps<SVGSVGElement>;
};

function PatternPreviewPanel({ pattern, rows, selectedCrop, onCropSelect, svgProps }: PatternPreviewPanelProps) {

  return (
    <svg
      width="100%"
      preserveAspectRatio="xMinYMin meet"
      style={{ display: "block" }}
      {...svgProps}
    >
      {/* Row labels + start-offset line + row line (invisible) */}
      {rows.map((r) => {
        const row = pattern.rows[r.rowIndex];
        return (
          <g key={`row-${r.rowIndex}`}>
            {/* Top label: "Linha N — purpose" */}
            <text
              x={r.rowXM}
              y={Math.max(r.rowStartYM - 1.5, 0.5)}
              fontSize={TEXT_PX * 0.13}
              fill={TEXT_COLOR}
              fontWeight={600}
              textAnchor="middle"
            >
              {`Linha ${row.position}`}
              {/* {`Linha ${row.position} — ${describeRowPurpose(row)}`} */}
            </text>

            {/* Start-offset line (top → cropsOffsetM) */}
            <line
              x1={r.rowXM}
              y1={ROW_TOP_PADDING_M}
              x2={r.rowXM}
              y2={r.rowStartYM}
              stroke={SPACING_COLOR}
              strokeDasharray="0.4 0.3"
              strokeWidth={0.05}
            />
            <text
              x={r.rowXM - ROW_START_OFFSET_LABEL_GAP_M}
              y={(ROW_TOP_PADDING_M + r.rowStartYM) / 2}
              fontSize={TEXT_PX * 0.12}
              fill={TEXT_COLOR_MUTED}
              textAnchor="end"
              dominantBaseline="middle"
            >
              {formatLengthM(r.rowStartOffsetM)}
            </text>

            {/* Row line itself (invisible) */}
            <line
              x1={r.rowXM}
              y1={r.rowStartYM}
              x2={r.rowXM}
              y2={r.rowEndYM}
              stroke="transparent"
              strokeWidth={0.4}
            />

            {/* Crop circles + hover/click */}
            {r.crops.map((c) => {
              const isSelected =
                selectedCrop?.rowIndex === c.rowIndex &&
                selectedCrop?.cropIndex === c.cropIndex;
              return (
                <g key={`crop-${r.rowIndex}-${c.cropIndex}`}>
                  <circle
                    cx={c.xM}
                    cy={c.yM}
                    r={CROP_RADIUS_M}
                    fill={c.crop.plant.colorHex}
                    stroke={isSelected ? TEXT_COLOR : "transparent"}
                    strokeWidth={isSelected ? 0.15 : 0}
                    style={{ cursor: "pointer" }}
                    onClick={() => onCropSelect(c)}
                  >
                    <title>
                      {`${c.crop.plant.acceptedTaxonName}` +
                        (c.crop.plant.popularNames?.[0]
                          ? ` — ${c.crop.plant.popularNames[0]}`
                          : "")}
                    </title>
                  </circle>
                </g>
              );
            })}

            {/* Per-crop spacing lines */}
            {r.cropSpacings.map((s) => (
              <g key={`cs-${r.rowIndex}-${s.cropIndex}`}>
                <line
                  x1={s.xM}
                  y1={s.yM}
                  x2={s.xM}
                  y2={s.yM + Math.max(s.lengthM, 0.05)}
                  stroke={SPACING_COLOR}
                  strokeWidth={0.05}
                />
                <text
                  x={s.xM + ROW_START_OFFSET_LABEL_GAP_M}
                  y={s.yM + Math.max(s.lengthM, 0.05) / 2}
                  fontSize={TEXT_PX * 0.11}
                  fill={TEXT_COLOR_MUTED}
                  textAnchor="start"
                  dominantBaseline="middle"
                >
                  {s.label}
                </text>
              </g>
            ))}
          </g>
        );
      })}

      {/* Row-spacing (distanceToNextRowM) lines, drawn last so they sit on top */}
      {rows.map((r) => (
        <g key={`rs-${r.rowIndex}`}>
          {r.rowIndex < rows.length - 1 ? (
            <>
              <line
                x1={r.rowSpacingXM + ROW_SPACING_PADDING_M}
                y1={r.rowSpacingYM}
                x2={r.rowSpacingEndXM - ROW_SPACING_PADDING_M}
                y2={r.rowSpacingYM}
                stroke={SPACING_COLOR}
                strokeWidth={0.07}
              />
              <text
                x={(r.rowSpacingXM + r.rowSpacingEndXM) / 2}
                y={r.rowSpacingYM - ROW_START_OFFSET_LABEL_GAP_M}
                fontSize={TEXT_PX * 0.12}
                fill={TEXT_COLOR_MUTED}
                textAnchor="middle"
              >
                {r.rowSpacingLabel}
              </text>
            </>
          ) : (
            <text
              x={r.rowSpacingXM}
              y={r.rowSpacingYM + ROW_SPACING_PADDING_M * 1.5}
              fontSize={TEXT_PX * 0.1}
              fill={TEXT_COLOR_MUTED}
              textAnchor="start"
            >
              (última linha)
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

function PlantInfoPanel({ plant }: { plant: PlantReadData }) {
  const popularNames = plant.popularNames ?? [];
  return (
    <Stack gap="xs">
      <Group gap={6} wrap="nowrap" align="center">
        <Text fw={600} fz="sm" style={{ flex: 1 }}>
          {plant.acceptedTaxonName}
        </Text>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => window.open(`/plants/${plant.id}`, "_blank")}
          aria-label="Abrir página da planta em nova aba"
        >
          <IconExternalLink size={14} />
        </ActionIcon>
      </Group>
      <Text fz="xs" c="dimmed">
        Nomes populares
      </Text>
      {popularNames.length ? (
        <Stack gap={2}>
          {popularNames.map((name) => (
            <Text fz="xs" key={name}>
              • {name}
            </Text>
          ))}
        </Stack>
      ) : (
        <Text fz="xs" c="dimmed" fs="italic">
          Sem nomes populares cadastrados.
        </Text>
      )}
    </Stack>
  );
}