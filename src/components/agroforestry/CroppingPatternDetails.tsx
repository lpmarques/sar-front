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
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CroppingPatternReadData,
  deleteCroppingPattern,
  getCroppingPattern,
} from "../../apis/agroforestry";
import { getPlantPopularNameList } from "../../apis/catalog";
import { showMutationError } from "../../apis/common";
import { useAuth } from "../../hooks/useAuth";
import { useProject } from "../../hooks/useProject";
import { capitalize } from "../../utils/common";
import DeleteButton from "../common/DeleteButton";
import FieldView from "../common/FieldView";
import { showSuccess } from "../common/notifications";
import { QueryLoader } from "../common/QueryLoader";
import { UserName } from "../user";
import PatternPreviewPanel, {
  buildPreviewGeometry,
  CropPosition,
  SelectedElement,
} from "./PatternPreviewPanel";
import { CropLegend, NativityBadge } from ".";

interface CroppingPatternDetailsProps {
  patternId: number;
  onBackToList: () => void;
  onSelect?: () => void;
  onEdit?: () => void;
  onCopy?: () => void;
  onDeleted?: () => void;
}

export default function CroppingPatternDetails({
  patternId,
  onBackToList,
  onSelect,
  onEdit,
  onCopy,
  onDeleted,
}: CroppingPatternDetailsProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const queryClient = useQueryClient();
  
  const patternQueryOptions = {
    queryKey: [
      'croppingPattern',
      patternId.toString(),
      'with_user_count=true',
    ],
    queryFn: getCroppingPattern,
  };

  const patternQuery = useQuery(patternQueryOptions);
  const pattern = patternQuery.data;

  const isAuthor = user?.id === pattern?.author.id;
  const isOnUse = (pattern?.usersCount ?? 0) > 0;
  
  const { totalYM } = useMemo(
    () => pattern ? buildPreviewGeometry(pattern) : { totalYM: 0 },
    [pattern]
  );
  
  const patternDeletion = useMutation({
    mutationFn: deleteCroppingPattern,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.refetchQueries({
        predicate: (q) => q.queryKey[0] === 'croppingPatternList',
      });
      onDeleted?.();
    },
    onError: showMutationError,
  });

  const handleCropSelect = ({ rowIndex, cropIndex }: CropPosition) => {
    setSelected((prev) => {
      const isReselection = prev?.kind === 'crop' 
        && prev.rowIndex === rowIndex 
        && prev.cropIndex === cropIndex;
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

  const selectedRow = selected?.kind === 'row' ? selected : null;
  const selectedCrop = selected?.kind === 'crop' ? selected : null;

  const panelHeightPx = Math.max(400, totalYM * 30);

  if (!pattern)
    return (
      <QueryLoader {...patternQueryOptions} />
    )

  return (
    <Stack gap="md">
      {onBackToList &&
      <Group justify="space-between" align="center">
        <Tooltip label="Listar todos os padrões disponíveis">
          <Button
            variant="subtle"
            size="xs"
            w={155}
            leftSection={<IconChevronLeft size={16} />}
            onClick={onBackToList}
            >
            Ver mais padrões
          </Button>
        </Tooltip>
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
          {selectedCrop ? (
            <CropInfoPanel pattern={pattern} cropPosition={selectedCrop} />
          ) : selectedRow ? (
            <RowInfoPanel pattern={pattern} rowIndex={selectedRow.rowIndex} />
          ) : (
            <PatternInfoPanel pattern={pattern} />
          )}
        </Paper>
      </Group>

      <Group gap="xs">
        {onSelect &&
        <Button onClick={onSelect}>
          Selecionar padrão
        </Button>}
        {onCopy &&
        <Tooltip label="Criar um novo padrão a partir deste">
          <Button
            variant="default"
            onClick={onCopy}
          >
            Copiar
          </Button>
        </Tooltip>}
        {isAuthor && onEdit &&
        <Tooltip label={
          isOnUse 
            ? "Não pode ser editado enquanto em uso por outros usuários"
            : "Editar padrão, substituindo-o"
          }
        >
          <Button
            variant="default"
            onClick={onEdit}
            disabled={isOnUse}
          >
            Editar
          </Button>
        </Tooltip>}
        {isAuthor &&
        <Tooltip label={
          isOnUse 
            ? "Não pode ser excluído enquanto em uso por outros usuários"
            : "Excluir padrão"
          }>
          <DeleteButton
            disabled={isOnUse}
            confirmModal={{
              title: "Remover padrão?",
              children: (
                <Text size="sm">
                  Você está prestes a <strong>excluir</strong> o padrão
                  {' '}<strong>{pattern.name}</strong>. Isso afetará
                  {' '}suas áreas de cultivo que estejam utilizando ele.
                  <br/>
                  <br/>
                  Obs.: só será possível excluir o padrão se ele não estiver 
                  {' '}em uso por outros usuários da plataforma.
                </Text>
              ),
              onConfirm: () => patternDeletion.mutate(pattern.id),
              submodal: true,
            }}
          />
        </Tooltip>}
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

interface RowInfoPanelProps {
  pattern: CroppingPatternReadData;
  rowIndex: number;
}

function RowInfoPanel({ pattern, rowIndex }: RowInfoPanelProps) {
  const row = pattern.rows[rowIndex];

  const cropsLegend = row.crops.map((c, i) =>
    <CropLegend key={`crop-${i}`} plant={c.plant} />
  );

  return (
    <Stack gap="sm">
      <Text fw="bold">
        Linha {row.position}
      </Text>
      <FieldView fz={15} label="Função" key="purpose">
        {capitalize(row.purpose)}
      </FieldView>
      <FieldView fz={15} label="Cultivos" key="crops">
        {cropsLegend}
      </FieldView>
    </Stack>
  );
}

interface CropInfoPanelProps {
  pattern: CroppingPatternReadData;
  cropPosition: CropPosition;
}

function CropInfoPanel({ pattern, cropPosition }: CropInfoPanelProps) {
  const project = useProject();

  const crop = pattern.rows[cropPosition.rowIndex].crops[cropPosition.cropIndex];
  const plantFitness = project?.plantsFitnessMap[crop.plant.acceptedTaxonName];

  const popularNamesQueryOptions = {
    queryKey: [
      'plantPopularNameList',
      crop.plant.id.toString(),
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
          {crop.plant.acceptedTaxonName}
        </Text>
        {plantFitness &&
        <NativityBadge plantFitness={plantFitness} />}
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={() => window.open(`/plants/${crop.plant.id}`, "_blank")}
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
        <FieldView fz="sm" label="Linha" key="row-pos">{cropPosition.rowIndex + 1}</FieldView>
        <FieldView fz="sm" label="Posição" key="crop-pos">{cropPosition.cropIndex + 1}</FieldView>
      </Stack>
    </Stack>
  );
}
