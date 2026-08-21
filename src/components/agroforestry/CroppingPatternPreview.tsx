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
  Tooltip,
} from "@mantine/core";
import {
  IconChevronLeft,
  IconExternalLink,
  IconTrash,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CroppingPatternReadData,
  deleteCroppingPattern,
  PatternRow,
} from "../../apis/agroforestry";
import { getPlantPopularNameList, PlantReadData } from "../../apis/catalog";
import { useAuth } from "../../hooks/useAuth";
import { useProject } from "../../hooks/useProject";
import { QueryLoader } from "../common/QueryLoader";
import FieldView from "../common/FieldView";
import { UserName } from "../user";
import PatternPreviewPanel, {
  buildPreviewGeometry,
  CropPosition,
  SelectedElement,
} from "./PatternPreviewPanel";
import { CropLegend, NativityBadge } from ".";
import { capitalize } from "../../utils/common";
import { showSuccess } from "../common/notifications";
import { showMutationError } from "../../apis/common";
import DeleteButton from "../common/DeleteButton";

interface CroppingPatternPreviewProps {
  pattern: CroppingPatternReadData;
  onSelect: (patternId: number) => void;
  onBackToList: () => void;
  onEdit: (patternId: number) => void;
  onClone: (patternId: number) => void;
  onDeleted: () => void;
}

export default function CroppingPatternPreview({
  pattern,
  onBackToList,
  onSelect,
  onEdit,
  onClone,
  onDeleted,
}: CroppingPatternPreviewProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const queryClient = useQueryClient();

  const isAuthor = user?.id === pattern.author.id;

  const patternDeletion = useMutation({
    mutationFn: deleteCroppingPattern,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.refetchQueries({
        predicate: (q) => q.queryKey[0] === 'croppingPatternList',
      });
      onDeleted();
    },
    onError: showMutationError,
  });

  const handleCropSelect = ({ rowIndex, cropIndex }: CropPosition) => {
    setSelected((prev) => {
      const isReselection = prev?.kind === 'crop' && prev.rowIndex === rowIndex && prev.cropIndex === cropIndex;
      if (isReselection) return null;

      return {
        kind: 'crop',
        rowIndex,
        cropIndex,
      }
    });
  };

  const handleRowSelect = (rowIndex: number) => {
    setSelected((prev) => {
      const isReselection = prev?.kind === 'row' && prev.rowIndex === rowIndex;
      if (isReselection) return null;

      return {
        kind: 'row',
        rowIndex,
      }
    });
  };

  const handlePatternDelete = () => {
    patternDeletion.mutate(pattern.id);
  };

  const selectedRow = selected?.kind === 'row' ? selected : null;
  const selectedCrop = selected?.kind === 'crop' ? selected : null;
  const selectedRowData = selectedRow !== null
    ? pattern.rows[selectedRow.rowIndex]
    : null;
  const selectedCropData = selectedCrop !== null
    ? pattern.rows[selectedCrop.rowIndex]?.crops[selectedCrop.cropIndex] ?? null
    : null;

  const { totalYM } = useMemo(
    () => buildPreviewGeometry(pattern),
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
          w={155}
          leftSection={<IconChevronLeft size={16} />}
          onClick={onBackToList}
        >
          Voltar para a lista
        </Button>
        <Text p={0} fw={600} fz="md">{pattern.name}</Text>
        <div style={{ width: 100 }} />
      </Group>}

      <Group align="flex-start" gap="md" wrap="nowrap">
        <Box
          style={{
            width: "70%",
            height: panelHeightPx,
          }}
        >
          <PatternPreviewPanel
            pattern={pattern}
            selectedElement={selected}
            onRowSelect={handleRowSelect}
            onCropSelect={handleCropSelect}
          />
        </Box>

        <Paper
          withBorder
          p="sm"
          w="30%"
          style={{ minHeight: panelHeightPx }}
        >
          {selectedCropData ? (
            <PlantInfoPanel plant={selectedCropData.plant} />
          ) : selectedRowData ? (
            <RowInfoPanel row={selectedRowData} />
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
          <Tooltip label="Copiar padrão para criar um novo">
            <Button
              variant="default"
              onClick={() => onClone(pattern.id)}
            >
              Copiar
            </Button>
          </Tooltip>}
        {isAuthor && onEdit &&
          <Tooltip label="Editar padrão, substituindo-o">
            <Button
              variant="default"
              onClick={() => onEdit(pattern.id)}
            >
              Editar
            </Button>
          </Tooltip>}
        {isAuthor &&
          <Tooltip label="Excluir padrão">
            <DeleteButton
              size="lg"
              onClick={handlePatternDelete}
            />
          </Tooltip>}
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
        Clique no título da linha ("Linha Nº") ou em um cultivo (círculo) para ver seus detalhes.
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
        {capitalize(row.purpose)}
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
