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

import { Fragment, useMemo, useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";
import { IconArrowNarrowDown, IconArrowsHorizontal, IconArrowsVertical, IconChevronLeft, IconCopy, IconExternalLink } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CroppingPatternReadData,
  CroppingPatternWriteRequestData,
  createCroppingPattern,
  getCroppingPatternList,
  getCroppingRowPurposeList,
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
import LocalConfirmModal from "../common/LocalConfirmModal";
import { showError, showSuccess } from "../common/notifications";
import { CropLegend, NativityBadge } from ".";
import PatternPreviewPanel, { buildPreviewGeometry, CropPosition, PENDING_PLANT, PendingElement, SelectedElement, SelectedSpacing } from "./PatternPreviewPanel";
import { capitalize } from "../../utils/common";

interface CroppingPatternEditProps {
  /**
   * Pattern to edit. `undefined` => creating a new pattern.
   */
  pattern?: CroppingPatternReadData;
  /**
   * When `true`, the form is initialised from `pattern` (if any) but the
   * save button calls `createCroppingPattern` rather than
   * `updateCroppingPattern`. Used by the "Copiar padrão" entry point.
   */
  copy?: boolean;
  onBackToList: () => void;
  onSaved: () => void;
}

export default function CroppingPatternEdit({
  pattern,
  copy = false,
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

  const purposes = useQuery({
    queryKey: ['croppingRowPurposeList'],
    queryFn: getCroppingRowPurposeList,
  });

  const plantsById = useMemo(() => {
    const map = new Map<number, PlantReadData>();
    if (plants.data) {
      for (const p of plants.data) map.set(p.id, p);
    }
    return map;
  }, [plants.data]);

  const initialValues: CroppingPatternWriteRequestData = useMemo(() => {
    if (pattern) {
      return {
        name: pattern.name,
        description: pattern.description,
        rows: pattern.rows.map((r) => ({
          purposeId: purposes.data?.find((p) => p.name === r.purpose)?.id ?? 0,
          distanceToNextRowM: r.distanceToNextRowM,
          cropsOffsetM: r.cropsOffsetM,
          crops: r.crops.map((c) => ({
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
        purposeId: 0,
        distanceToNextRowM: 1,
        cropsOffsetM: 0,
        crops: [{
          plantId: 0,
          distanceToNextCropM: 1,
        }],
      }],
    };
  }, [pattern, purposes.data]);

  const patternForm = useForm<CroppingPatternWriteRequestData>({
    mode: 'controlled',
    initialValues,
    validate: {
      name: (value) => value.trim().length === 0 ? 'Campo obrigatório' : null,
      description: (value) => value.trim().length === 0 ? 'Campo obrigatório' : null,
      rows: {
        purposeId: (value) => !value ? 'Campo obrigatório' : null,
        distanceToNextRowM: (value) => value <= 0 ? 'Espaçamento inválido' : null,
        crops: {
          distanceToNextCropM: (value) => value <= 0 ? 'Espaçamento inválido' : null,
        }
      }
    },
    transformValues: (values) => ({
      name: values.name.trim(),
      description: values.description.trim(),
      rows: values.rows.map((r) => ({
        purposeId: r.purposeId,
        distanceToNextRowM: Number(r.distanceToNextRowM.toFixed(2)),
        cropsOffsetM: r.cropsOffsetM,
        crops: r.crops.map((c) => ({
          plantId: c.plantId,
          distanceToNextCropM: Number(c.distanceToNextCropM.toFixed(2)),
        })),
      })),
    }),
  });

  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [pending, setPending] = useState<PendingElement | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  /**
   * Synthetic `CroppingPatternReadData` for the edit preview. Plants are
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
      purpose: purposes.data?.find((p) => p.id === r.purposeId)?.name ?? '',
      cropsOffsetM: r.cropsOffsetM,
      distanceToNextRowM: r.distanceToNextRowM,
      crops: r.crops.map((c, ci) => ({
        position: ci + 1,
        plant: plantsById.get(c.plantId) ?? PENDING_PLANT,
        distanceToNextCropM: c.distanceToNextCropM,
      })),
    })),
  }), [patternForm.values, purposes.data, plantsById, pattern, user]);

  const mutations = useMutation({
    mutationFn: ({ id, data }: { id?: number; data: CroppingPatternWriteRequestData }) =>
      id !== undefined
        ? updateCroppingPattern({ id, data })
        : createCroppingPattern({ data }),
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.refetchQueries({
        predicate: (q) => q.queryKey[0] === 'croppingPatternList',
      });
      onSaved();
    },
    onError: showMutationError,
  });

  const handleSubmit = () => {
    const values = patternForm.getTransformedValues();
    const initialValues = patternForm.getInitialValues();

    patternForm.clearErrors();
    const formValidation = patternForm.validate();

    // Name uniqueness
    const conflicting = (patterns.data ?? []).find(
      (p) => p.name === values.name && (copy || p.id !== pattern?.id),
    );
    if (conflicting)
      patternForm.setFieldError('name', 'Igual a nome já cadastrado para outro padrão');

    // Description change (when copying)
    if (copy && values.description === initialValues.description)
      patternForm.setFieldError('description', 'Igual à descrição do padrão original');

    if (formValidation.hasErrors || Object.keys(patternForm.errors).length > 0) {
      showError('Há campos inválidos no formulário.', 'Erro');

      // Pick the first nested error so the user lands on the panel that
      // contains the offending field. Spacing fields route to the spacing
      // panel; other row-/crop-nested fields route to the row/crop panel.
      // Form-level errors (name, description) need no selection — the default
      // `PatternFormPanel` already covers them.
      let focus: SelectedElement | null = null;
      for (const path of Object.keys(patternForm.errors)) {
        const cropSpacingMatch = path.match(/^rows\.(\d+)\.crops\.(\d+)\.distanceToNextCropM$/);
        if (cropSpacingMatch) {
          focus = {
            kind: 'cropSpacing',
            rowIndex: Number(cropSpacingMatch[1]),
            afterCropIndex: Number(cropSpacingMatch[2]),
          };
          break;
        }
        const rowSpacingMatch = path.match(/^rows\.(\d+)\.distanceToNextRowM$/);
        if (rowSpacingMatch) {
          focus = {
            kind: 'rowSpacing',
            afterRowIndex: Number(rowSpacingMatch[1]),
          };
          break;
        }
        const rowOffsetMatch = path.match(/^rows\.(\d+)\.cropsOffsetM$/);
        if (rowOffsetMatch) {
          focus = { kind: 'rowOffset', rowIndex: Number(rowOffsetMatch[1]) };
          break;
        }
        const cropMatch = path.match(/^rows\.(\d+)\.crops\.(\d+)\./);
        if (cropMatch) {
          focus = {
            kind: 'crop',
            rowIndex: Number(cropMatch[1]),
            cropIndex: Number(cropMatch[2]),
          };
          break;
        }
        const rowMatch = path.match(/^rows\.(\d+)\./);
        if (rowMatch) {
          focus = { kind: 'row', rowIndex: Number(rowMatch[1]) };
          break;
        }
      }
      setSelected(focus);
      return;
    }

    // Row/crop count sanity checks.
    if (values.rows.length === 0) {
      showError('O padrão deve ter pelo menos uma linha.', 'Erro');
      setSelected(null);
      return;
    }

    const emptyRowIndex = values.rows.findIndex((r) => r.crops.length === 0);
    if (emptyRowIndex !== -1) {
      showError(`A linha ${emptyRowIndex + 1} não tem cultivos.`, 'Erro');
      // patternForm.setFieldError(`rows.${emptyRowIndex}.crops.0.plantId`, 'Campo obrigatório');
      setSelected({ kind: 'row', rowIndex: emptyRowIndex });
      return;
    }

    values.rows.forEach((row, rowIndex) => {
      const pendingCropIndex = row.crops.findIndex((c) => c.plantId === 0);
      if (pendingCropIndex !== -1) {
        showError('Há cultivos pendentes (sem planta definida).', 'Erro');
        setSelected({ kind: 'crop', rowIndex, cropIndex: pendingCropIndex });
        return;
      }
    })

    mutations.mutate({
      id: !copy && pattern ? pattern.id : undefined,
      data: values,
    });
  };

  const handleCancel = () => {
    setCancelModalOpen(true);
  };

  // -------------------------------------------------------------------------
  // Editor handlers — fed down to the writing preview.
  // -------------------------------------------------------------------------

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

    setPending(null);
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

    setPending(null);
  };

  const handleRowMoveLeft = (rowIndex: number) => {
    if (rowIndex === 0) return;
    const rows = patternForm.values.rows.slice();
    [rows[rowIndex - 1], rows[rowIndex]] = [rows[rowIndex], rows[rowIndex - 1]];
    patternForm.setFieldValue('rows', rows);
    setSelected(null);
    setPending(null);
  };

  const handleRowMoveRight = (rowIndex: number) => {
    const rows = patternForm.values.rows.slice();
    if (rowIndex >= rows.length - 1) return;
    [rows[rowIndex + 1], rows[rowIndex]] = [rows[rowIndex], rows[rowIndex + 1]];
    patternForm.setFieldValue('rows', rows);
    setSelected(null);
    setPending(null);
  };

  const handleAddCropLast = (rowIndex: number) => {
    const pending: PendingElement = {
      kind: 'crop',
      rowIndex,
      cropIndex: patternForm.values.rows[rowIndex].crops.length,
      isLast: true,
    };
    setPending(pending);
    setSelected(pending);
  };

  const handleAddCropBetween = (rowIndex: number, afterCropIndex: number) => {
    const pending: PendingElement = {
      kind: 'crop',
      rowIndex,
      cropIndex: afterCropIndex + 1,
      isLast: false,
    };
    setPending(pending);
    setSelected(pending);
  };

  const handleAddCropFirst = (rowIndex: number) => {
    const pending: PendingElement = {
      kind: 'crop',
      rowIndex,
      cropIndex: 0,
      isLast: false
    };
    setPending(pending);
    setSelected(pending);
  };

  const handleAddRowLast = () => {
    const pending: PendingElement = {
      kind: 'row',
      rowIndex: patternForm.values.rows.length,
      isLast: true,
    };
    setPending(pending);
    setSelected(pending);
  };

  const handleAddRowBetween = (afterRowIndex: number) => {
    const pending: PendingElement = {
      kind: 'row',
      rowIndex: afterRowIndex + 1,
      isLast: false
    };
    setPending(pending);
    setSelected(pending);
  }

  const handlePlantPicked = (plantId: number) => {
    if (!pending) return;

    if (pending.kind === 'crop') {
      const rows = patternForm.values.rows.slice();
      if (!rows[pending.rowIndex]) return;
      const row = { ...rows[pending.rowIndex], crops: rows[pending.rowIndex].crops.slice() };
      let spacingM = 1;
      if (pending.cropIndex > 0 && !pending.isLast) {
        spacingM = row.crops[pending.cropIndex-1].distanceToNextCropM / 2;
        row.crops.splice(pending.cropIndex-1, 1, {
          ...row.crops[pending.cropIndex-1],
          distanceToNextCropM: spacingM,
        });
      }
      row.crops.splice(pending.cropIndex, 0, {
        plantId,
        distanceToNextCropM: spacingM,
      });
      rows[pending.rowIndex] = row;
      patternForm.setFieldValue('rows', rows);
    } else {
      const rows = patternForm.values.rows.slice();
      let spacingM = 1;
      if (pending.rowIndex > 0 && !pending.isLast) {
        spacingM = rows[pending.rowIndex-1].distanceToNextRowM / 2;
        rows.splice(pending.rowIndex-1, 1, {
          ...rows[pending.rowIndex-1],
          distanceToNextRowM: spacingM,
        });
      }
      rows.splice(pending.rowIndex, 0, {
        purposeId: 0,
        distanceToNextRowM: spacingM,
        cropsOffsetM: 0,
        crops: [{
          plantId,
          distanceToNextCropM: 1,
        }],
      });
      patternForm.setFieldValue('rows', rows);
    }

    setPending(null);
    setSelected({
      kind: 'crop',
      rowIndex: pending.rowIndex,
      cropIndex: pending.kind === 'crop' ? pending.cropIndex : 0,
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    patternForm.setFieldValue(
      'rows',
      patternForm.values.rows.filter((_, i) => i !== rowIndex),
    );
    setSelected(null);
    setPending(null);
  };

  const handleDuplicateRow = (rowIndex: number) => {
    const rows = patternForm.values.rows.slice();
    const original = rows[rowIndex];
    if (!original) return;

    // Insert the duplicate immediately to the right of the original. Both
    // rows keep the original's `distanceToNextRowM`; the copy is a deep copy
    // of `purposeId`, `cropsOffsetM`, and the `crops` array.
    rows.splice(rowIndex + 1, 0, {
      purposeId: original.purposeId,
      distanceToNextRowM: original.distanceToNextRowM,
      cropsOffsetM: original.cropsOffsetM,
      crops: original.crops.map((c) => ({
        plantId: c.plantId,
        distanceToNextCropM: c.distanceToNextCropM,
      })),
    });
    patternForm.setFieldValue('rows', rows);
    setPending(null);
    setSelected({ kind: 'row', rowIndex: rowIndex + 1 });
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

  const handleEditCropSpacing = (rowIndex: number, afterCropIndex: number) => {
    setSelected((prev) => {
      const isReselection = prev?.kind === 'cropSpacing'
        && prev.rowIndex === rowIndex
        && prev.afterCropIndex === afterCropIndex;
      if (isReselection) return null;

      return { kind: 'cropSpacing', rowIndex, afterCropIndex };
    });
    setPending(null);
  };

  const handleEditRowSpacing = (afterRowIndex: number) => {
    setSelected((prev) => {
      const isReselection = prev?.kind === 'rowSpacing' && prev.afterRowIndex === afterRowIndex;
      if (isReselection) return null;

      return { kind: 'rowSpacing', afterRowIndex };
    });
    setPending(null);
  };

  const handleEditRowOffset = (rowIndex: number) => {
    setSelected((prev) => {
      const isReselection = prev?.kind === 'rowOffset' && prev.rowIndex === rowIndex;
      if (isReselection) return null;

      return { kind: 'rowOffset', rowIndex };
    });
    setPending(null);
  };

  // -------------------------------------------------------------------------
  // Side-panel selection state.
  // -------------------------------------------------------------------------

  const selectedRow = selected?.kind === 'row' ? selected : null;
  const selectedCrop = selected?.kind === 'crop' ? selected : null;
  const selectedRowData = selectedRow !== null
    ? syntheticPattern.rows[selectedRow.rowIndex]
    : null;
  const selectedCropData = selectedCrop !== null
    ? syntheticPattern.rows[selectedCrop.rowIndex]?.crops[selectedCrop.cropIndex] ?? null
    : null;
  const selectedSpacing = selected && [
    'rowOffset',
    'rowSpacing',
    'cropSpacing'
  ].includes(selected.kind) ? selected as SelectedSpacing : null;
  
  const { totalYM } = useMemo(
    () => buildPreviewGeometry(syntheticPattern),
    [pattern]
  );

  const panelHeightPx = Math.max(400, totalYM * 30);

  if (!plants.data) {
    return <QueryLoader {...plantsQueryOptions} />;
  }

  return (
    <>
    <Stack gap="md">
      <Group justify="space-between" align="center" wrap="nowrap">
        <Button
          variant="subtle"
          size="xs"
          w={155}
          leftSection={<IconChevronLeft size={16} />}
          onClick={handleCancel}
        >
          Voltar para a lista
        </Button>
        <Text p={0} fw={600} fz="md">
          {pattern && !copy
            ? `Editando: ${pattern.name}`
            : pattern && copy
              ? `Cópia de ${pattern.name}`
              : 'Novo padrão'}
        </Text>
        <div style={{ width: 100 }} />
      </Group>

      <Group align="flex-start" gap="md" wrap="nowrap">
        <Box style={{ width: "70%", height: panelHeightPx }}>
          <PatternPreviewPanel
            pattern={syntheticPattern}
            selectedElement={selected}
            onCropSelect={handleCropSelect}
            onRowSelect={handleRowSelect}
            edit
            editHandlers={{
              onRowMoveLeft: handleRowMoveLeft,
              onRowMoveRight: handleRowMoveRight,
              onAddRowLast: handleAddRowLast,
              onAddRowBetween: handleAddRowBetween,
              onAddCropFirst: handleAddCropFirst,
              onAddCropBetween: handleAddCropBetween,
              onAddCropLast: handleAddCropLast,
              onEditCropSpacing: handleEditCropSpacing,
              onEditRowSpacing: handleEditRowSpacing,
              onEditRowOffset: handleEditRowOffset,
              onSetRowOffset: handleEditRowOffset,
            }}
            // pendingCrop={pending?.kind === 'crop' ? pending : null}
            // pendingRowIndex={pending?.kind === 'row' ? pending.rowIndex : null}
          />
        </Box>

        <Paper withBorder p="sm" w="30%" style={{ minHeight: panelHeightPx }}>
          {pending ? (
            <CropInputPanel
              mode="pending"
              pendingKind={pending.kind}
              rowIndex={pending.rowIndex}
              cropIndex={pending.kind === 'crop' ? pending.cropIndex : undefined}
              plants={plants.data}
              onPlantPicked={handlePlantPicked}
            />
          ) : selectedCrop && selectedCropData ? (
            <CropInputPanel
              mode="edit"
              patternForm={patternForm}
              rowIndex={selectedCrop.rowIndex!}
              cropIndex={selectedCrop.cropIndex!}
              crop={selectedCropData}
              plants={plants.data}
              onPlantPicked={(plantId) => {
                patternForm.setFieldValue(
                  `rows.${selectedCrop.rowIndex}.crops.${selectedCrop.cropIndex}.plantId`,
                  plantId,
                );
              }}
              onDelete={() => handleDeleteCrop(selectedCrop.rowIndex!, selectedCrop.cropIndex!)}
            />
          ) : selectedRow && selectedRowData ? (
            <RowInputPanel
              patternForm={patternForm}
              rowIndex={selectedRow.rowIndex!}
              row={selectedRowData}
              onDelete={() => handleDeleteRow(selectedRow.rowIndex!)}
              onDuplicate={() => handleDuplicateRow(selectedRow.rowIndex!)}
            />
          ) : selectedSpacing ? (
            <SpacingInputPanel
              selected={selectedSpacing}
              pattern={syntheticPattern}
              patternForm={patternForm}
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
    <LocalConfirmModal
      opened={cancelModalOpen}
      onClose={() => setCancelModalOpen(false)}
      onConfirm={onBackToList}
      title="Deseja descartar as mudanças?"
      labels={{ confirm: 'Descartar mudanças', cancel: 'Cancelar' }}
      confirmProps={{ color: 'red' }}
    >
      Você está prestes a fechar o padrão sem salvar. Todas as alterações
      feitas serão descartadas.
    </LocalConfirmModal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Side panels
// ---------------------------------------------------------------------------

function PatternFormPanel({
  patternForm,
}: {
  patternForm: UseFormReturnType<CroppingPatternWriteRequestData>;
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
  onDuplicate,
}: {
  patternForm: UseFormReturnType<CroppingPatternWriteRequestData>;
  rowIndex: number;
  row: PatternRow;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const rowPath = `rows.${rowIndex}`;

  const purposesQuery = useQuery({
    queryKey: ['croppingRowPurposeList'],
    queryFn: getCroppingRowPurposeList,
  });
  const purposeOptions = (purposesQuery.data ?? []).map((p) => ({
    value: String(p.id),
    label: capitalize(p.name),
  }));

  const cropsLegend = row.crops.map((c, i) => (
    <CropLegend key={i} plant={c.plant} />
  ));

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="baseline">
        <Text fw="bold">Linha {rowIndex + 1}</Text>
        <Group gap="xs" wrap="nowrap">
          <Tooltip label="Duplicar linha">
            <Button
              variant="outline"
              size="compact-md"
              color="var(--mantine-color-dark-4)"
              onClick={onDuplicate}
              aria-label="Duplicar linha"
            >
              <IconCopy size={20} />
            </Button>
          </Tooltip>
          <Tooltip label="Excluir linha">
            <DeleteButton
              confirmModal={{
                title: "Remover linha do padrão?",
                children: (
                  <Text size="sm">
                    Você está prestes a <strong>remover</strong> a linha {rowIndex + 1}
                    {' '}do padrão, junto com todos os seus cultivos.
                  </Text>
                ),
                onConfirm: onDelete,
                local: true,
              }}
            />
          </Tooltip>
        </Group>
      </Group>
      <Select
        label="Função"
        data={purposeOptions}
        placeholder="Selecione..."
        {...patternForm.getInputProps(`${rowPath}.purposeId`)}
        value={
          patternForm.values.rows[rowIndex].purposeId
            ? String(patternForm.values.rows[rowIndex].purposeId)
            : null
        }
        onChange={(value) => {
          patternForm.setFieldValue(`${rowPath}.purposeId`, Number(value ?? 0));
        }}
        allowDeselect
      />
      <FieldView fz="sm" label="Sequência de cultivos">
        {cropsLegend.length > 0 ? cropsLegend : <Text c="dimmed" fz="sm">Nenhum cultivo</Text>}
      </FieldView>
    </Stack>
  );
}

interface CropInputPanelProps {
  mode: 'edit' | 'pending';
  plants: PlantReadData[];
  patternForm?: UseFormReturnType<CroppingPatternWriteRequestData>;
  rowIndex: number;
  cropIndex?: number;
  onPlantPicked: (plantId: number) => void;
  // pending-mode-only props:
  pendingKind?: 'crop' | 'row';
  // edit-mode-only props:
  crop?: PatternCrop;
  onDelete?: () => void;
}

function CropInputPanel({
  mode,
  plants,
  patternForm,
  rowIndex,
  cropIndex,
  onDelete,
  onPlantPicked,
  pendingKind,
  crop,
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

  const plantOptions = rankedPlants.map((p) => ({
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

  const popularNamesQueryOptions = {
    queryKey: ['plantPopularNameList', String(currentPlant?.id ?? 0)],
    queryFn: getPlantPopularNameList,
    enable: currentPlant,
  };
  const popularNames = useQuery(popularNamesQueryOptions);

  const deleteButton = onDelete && (
    <Tooltip label="Remover cultivo">
      <DeleteButton onClick={onDelete} />
    </Tooltip>
  );

  return (
    <Stack gap="xs">
      <Group gap={6} wrap="nowrap" align="baseline">
        {mode === 'edit' && currentPlant && (
          <Fragment>
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
            {deleteButton}
          </Fragment>
        )}
        {mode === 'pending' && pendingKind === 'crop' && (
          <Text fw="bold">Novo cultivo</Text>
        )}
        {mode === 'pending' && pendingKind === 'row' && (
          <Text fw="bold">Nova linha</Text>
      )}
      </Group>
      {mode === 'edit' && currentPlant && popularNames.data && popularNames.data.length > 0 && (
        <Text fz="sm">
          {popularNames.data.map((n) => n.name).join(', ')}
        </Text>
      )}
      <FieldView fz="sm" label="Linha">{rowIndex + 1}</FieldView>
      <FieldView fz="sm" label="Posição">{(cropIndex ?? 0) + 1}</FieldView>
      <Select
        label={mode === 'pending' ? 'Escolha uma planta:' : 'Planta:'}
        placeholder={mode === 'pending' ? 'Selecione...' : undefined}
        searchable
        allowDeselect={false}
        data={plantOptions}
        {...patternForm?.getInputProps(`rows.${rowIndex}.crops.${cropIndex}.plantId`)}
        value={currentPlantId !== null ? String(currentPlantId) : null}
        onChange={(value) => onPlantPicked(Number(value ?? 0))}
      />
    </Stack>
  );
}

function SpacingInputPanel({
  selected,
  pattern,
  patternForm,
}: {
  selected: SelectedSpacing;
  pattern: CroppingPatternReadData;
  patternForm: UseFormReturnType<CroppingPatternWriteRequestData>;
}) {
  /**
   * Map the spacing state into a form path + a short title. The path is
   * written through on every keystroke (so the user sees the preview update
   * live);
   */
  const { path, title, minValue, initialValue, info } = useMemo(() => {
    switch (selected.kind) {
      case 'cropSpacing':
        return {
          path: `rows.${selected.rowIndex}.crops.${selected.afterCropIndex}.distanceToNextCropM`,
          title: 'Espaçamento entre cultivos',
          minValue: 25,
          initialValue: pattern.rows[selected.rowIndex]?.crops[selected.afterCropIndex]
            ?.distanceToNextCropM ?? 1,
          info: (() => {
            const row = pattern.rows[selected.rowIndex];
            const cropA = row.crops[selected.afterCropIndex];
            const cropB = row.crops[(selected.afterCropIndex + 1) % row.crops.length];
            return (
              <Stack gap={5}>
                <Text fz={15}>{`Linha ${row.position}`}</Text>
                <CropLegend pl={4} plant={cropA.plant} />
                <IconArrowsVertical stroke={1.5} />
                <CropLegend pl={4} plant={cropB.plant} />
              </Stack>
            )
          })(),
        };
      case 'rowSpacing':
        return {
          path: `rows.${selected.afterRowIndex}.distanceToNextRowM`,
          title: 'Espaçamento entre linhas',
          minValue: 25,
          initialValue: pattern.rows[selected.afterRowIndex]?.distanceToNextRowM ?? 1,
          info: (() => {
            const rowA = pattern.rows[selected.afterRowIndex];
            const rowB = pattern.rows[(selected.afterRowIndex + 1) % pattern.rows.length];
            return (
              <Group gap={10}>
                <Text fz={15}>{`Linha ${rowA.position}`}</Text>
                <IconArrowsHorizontal stroke={1.5} />
                <Text fz={15}>{`Linha ${rowB.position}`}</Text>
              </Group>
            )
          })(),
        };
      case 'rowOffset':
        return {
          path: `rows.${selected.rowIndex}.cropsOffsetM`,
          title: 'Deslocamento inicial da linha',
          minValue: 0,
          initialValue: pattern.rows[selected.rowIndex]?.cropsOffsetM ?? 0,
          info: (() => {
            const firstCrop = pattern.rows[selected.rowIndex].crops[0];
            return (
              <Stack gap={5}>
                <Text fz={15}>{`Linha ${selected.rowIndex + 1} (início)`}</Text>
                <IconArrowNarrowDown stroke={1.5} />
                <CropLegend pl={4} plant={firstCrop.plant} />
              </Stack>
            )
          })()
        };
    }
  }, [selected, pattern]);

  return (
    <Stack gap="sm">
      <Text fw="bold">{title}</Text>
      {info}
      <NumberInput
        label="Distância (cm)"
        min={minValue}
        step={25}
        decimalScale={2}
        {...patternForm.getInputProps(path)}
        value={initialValue*100}
        onChange={(value) => {
          // Mantine v8 NumberInput yields `number | string`; coerce and guard.
          const float = typeof value === 'number' ? value : parseFloat(value);
          if (Number.isFinite(float)) {
            patternForm.setFieldValue(path, float/100);
          }
        }}
      />
    </Stack>
  );
}
