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
  PatternRow,
} from "../../apis/agroforestry";
import { getPlantPopularNameList, PlantReadData } from "../../apis/catalog";
import { useAuth } from "../../hooks/useAuth";
import { useProject } from "../../hooks/useProject";
import { QueryLoader } from "../common/QueryLoader";
import FieldView from "../common/FieldView";
import { UserName } from "../user";
import PatternPreviewPanel, {
  RenderedCrop,
  RenderedRow,
  renderRows,
} from "./PatternPreviewPanel";
import { CropLegend, NativityBadge } from ".";

interface CroppingPatternPreviewProps {
  pattern: CroppingPatternReadData;
  onSelect?: (patternId: number) => void;
  onBackToList?: () => void;
  onEdit?: (patternId: number) => void;
  onClone?: (patternId: number) => void;
}

export default function CroppingPatternPreview({
  pattern,
  onBackToList,
  onSelect,
  onEdit,
  onClone,
}: CroppingPatternPreviewProps) {
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
  };

  const handleRowSelect = (r: RenderedRow) => {
    setSelectedCrop(null);
    const secondSelection = selectedRow && selectedRow.rowIndex === r.rowIndex;

    if (secondSelection)
      return setSelectedRow(null);

    setSelectedRow(r);
  };

  const { rows, totalXM, totalYM } = useMemo(
    () => renderRows(pattern),
    [pattern]
  );

  const panelHeightPx = Math.max(400, totalYM * 30);

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
          {onClone &&
          <Button
            variant="default"
            onClick={() => onClone(pattern.id)}
          >
            Clonar padrão
          </Button>}
        {isAuthor && onEdit &&
          <Button
            variant="default"
            onClick={() => onEdit(pattern.id)}
          >
            Editar padrão
          </Button>}
        {isAuthor &&
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
          </MantineTooltip>}
        </Group>
      </Group>
    </Stack>
  );
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
    <CropLegend key={`crop-${c.plant.id}`} plant={c.plant} />
  );

  return (
    <Stack gap="sm">
      <Text fw="bold">
        Linha {row.position}
      </Text>
      <FieldView fz={15} label="Função">
        {row.purpose}
      </FieldView>
      <FieldView fz={15} label="Cultivos">
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
  };
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
