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
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip as MantineTooltip,
} from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";
import { modals } from "@mantine/modals";
import { IconChevronLeft, IconExternalLink } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CroppingPatternReadData,
  CroppingPatternWriteRequestData,
  createCroppingPattern,
  getCroppingPatternList,
  PatternCrop,
  PatternRow,
  updateCroppingPattern,
} from "../../apis/agroforestry";
import { showMutationError } from "../../apis/common";
import { getPlantList, getPlantPopularNameList, PlantReadData } from "../../apis/catalog";
import { useAuth } from "../../hooks/useAuth";
import { useProject } from "../../hooks/useProject";
import { QueryLoader } from "../common/QueryLoader";
import DeleteButton from "../common/DeleteButton";
import FieldView from "../common/FieldView";
import { showError, showSuccess } from "../common/notifications";
import { CropLegend, NativityBadge } from ".";
import PatternPreviewPanel, { buildPreviewGeometry, CropPosition, SelectedElement } from "./PatternPreviewPanel";

/**
 * Internal form shape. Mirrors `CroppingPatternWriteRequestData` with extra
 * `id` fields on rows and crops for stable React keys; those get stripped by
 * `transformValues` before submission. `position` is implicit (derived from
 * array index) and never carries transient state.
 */
export interface CroppingPatternFormValues {
  name: string;
  description: string;
  rows: {
    id: string;
    purposeId: number;
    distanceToNextRowM: number;
    cropsOffsetM: number;
    crops: {
      id: string;
      plantId: number;
      distanceToNextCropM: number;
    }[];
  }[];
}

interface CroppingPatternEditProps {
  /**
   * Pattern to edit. `undefined` => creating a new pattern.
   */
  pattern?: CroppingPatternReadData;
  /**
   * When `true`, the form is initialised from `pattern` (if any) but the
   * save button calls `createCroppingPattern` rather than
   * `updateCroppingPattern`. Used by the "Clonar padrão" entry point.
   */
  clone?: boolean;
  onBackToList: () => void;
  onSaved: () => void;
}

export default function CroppingPatternEdit({
  pattern,
  clone = false,
  onBackToList,
  onSaved,
}: CroppingPatternEditProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const plantsQueryOptions = {
    queryKey: ['plantList'],
    queryFn: getPlantList,
  };
  const plants = useQuery(plantsQueryOptions);

  // Used for name-uniqueness validation on save.
  const patternsQueryOptions = {
    queryKey: ['croppingPatternList', 'with_rows=true'],
    queryFn: getCroppingPatternList,
  };
  const patterns = useQuery(patternsQueryOptions);

  const plantsById = useMemo(() => {
    const map = new Map<number, PlantReadData>();
    if (plants.data) {
      for (const p of plants.data) map.set(p.id, p);
    }
    return map;
  }, [plants.data]);

  const initialValues: CroppingPatternFormValues = useMemo(() => {
    if (pattern) {
      return {
        name: pattern.name,
        description: pattern.description,
        rows: pattern.rows.map((r, i) => ({
          id: rowKey(i),
          purposeId: (r as unknown as { purposeId?: number }).purposeId ?? 0,
          distanceToNextRowM: r.distanceToNextRowM,
          cropsOffsetM: r.cropsOffsetM,
          crops: r.crops.map((c, j) => ({
            id: cropKey(i, j),
            plantId: c.plant.id,
            distanceToNextCropM: c.distanceToNextCropM,
          })),
        })),
      };
    }
    // New pattern: a single row with a single crop slot waiting for a plant.
    return {
      name: '',
      description: '',
      rows: [{
        id: rowKey(0),
        purposeId: 0,
        distanceToNextRowM: 1,
        cropsOffsetM: 0,
        crops: [{
          id: cropKey(0, 0),
          plantId: 0,
          distanceToNextCropM: 1,
        }],
      }],
    };
  }, [pattern]);

  const patternForm = useForm<CroppingPatternFormValues>({
    mode: 'controlled',
    initialValues,
    validate: {
      name: (value) =>
        value.trim().length === 0 ? 'Campo obrigatório' : null,
    },
    transformValues: (values) => ({
      name: values.name.trim(),
      description: values.description,
      rows: values.rows.map((r) => ({
        id: r.id,
        purposeId: r.purposeId,
        distanceToNextRowM: r.distanceToNextRowM,
        cropsOffsetM: r.cropsOffsetM,
        crops: r.crops.map((c) => ({
          id: c.id,
          plantId: c.plantId,
          distanceToNextCropM: c.distanceToNextCropM,
        })),
      })),
    }),
  });

  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [pending, setPending] = useState<
    | { kind: 'crop'; rowIndex: number; cropIndex: number }
    | { kind: 'row'; rowIndex: number }
    | null
  >(pattern ? null : { kind: 'crop', rowIndex: 0, cropIndex: 0 });

  /**
   * Synthetic `CroppingPatternReadData` for the writing preview. Plants are
   * resolved from `plantsById` (or the pending placeholder when missing).
   * Array index in `rows` / `crops` encodes the position.
   */
  const syntheticPattern: CroppingPatternReadData = useMemo(() => ({
    id: pattern?.id ?? 0,
    name: patternForm.values.name,
    description: patternForm.values.description,
    isPublic: pattern?.isPublic ?? false,
    sourcePatternId: pattern?.sourcePatternId ?? 0,
    author: pattern?.author ?? user!,
    rows: patternForm.values.rows.map((r, ri) => ({
      position: ri + 1,
      purpose: '',
      cropsOffsetM: r.cropsOffsetM,
      distanceToNextRowM: r.distanceToNextRowM,
      crops: r.crops.map((c, ci) => ({
        position: ci + 1,
        plant: plantsById.get(c.plantId) ?? PENDENTE_PLANT,
        distanceToNextCropM: c.distanceToNextCropM,
      })),
    })),
  }), [patternForm.values, plantsById, pattern, user]);

  const mutations = useMutation({
    mutationFn: ({ id, data }: { id?: number; data: CroppingPatternWriteRequestData }) =>
      id !== undefined
        ? updateCroppingPattern({ id, data })
        : createCroppingPattern({ data }),
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'croppingPatternList',
      });
      onSaved();
    },
    onError: showMutationError,
  });

  /**
   * Map the form values into the write-shape expected by the API. We do this
   * here (rather than inside `transformValues`) so the form values keep
   * matching the type Mantine v8 expects from its transform callback.
   */
  const toWriteData = (values: CroppingPatternFormValues): CroppingPatternWriteRequestData => ({
    name: values.name.trim(),
    description: values.description,
    rows: values.rows.map((r) => ({
      purposeId: r.purposeId,
      distanceToNextRowM: r.distanceToNextRowM,
      cropsOffsetM: r.cropsOffsetM,
      crops: r.crops.map((c) => ({
        plantId: c.plantId,
        distanceToNextCropM: c.distanceToNextCropM,
      })),
    })),
  });

  const handleSubmit = () => {
    const formValidation = patternForm.validate();
    if (formValidation.hasErrors) {
      showError('Há campos inválidos no formulário.', 'Erro');
      return;
    }
    const values = patternForm.values;

    // Row/crop count sanity checks.
    if (values.rows.length === 0) {
      showError('O padrão deve ter pelo menos uma linha.', 'Erro');
      return;
    }
    const emptyRowIndex = values.rows.findIndex((r) => r.crops.length === 0);
    if (emptyRowIndex !== -1) {
      showError(`A linha ${emptyRowIndex + 1} não tem cultivos.`, 'Erro');
      return;
    }
    const placeholderCropIndex = values.rows
      .flatMap((r, ri) => r.crops.map((c, ci) => ({ ri, ci, plantId: c.plantId })))
      .findIndex((c) => c.plantId === 0);
    if (placeholderCropIndex !== -1) {
      showError('Há cultivos pendentes (sem planta definida).', 'Erro');
      return;
    }

    // Name uniqueness (skip the pattern itself; skip when cloning).
    const conflicting = (patterns.data ?? []).find(
      (p) => p.name === values.name && (p.id !== pattern?.id || clone),
    );
    if (conflicting) {
      patternForm.setFieldError('name', 'Igual a nome já cadastrado para outro padrão');
      showError('Há campos inválidos no formulário.', 'Erro');
      return;
    }

    mutations.mutate({
      id: !clone && pattern ? pattern.id : undefined,
      data: toWriteData(values),
    });
  };

  const handleCancel = () => {
    modals.openConfirmModal({
      title: 'Deseja descartar as mudanças?',
      children: (
        <Text>
          Você está prestes a fechar o padrão sem salvar. Todas as alterações
          feitas serão descartadas.
        </Text>
      ),
      labels: { confirm: 'Descartar mudanças', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: onBackToList,
    });
  };

  // -------------------------------------------------------------------------
  // Editor handlers — fed down to the writing preview.
  // -------------------------------------------------------------------------

  const handleCropSelect = ({ rowIndex, cropIndex }: CropPosition) => {
    setSelected((prev) => {
      const isReselection = prev?.type === 'crop' && prev.rowIndex === rowIndex && prev.cropIndex === cropIndex;
      if (isReselection) return null;

      return {
        type: 'crop',
        rowIndex,
        cropIndex,
      }
    });

    setPending(null);
  };

  const handleRowSelect = (rowIndex: number) => {
    setSelected((prev) => {
      const isReselection = prev?.type === 'row' && prev.rowIndex === rowIndex;
      if (isReselection) return null;

      return {
        type: 'row',
        rowIndex,
      }
    });

    setPending(null);
  };

  const handleRowMoveLeft = (rowIndex: number) => {
    if (rowIndex === 0) return;
    const next = patternForm.values.rows.slice();
    [next[rowIndex - 1], next[rowIndex]] = [next[rowIndex], next[rowIndex - 1]];
    patternForm.setFieldValue('rows', next);
    setSelected(null);
    setPending(null);
  };

  const handleRowMoveRight = (rowIndex: number) => {
    const rows = patternForm.values.rows;
    if (rowIndex >= rows.length - 1) return;
    const next = rows.slice();
    [next[rowIndex + 1], next[rowIndex]] = [next[rowIndex], next[rowIndex + 1]];
    patternForm.setFieldValue('rows', next);
    setSelected(null);
    setPending(null);
  };

  const handleAddCropLast = (rowIndex: number) => {
    setPending({
      kind: 'crop',
      rowIndex,
      cropIndex: patternForm.values.rows[rowIndex].crops.length,
    });
    setSelected(null);
  };

  const handleAddCropBetween = (rowIndex: number, afterCropIndex: number) => {
    setPending({ kind: 'crop', rowIndex, cropIndex: afterCropIndex + 1 });
    setSelected(null);
  };

  const handleAddCropFirst = (rowIndex: number) => {
    setPending({ kind: 'crop', rowIndex, cropIndex: 0 });
    setSelected(null);
  };

  const handleAddRow = () => {
    setPending({ kind: 'row', rowIndex: patternForm.values.rows.length });
    setSelected(null);
  };

  const handlePlantPicked = (plantId: number) => {
    if (!pending) return;

    if (pending.kind === 'crop') {
      const next = patternForm.values.rows.slice();
      if (!next[pending.rowIndex]) return;
      const row = { ...next[pending.rowIndex], crops: next[pending.rowIndex].crops.slice() };
      row.crops.splice(pending.cropIndex, 0, {
        id: cropKey(pending.rowIndex, pending.cropIndex),
        plantId,
        distanceToNextCropM: 1,
      });
      next[pending.rowIndex] = row;
      patternForm.setFieldValue('rows', next);
    } else {
      const next = patternForm.values.rows.slice();
      next.splice(pending.rowIndex, 0, {
        id: rowKey(pending.rowIndex),
        purposeId: 0,
        distanceToNextRowM: 2,
        cropsOffsetM: 0,
        crops: [{
          id: cropKey(pending.rowIndex, 0),
          plantId,
          distanceToNextCropM: 1,
        }],
      });
      patternForm.setFieldValue('rows', next);
    }
    setPending(null);
    setSelected(null);
  };

  const handleDeleteRow = (rowIndex: number) => {
    patternForm.setFieldValue(
      'rows',
      patternForm.values.rows.filter((_, i) => i !== rowIndex),
    );
    setSelected(null);
    setPending(null);
  };

  const handleDeleteCrop = (rowIndex: number, cropIndex: number) => {
    patternForm.setFieldValue('rows', patternForm.values.rows.map((r, i) =>
      i === rowIndex
        ? { ...r, crops: r.crops.filter((_, j) => j !== cropIndex) }
        : r,
    ));
    setSelected(null);
    setPending(null);
  };

  // -------------------------------------------------------------------------
  // Side-panel selection state.
  // -------------------------------------------------------------------------

  const selectedRow = selected?.type === 'row' ? selected : null;
  const selectedCrop = selected?.type === 'crop' ? selected : null;
  const selectedRowData = selectedRow !== null
    ? syntheticPattern.rows[selectedRow.rowIndex]
    : null;
  const selectedCropData = selectedCrop !== null
    ? syntheticPattern.rows[selectedCrop.rowIndex]?.crops[selectedCrop.cropIndex] ?? null
    : null;
    
  const { totalYM } = useMemo(
    () => buildPreviewGeometry(syntheticPattern),
    [pattern]
  );

  const panelHeightPx = Math.max(400, totalYM * 30);

  if (!plants.data) {
    return <QueryLoader {...plantsQueryOptions} />;
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Button
          variant="subtle"
          size="xs"
          w={160}
          leftSection={<IconChevronLeft size={16} />}
          onClick={handleCancel}
        >
          Voltar para a lista
        </Button>
        <Text p={0} fw={600} fz="md">
          {pattern && !clone
            ? `Editar: ${pattern.name}`
            : pattern && clone
              ? `Clonar: ${pattern.name}`
              : 'Novo padrão'}
        </Text>
        <div style={{ width: 160 }} />
      </Group>

      <Group align="flex-start" gap="md" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0, height: panelHeightPx }}>
          <PatternPreviewPanel
            pattern={syntheticPattern}
            selectedElement={selected}
            onCropSelect={handleCropSelect}
            onRowSelect={handleRowSelect}
            edit
            editHandlers={{
              onRowMoveLeft: handleRowMoveLeft,
              onRowMoveRight: handleRowMoveRight,
              onAddRow: handleAddRow,
              onAddCropFirst: handleAddCropFirst,
              onAddCropBetween: handleAddCropBetween,
              onAddCropLast: handleAddCropLast,
            }}
            // pendingCrop={pending?.kind === 'crop' ? pending : null}
            // pendingRowIndex={pending?.kind === 'row' ? pending.rowIndex : null}
          />
        </Box>

        <Paper withBorder p="sm" w={280} style={{ minHeight: panelHeightPx }}>
          {pending ? (
            <CropInputPanel
              mode="pending"
              plants={plants.data}
              onPickPlant={handlePlantPicked}
            />
          ) : selectedCropData ? (
            <CropInputPanel
              mode="edit"
              patternForm={patternForm}
              rowIndex={selectedCrop.rowIndex!}
              cropIndex={selectedCrop.cropIndex!}
              crop={selectedCropData}
              plants={plants.data}
              onPickPlant={(plantId) => {
                patternForm.setFieldValue(
                  `rows.${selectedCrop.rowIndex}.crops.${selectedCrop.cropIndex}.plantId`,
                  plantId,
                );
              }}
              onDelete={() => handleDeleteCrop(selectedCrop.rowIndex!, selectedCrop.cropIndex!)}
            />
          ) : selectedRowData ? (
            <RowInputPanel
              patternForm={patternForm}
              rowIndex={selectedRow.rowIndex!}
              row={selectedRowData}
              onDelete={() => handleDeleteRow(selectedRow.rowIndex!)}
            />
          ) : (
            <PatternFormPanel patternForm={patternForm} />
          )}
        </Paper>
      </Group>

      <Group justify="space-between" gap="xs">
        <Group gap="xs">
          <Button onClick={handleSubmit} loading={mutations.isPending}>
            Salvar
          </Button>
          <Button variant="default" onClick={handleCancel}>
            Cancelar
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Side panels
// ---------------------------------------------------------------------------

function PatternFormPanel({
  patternForm,
}: {
  patternForm: UseFormReturnType<CroppingPatternFormValues>;
}) {
  return (
    <Stack gap="sm">
      <TextInput
        label="Nome"
        placeholder="Nome do padrão"
        {...patternForm.getInputProps('name')}
      />
      <Textarea
        label="Descrição"
        placeholder="Descreva o padrão (opcional)"
        autosize
        minRows={4}
        {...patternForm.getInputProps('description')}
      />
    </Stack>
  );
}

function RowInputPanel({
  patternForm,
  rowIndex,
  row,
  onDelete,
}: {
  patternForm: UseFormReturnType<CroppingPatternFormValues>;
  rowIndex: number;
  row: PatternRow;
  onDelete: () => void;
}) {
  // Placeholder purpose options until `getCroppingRowPatterns` is implemented.
  // See commented skeleton below.
  const purposeOptions = [
    { value: '1', label: 'Cobertura' },
    { value: '2', label: 'Adubação' },
    { value: '3', label: 'Produção' },
  ];

  /*
  // Skeleton: when `getCroppingRowPatterns` lands, replace the placeholder
  // list with this `useQuery`.
  const purposesQuery = useQuery({
    queryKey: ['croppingRowPatterns'],
    queryFn: getCroppingRowPatterns,
  });
  */

  const cropsLegend = row.crops.map((c, i) => (
    <CropLegend key={i} plant={c.plant} />
  ));

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="baseline">
        <Text fw="bold">Linha {rowIndex + 1}</Text>
        <DeleteButton
          modalTitle="Remover linha do padrão?"
          modalContent={
            <Text size="sm">
              Você está prestes a <strong>remover</strong> a linha {rowIndex + 1}
              {' '}do padrão, junto com todos os seus cultivos.
            </Text>
          }
          onModalConfirm={onDelete}
        />
      </Group>
      <Select
        label="Função"
        data={purposeOptions}
        value={String(patternForm.values.rows[rowIndex].purposeId ?? '')}
        onChange={(value) => {
          patternForm.setFieldValue(`rows.${rowIndex}.purposeId`, Number(value ?? 0));
        }}
        allowDeselect={false}
      />
      <FieldView fz="sm" label="Cultivos">
        {cropsLegend.length > 0 ? cropsLegend : <Text c="dimmed" fz="sm">Nenhum cultivo</Text>}
      </FieldView>
    </Stack>
  );
}

interface CropInputPanelProps {
  mode: 'edit' | 'pending';
  plants: PlantReadData[];
  onPickPlant: (plantId: number) => void;
  // edit-mode extras:
  patternForm?: UseFormReturnType<CroppingPatternFormValues>;
  rowIndex?: number;
  cropIndex?: number;
  crop?: PatternCrop;
  onDelete?: () => void;
}

function CropInputPanel({
  mode,
  plants,
  onPickPlant,
  patternForm,
  rowIndex,
  cropIndex,
  crop,
  onDelete,
}: CropInputPanelProps) {
  const { plantsFitnessMap } = useProject();

  const rankedPlants = useMemo(() => {
    return plants.slice().sort((a, b) => {
      const fa = plantsFitnessMap[a.acceptedTaxonName]?.fitnessScore ?? -Infinity;
      const fb = plantsFitnessMap[b.acceptedTaxonName]?.fitnessScore ?? -Infinity;
      if (fb !== fa) return fb - fa;
      return a.mainPopularName.localeCompare(b.mainPopularName);
    });
  }, [plants, plantsFitnessMap]);

  const selectData = rankedPlants.map((p) => ({
    value: String(p.id),
    label: `${p.mainPopularName} (${p.acceptedTaxonName})`,
  }));

  const currentPlantId = mode === 'edit' && patternForm && rowIndex !== undefined && cropIndex !== undefined
    ? patternForm.values.rows[rowIndex].crops[cropIndex].plantId
    : null;
  const currentPlant = currentPlantId !== null && currentPlantId !== 0
    ? plants.find((p) => p.id === currentPlantId) ?? null
    : (crop?.plant ?? null);

  const plantFitness = currentPlant ? plantsFitnessMap[currentPlant.acceptedTaxonName] : null;

  const popularNamesQueryOptions = currentPlant
    ? {
        queryKey: ['plantPopularNameList', String(currentPlant.id)],
        queryFn: getPlantPopularNameList,
      }
    : { queryKey: ['plantPopularNameList', 'none'] as string[], queryFn: () => Promise.resolve([]) };
  const popularNames = useQuery(popularNamesQueryOptions);

  return (
    <Stack gap="xs">
      {mode === 'edit' && currentPlant && (
        <Group gap={6} wrap="nowrap" align="baseline">
          <Text fw="bold" fs="italic" style={{ flex: 1 }}>
            {currentPlant.acceptedTaxonName}
          </Text>
          {plantFitness && <NativityBadge plantFitness={plantFitness} />}
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => window.open(`/plants/${currentPlant.id}`, '_blank')}
            aria-label="Abrir página da planta em nova aba"
          >
            <IconExternalLink size={14} />
          </ActionIcon>
        </Group>
      )}
      {mode === 'edit' && currentPlant && popularNames.data && popularNames.data.length > 0 && (
        <Text fz="sm">
          {popularNames.data.map((n) => n.name).join(', ')}
        </Text>
      )}
      <Select
        label={mode === 'pending' ? 'Escolha uma planta' : 'Planta'}
        placeholder={mode === 'pending' ? 'Selecione...' : undefined}
        searchable
        data={selectData}
        value={currentPlantId !== null ? String(currentPlantId) : null}
        onChange={(value) => onPickPlant(Number(value ?? 0))}
      />
      {mode === 'edit' && onDelete && (
        <MantineTooltip label="Excluir cultivo">
          <div>
            <DeleteButton
              modalTitle="Remover cultivo do padrão?"
              modalContent={
                <Text size="sm">
                  Você está prestes a <strong>remover</strong> este cultivo da linha.
                </Text>
              }
              onModalConfirm={onDelete}
            />
          </div>
        </MantineTooltip>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowKey(i: number): string {
  return `row-${i}-${Math.random().toString(36).slice(2, 8)}`;
}

function cropKey(i: number, j: number): string {
  return `crop-${i}-${j}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Placeholder plant used in the synthetic `CroppingPatternReadData` while a
 * pending crop has no plant picked. White fill at the marker layer makes the
 * "pending" state visually obvious.
 */
const PENDENTE_PLANT: PlantReadData = {
  id: 0,
  contentId: 0,
  contentStatus: 'pending',
  acceptedTaxonName: 'Pendente',
  acceptedFamilyName: '',
  mainPopularName: 'Pendente',
  colorHex: '#ffffff',
};
