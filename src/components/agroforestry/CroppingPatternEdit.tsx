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

import { Fragment, useCallback, useMemo, useState } from "react";
import {
  ActionIcon,
  Box,
  BoxProps,
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
import { IconArrowNarrowDown, IconArrowsHorizontal, IconArrowsVertical, IconChevronLeft, IconChevronRight, IconCircle, IconCopy, IconExternalLink } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CroppingPatternReadData,
  CroppingPatternWriteRequestData,
  createCroppingPattern,
  getCroppingPatternList,
  getCroppingRowPurposeList,
  updateCroppingPattern,
  CroppingRowPurposeReadData,
  getCroppingPattern,
} from "../../apis/agroforestry";
import { showMutationError } from "../../apis/common";
import { getPlantList, getPlantPopularNameList, PlantReadData } from "../../apis/catalog";
import { useAuth } from "../../hooks/useAuth";
import { useProject } from "../../hooks/useProject";
import { QueryLoader } from "../common/QueryLoader";
import DeleteButton from "../common/DeleteButton";
import FieldView from "../common/FieldView";
import ConfirmSubmodal from "../common/ConfirmSubmodal";
import Submodal from "../common/Submodal";
import { showError, showSuccess } from "../common/notifications";
import { CropLegend, NativityBadge, PlantListTable } from ".";
import PatternPreviewPanel, { buildPreviewGeometry, CropPosition, SelectedElement, SelectedSpacing } from "./PatternPreviewPanel";
import { capitalize } from "../../utils/common";
import { PlantFullNameLabel } from "../catalog";

interface CroppingPatternEditProps {
  /**
   * Pattern to edit. `undefined` => creating a new pattern.
   */
  patternId?: number;
  /**
   * When `copy` === true, the form is initialised from `pattern` (if any) but the
   * save button calls `createCroppingPattern` rather than
   * `updateCroppingPattern`.
   */
  copy?: boolean;
  onBackToList: () => void;
  onSaved: () => void;
}

export default function CroppingPatternEdit({ patternId, ...props }: CroppingPatternEditProps) {
  const patternQueryOptions = {
    queryKey: [
      'croppingPattern',
      String(patternId!),
      'with_user_count=true',
    ],
    queryFn: getCroppingPattern,
    enabled: patternId !== undefined,
  };
  const pattern = useQuery(patternQueryOptions);

  const plantsQueryOptions = {
    queryKey: ['plantList'],
    queryFn: getPlantList,
  };
  const plants = useQuery(plantsQueryOptions);

  const purposeQueryOptions = {
    queryKey: ['croppingRowPurposeList'],
    queryFn: getCroppingRowPurposeList,
  };
  const purposes = useQuery(purposeQueryOptions);

  if (patternId && !pattern.data)
    return <QueryLoader {...patternQueryOptions} />;
  
  if (!plants.data)
    return <QueryLoader {...plantsQueryOptions} />;
  
  if (!purposes.data)
    return <QueryLoader {...purposeQueryOptions} />;

  return (
    <CroppingPatternEditBody
      {...props}
      pattern={pattern.data}
      plants={plants.data}
      purposes={purposes.data}
    />
  )
}

interface CroppingPatternEditBodyProps extends Omit<CroppingPatternEditProps, 'patternId'> {
  pattern?: CroppingPatternReadData;
  plants: PlantReadData[];
  purposes: CroppingRowPurposeReadData[];
}

function CroppingPatternEditBody ({
  pattern,
  copy = false,
  onBackToList,
  onSaved,
  plants,
  purposes,
}: CroppingPatternEditBodyProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const initialValues: CroppingPatternWriteRequestData = useMemo(() => {
    if (pattern) {
      return {
        name: pattern.name,
        description: pattern.description,
        isPublic: pattern.isPublic,
        sourcePatternId: copy ? pattern.id : undefined,
        rows: pattern.rows.map((r) => ({
          purposeId: purposes.find((p) => p.name === r.purpose)?.id ?? 0,
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
      isPublic: true,
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
  }, [pattern, purposes]);

  // Used for name-uniqueness validation on save.
  const userPatternsQueryOptions = {
    queryKey: [
      'croppingPatternList',
      `author_id=${user!.id}`,
    ],
    queryFn: getCroppingPatternList,
  };
  const userPatterns = useQuery(userPatternsQueryOptions);

  const validateName = useCallback((value: string) => {
    if (value.trim().length === 0)
      return 'Campo obrigatório';
    
    // Name change (when copying)
    if (copy && value === pattern?.name)
      return 'Igual ao nome do padrão original';

    // Name uniqueness
    const conflicting = (userPatterns.data ?? []).find(
      (p) => p.author.id === pattern?.author.id && p.name === value && (p.id !== pattern?.id || copy),
    );
    if (conflicting)
      return 'Igual a nome já cadastrado por você';
  }, [userPatterns.data]);
  
  const validateDescription = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length === 0)
      return 'Campo obrigatório';
    
    // Description change (when copying)
    if (copy && trimmed === pattern?.description)
      return 'Igual à descrição do padrão original';
  }

  const patternForm = useForm<CroppingPatternWriteRequestData>({
    mode: 'controlled',
    initialValues,
    validate: {
      name: validateName,
      description: validateDescription,
      rows: {
        purposeId: (value: number) => !value ? 'Campo obrigatório' : null,
        distanceToNextRowM: (value: number) => value <= 0 ? 'Espaçamento inválido' : null,
        cropsOffsetM: (value: number) => value < 0 ? 'Deslocamento inválido' : null,
        crops: {
          distanceToNextCropM: (value: number) => value <= 0 ? 'Espaçamento inválido' : null,
        }
      }
    },
    transformValues: (values) => ({
      ...values,
      name: values.name.trim(),
      description: values.description.trim(),
      rows: values.rows.map((r) => ({
        purposeId: r.purposeId,
        cropsOffsetM: Number(r.cropsOffsetM.toFixed(2)),
        distanceToNextRowM: Number(r.distanceToNextRowM.toFixed(2)),
        crops: r.crops.map((c) => ({
          plantId: c.plantId,
          distanceToNextCropM: Number(c.distanceToNextCropM.toFixed(2)),
        })),
      })),
    }),
  });

  const [selected, setSelected] = useState<SelectedElement | null>(null);
  const [pendingCrop, setPendingCrop] = useState<CropPosition | null>(pattern ? null : { rowIndex: 0, cropIndex: 0 });
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const plantsById = useMemo(() => {
    const map = new Map<number, PlantReadData>();
    if (plants) {
      for (const p of plants) map.set(p.id, p);
    }
    return map;
  }, [plants]);

  const purposesById = useMemo(() => {
    const map = new Map<number, string>();
    if (purposes) {
      for (const p of purposes) map.set(p.id, p.name);
    }
    return map;
  }, [purposes]);

  /**
   * Synthetic `CroppingPatternReadData` for the edit preview. Plants are
   * resolved from `plantsById` (or the pending placeholder when missing).
   * Array index in `rows` / `crops` encodes the position.
   */
  const syntheticPattern: CroppingPatternReadData = useMemo(() => ({
    id: pattern?.id ?? 0,
    name: patternForm.values.name,
    description: patternForm.values.description,
    isPublic: patternForm.values.isPublic ?? true,
    sourcePatternId: patternForm.values.sourcePatternId ?? null,
    author: pattern?.author ?? user!,
    rows: patternForm.values.rows.map((r, ri) => ({
      position: ri + 1,
      purpose: purposesById.get(r.purposeId) ?? '',
      cropsOffsetM: r.cropsOffsetM,
      distanceToNextRowM: r.distanceToNextRowM,
      crops: r.crops.map((c, ci) => ({
        position: ci + 1,
        plant: plantsById.get(c.plantId) ?? PENDING_PLANT,
        distanceToNextCropM: c.distanceToNextCropM,
      })),
    })),
  }), [patternForm.values, plantsById, purposesById, user]);

  const mutations = useMutation({
    mutationFn: ({ id, data }: { id?: number; data: CroppingPatternWriteRequestData }) =>
      id !== undefined
        ? updateCroppingPattern({ id, data })
        : createCroppingPattern({ data }),
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.refetchQueries({
        predicate: (q) => ['croppingPattern', 'croppingPatternList'].includes(String(q.queryKey[0])),
      });
      onSaved();
    },
    onError: showMutationError,
  });

  const handleSubmit = () => {
    patternForm.clearErrors();
    const formValidation = patternForm.validate();

    if (formValidation.hasErrors || Object.keys(patternForm.errors).length > 0) {
      showError('Há campos inválidos no formulário.', 'Erro');

      // Pick the first nested error so the user lands on the panel that
      // contains the offending field.
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

    const values = patternForm.getTransformedValues();

    // Row count sanity check
    if (values.rows.length === 0) {
      showError('O padrão deve ter pelo menos uma linha.', 'Erro');
      setSelected(null);
      return;
    }
    
    // Crop count sanity check
    const emptyRowIndex = values.rows.findIndex((r) => r.crops.length === 0);
    if (emptyRowIndex !== -1) {
      showError(`A linha ${emptyRowIndex + 1} deve ter pelo menos um cultivo.`, 'Erro');
      setSelected({ kind: 'row', rowIndex: emptyRowIndex });
      return;
    }

    // No pending crop check
    if (pendingCrop) {
      showError('Há cultivos pendentes (sem planta definida).', 'Erro');
      patternForm.setFieldError(`rows.${pendingCrop.rowIndex}.crops.${pendingCrop.cropIndex}.plantId`, 'Campo obrigatório');
      setSelected({ kind: 'crop', rowIndex: pendingCrop.rowIndex, cropIndex: pendingCrop.cropIndex });
      return;
    }

    mutations.mutate({
      id: !copy && pattern ? pattern.id : undefined,
      data: values,
    });
  };

  const handleCancel = () => {
    setCancelModalOpen(true);
  };

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

  const handleRowMoveLeft = (rowIndex: number) => {
    if (rowIndex === 0) return;
    const rows = patternForm.values.rows.slice();
    [rows[rowIndex - 1], rows[rowIndex]] = [rows[rowIndex], rows[rowIndex - 1]];
    patternForm.setFieldValue('rows', rows);
    
    setSelected(null);
  };

  const handleRowMoveRight = (rowIndex: number) => {
    const rows = patternForm.values.rows.slice();
    if (rowIndex >= rows.length - 1) return;
    [rows[rowIndex + 1], rows[rowIndex]] = [rows[rowIndex], rows[rowIndex + 1]];
    patternForm.setFieldValue('rows', rows);

    setSelected(null);
  };
  
  const showPendingCropError = () => {
    if (!pendingCrop) return;

    showError('Escolha ou remova o cultivo pendente antes de adicionar um novo cultivo')
    patternForm.setFieldError(`rows.${pendingCrop.rowIndex}.crops.${pendingCrop.cropIndex}.plantId`, 'Campo obrigatório');

    setSelected({ kind: 'crop', ...pendingCrop });
  };

  const handleAddCropFirst = (rowIndex: number) => {
    if (pendingCrop) return showPendingCropError();

    const rows = patternForm.values.rows.slice();
    if (!rows[rowIndex]) return;
    
    const cropIndex = 0;
    const row = { ...rows[rowIndex], crops: rows[rowIndex].crops.slice() };

    row.crops.splice(cropIndex, 0, {
      plantId: 0,
      distanceToNextCropM: 1,
    });
    rows[rowIndex] = row;
    patternForm.setFieldValue('rows', rows);

    const cropPosition = { rowIndex, cropIndex };
    setPendingCrop(cropPosition);
    setSelected({ kind: 'crop', ...cropPosition });
  };

  const handleAddCropBetween = (rowIndex: number, afterCropIndex: number) => {
    if (pendingCrop) return showPendingCropError();
    
    const rows = patternForm.values.rows.slice();
    if (!rows[rowIndex]) return;
    
    const row = { ...rows[rowIndex], crops: rows[rowIndex].crops.slice() };
    const cropIndex = afterCropIndex + 1;
    const spacingM = row.crops[afterCropIndex].distanceToNextCropM / 2;

    row.crops.splice(afterCropIndex, 1, {
      ...row.crops[afterCropIndex],
      distanceToNextCropM: spacingM,
    });

    row.crops.splice(cropIndex, 0, {
      plantId: 0,
      distanceToNextCropM: spacingM,
    });
    rows[rowIndex] = row;
    patternForm.setFieldValue('rows', rows);

    const cropPosition = { rowIndex, cropIndex };
    setPendingCrop(cropPosition);
    setSelected({ kind: 'crop', ...cropPosition });
  };

  const handleAddCropLast = (rowIndex: number) => {
    if (pendingCrop) return showPendingCropError();
    
    const rows = patternForm.values.rows.slice();
    if (!rows[rowIndex]) return;
    
    const row = { ...rows[rowIndex], crops: rows[rowIndex].crops.slice() };
    const cropIndex = rows[rowIndex].crops.length;

    row.crops.splice(cropIndex, 0, {
      plantId: 0,
      distanceToNextCropM: 1,
    });
    rows[rowIndex] = row;
    patternForm.setFieldValue('rows', rows);

    const cropPosition = { rowIndex, cropIndex };
    setPendingCrop(cropPosition);
    setSelected({ kind: 'crop', ...cropPosition });
  };

  const handleAddRowBetween = (afterRowIndex: number) => {
    if (pendingCrop) return showPendingCropError();
    
    const rows = patternForm.values.rows.slice();
    if (!rows[afterRowIndex]) return;

    const rowIndex = afterRowIndex + 1;
    const spacingM = rows[afterRowIndex].distanceToNextRowM / 2;
    
    rows.splice(afterRowIndex, 1, {
      ...rows[afterRowIndex],
      distanceToNextRowM: spacingM,
    });

    rows.splice(rowIndex, 0, {
      purposeId: 0,
      distanceToNextRowM: spacingM,
      cropsOffsetM: 0,
      crops: [{
        plantId: 0,
        distanceToNextCropM: 1,
      }],
    });
    patternForm.setFieldValue('rows', rows);

    setPendingCrop({ rowIndex, cropIndex: 0 });
    setSelected({ kind: 'row', rowIndex });
  }

  const handleAddRowLast = () => {
    if (pendingCrop) return showPendingCropError();
    
    const rows = patternForm.values.rows.slice();
    const rowIndex = rows.length;

    rows.splice(rowIndex, 0, {
      purposeId: 0,
      distanceToNextRowM: 1,
      cropsOffsetM: 0,
      crops: [{
        plantId: 0,
        distanceToNextCropM: 1,
      }],
    });
    patternForm.setFieldValue('rows', rows);

    setPendingCrop({ rowIndex, cropIndex: 0 });
    setSelected({ kind: 'row', rowIndex });
  };

  const handlePlantPicked = (rowIndex: number, cropIndex: number, plantId: number) => {
    patternForm.setFieldValue(
      `rows.${rowIndex}.crops.${cropIndex}.plantId`,
      plantId,
    );
    
    if (pendingCrop 
      && rowIndex === pendingCrop.rowIndex
      && cropIndex === pendingCrop.cropIndex) {
      setPendingCrop(null);
    }
  };

  const handleDuplicateRow = (rowIndex: number) => {
    if (pendingCrop) return showPendingCropError();

    const rows = patternForm.values.rows.slice();
    const original = rows[rowIndex];

    // Insert the duplicate immediately to the right of the original.
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

    setSelected({ kind: 'row', rowIndex: rowIndex + 1 });
  };

  const handleDeleteRow = (rowIndex: number) => {
    const rows = patternForm.values.rows.slice();
    if (rowIndex > 0)
      rows.splice(rowIndex - 1, 1, {
        ...rows[rowIndex - 1],
        distanceToNextRowM: rows[rowIndex - 1].distanceToNextRowM
          + rows[rowIndex].distanceToNextRowM
      })

    patternForm.setFieldValue(
      'rows',
      rows.filter((_, i) => i !== rowIndex),
    );

    if (pendingCrop && rowIndex === pendingCrop.rowIndex) {
      setPendingCrop(null);
    } else if (pendingCrop && rowIndex < pendingCrop.rowIndex) {
      setPendingCrop((prev) => ({ ...prev!, rowIndex: prev!.rowIndex - 1 }));
    }
    setSelected(null);
  };

  const handleDeleteCrop = (rowIndex: number, cropIndex: number) => {
    const rows = patternForm.values.rows.slice();
    const rowCrops = rows[rowIndex].crops;
    if (rowCrops.length === 1)
      return handleDeleteRow(rowIndex);

    if (cropIndex > 0)
      rowCrops.splice(cropIndex - 1, 1, {
        ...rows[rowIndex].crops[cropIndex - 1],
        distanceToNextCropM: rowCrops[cropIndex - 1].distanceToNextCropM
          + rowCrops[cropIndex].distanceToNextCropM
      })

    rows.splice(rowIndex, 1, {
      ...rows[rowIndex],
      crops: rowCrops.filter((_, i) => i !== cropIndex)
    });

    patternForm.setFieldValue('rows', rows);

    if (pendingCrop 
      && rowIndex === pendingCrop.rowIndex
      && cropIndex === pendingCrop.cropIndex) {
      setPendingCrop(null);
    } else if (pendingCrop
      && rowIndex === pendingCrop.rowIndex
      && cropIndex < pendingCrop.cropIndex) {
      setPendingCrop((prev) => ({ ...prev!, cropIndex: prev!.cropIndex - 1 }));
    }
    setSelected(null);
  };

  const handleEditCropSpacing = (rowIndex: number, afterCropIndex: number) => {
    setSelected((prev) => {
      const isReselection = prev?.kind === 'cropSpacing'
        && prev.rowIndex === rowIndex
        && prev.afterCropIndex === afterCropIndex;
      if (isReselection) return null;

      return { kind: 'cropSpacing', rowIndex, afterCropIndex };
    });
  };

  const handleEditRowSpacing = (afterRowIndex: number) => {
    setSelected((prev) => {
      const isReselection = prev?.kind === 'rowSpacing' && prev.afterRowIndex === afterRowIndex;
      if (isReselection) return null;

      return { kind: 'rowSpacing', afterRowIndex };
    });
  };

  const handleEditRowOffset = (rowIndex: number) => {
    setSelected((prev) => {
      const isReselection = prev?.kind === 'rowOffset' && prev.rowIndex === rowIndex;
      if (isReselection) return null;

      return { kind: 'rowOffset', rowIndex };
    });
  };

  // -------------------------------------------------------------------------
  // Side-panel selection state.
  // -------------------------------------------------------------------------

  const selectedRow = selected?.kind === 'row' ? selected : null;
  const selectedCrop = selected?.kind === 'crop' ? selected : null;
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

  return (
    <>
    <Stack gap="md">
      <Group justify="space-between" align="center" wrap="nowrap">
        <Tooltip label="Listar todos os padrões disponíveis">
          <Button
            variant="subtle"
            size="xs"
            w={155}
            leftSection={<IconChevronLeft size={16} />}
            onClick={handleCancel}
          >
            Ver mais padrões
          </Button>
        </Tooltip>
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
            pendingCrop={pendingCrop}
          />
        </Box>

        <Paper withBorder p="sm" w="30%" style={{ minHeight: panelHeightPx }}>
          {selectedCrop ? (
            <CropInputPanel
              patternForm={patternForm}
              rowIndex={selectedCrop.rowIndex!}
              cropIndex={selectedCrop.cropIndex!}
              plantsById={plantsById}
              onPlantPicked={(plantId) => handlePlantPicked(selectedCrop.rowIndex, selectedCrop.cropIndex, plantId)}
              onDelete={() => handleDeleteCrop(selectedCrop.rowIndex!, selectedCrop.cropIndex!)}
            />
          ) : selectedRow ? (
            <RowInputPanel
              patternForm={patternForm}
              rowIndex={selectedRow.rowIndex!}
              plantsById={plantsById}
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
    <ConfirmSubmodal
      opened={cancelModalOpen}
      onClose={() => setCancelModalOpen(false)}
      onConfirm={onBackToList}
      title="Deseja descartar as mudanças?"
      labels={{ confirm: 'Descartar mudanças', cancel: 'Cancelar' }}
      confirmProps={{ color: 'red' }}
    >
      Você está prestes a fechar o padrão sem salvar.
      Todas as alterações feitas serão perdidas.
    </ConfirmSubmodal>
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
  plantsById,
  onDelete,
  onDuplicate,
}: {
  patternForm: UseFormReturnType<CroppingPatternWriteRequestData>;
  rowIndex: number;
  plantsById: Map<number, PlantReadData>;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const rowPath = `rows.${rowIndex}`;
  const row = patternForm.values.rows[rowIndex];

  const purposesQuery = useQuery({
    queryKey: ['croppingRowPurposeList'],
    queryFn: getCroppingRowPurposeList,
  });
  const purposeOptions = (purposesQuery.data ?? []).map((p) => ({
    value: String(p.id),
    label: capitalize(p.name),
  }));

  const cropsLegend = row.crops.map((c, i) => (
    c.plantId === 0
      ? PENDING_CROP_LEGEND
      : <CropLegend key={`crop-${i}`} pl={4.5} plant={plantsById.get(c.plantId) ?? PENDING_PLANT} />
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
              size="compact-md"
              confirmModal={{
                title: "Remover linha do padrão?",
                children: (
                  <Text size="sm">
                    Você está prestes a <strong>remover</strong> a linha {rowIndex + 1}
                    {' '}do padrão, junto com todos os seus cultivos.
                  </Text>
                ),
                onConfirm: onDelete,
                submodal: true,
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
  patternForm: UseFormReturnType<CroppingPatternWriteRequestData>;
  rowIndex: number;
  cropIndex: number;
  plantsById: Map<number, PlantReadData>;
  onDelete?: () => void;
  onPlantPicked: (plantId: number) => void;
}

function CropInputPanel({
  patternForm,
  rowIndex,
  cropIndex,
  plantsById,
  onDelete,
  onPlantPicked,
}: CropInputPanelProps) {
  const project = useProject();
  const plantsFitnessMap = project?.plantsFitnessMap;

  const crop = patternForm.values.rows[rowIndex].crops[cropIndex];
  const currentPlantId = crop.plantId > 0 ? crop.plantId : null;
  const currentPlant = currentPlantId !== null ? plantsById.get(currentPlantId) : null;

  const plantFitness = (currentPlant && plantsFitnessMap?.[currentPlant.acceptedTaxonName]) ?? null;

  const popularNamesQueryOptions = {
    queryKey: ['plantPopularNameList', String(currentPlant?.id ?? 0)],
    queryFn: getPlantPopularNameList,
    enable: currentPlant !== null,
  };
  const popularNames = useQuery(popularNamesQueryOptions);

  const isSingleCrop = patternForm.values.rows.length === 1 && patternForm.values.rows[rowIndex].crops.length === 1;

  const deleteButton = !isSingleCrop && onDelete && (
    <Tooltip label="Remover cultivo">
      <DeleteButton size="compact-md" onClick={onDelete} />
    </Tooltip>
  );

  return (
    <Stack gap="xs">
      <Group gap={6} wrap="nowrap" align="baseline" justify="space-between">
        {currentPlant
          ? (
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
            </Fragment>
        ) : (
          <Text fw="bold">Novo cultivo</Text>
        )}
        {deleteButton}
      </Group>
      {currentPlant && popularNames.data && popularNames.data.length > 0 && (
        <Text fz="sm">
          {popularNames.data.map((n) => n.name).join(', ')}
        </Text>
      )}
      <FieldView fz="sm" label="Linha" key="row-pos">{rowIndex + 1}</FieldView>
      <FieldView fz="sm" label="Posição" key="crop-pos">{cropIndex + 1}</FieldView>
      <PlantSelect
        label={currentPlant ? 'Planta:' : 'Escolha uma planta:'}
        selectedPlantId={currentPlantId ?? undefined}
        plants={Array.from(plantsById.values())}
        onSelect={(plantId) => onPlantPicked(plantId)}
      />
    </Stack>
  );
}

interface PlantSelectProps extends BoxProps {
  selectedPlantId?: number;
  label?: string;
  plants: PlantReadData[];
  onSelect: (plantId: number) => void;
}

function PlantSelect({ selectedPlantId, label, plants, onSelect, ...boxProps }: PlantSelectProps) {
  const [opened, setOpened] = useState(false);

  const selectedPlant = selectedPlantId !== undefined
    ? plants.find((p) => p.id === selectedPlantId) ?? null
    : null;

  const buttonLabel = selectedPlant ? <PlantFullNameLabel plant={selectedPlant} /> : 'Selecionar...';
  const tooltipLabel = 'Ver plantas disponíveis';

  const handleSelect = (plantId: number) => {
    setOpened(false);
    onSelect(plantId);
  };

  return (
    <Stack gap={4} {...boxProps}>
      {label && <Text fz="sm" fw={500}>{label}</Text>}
      <Tooltip label={tooltipLabel} position="bottom">
        <Button
          variant="default"
          onClick={() => setOpened(true)}
          fullWidth
          justify="space-between"
          fw="initial"
          rightSection={<IconChevronRight size={16} />}
        >
          {buttonLabel}
        </Button>
      </Tooltip>
      <Submodal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Plantas"
        size="50%"
      >
        <PlantListTable plants={plants} onSelect={handleSelect} />
      </Submodal>
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
                {cropA.plant.id === 0 ? PENDING_CROP_LEGEND : <CropLegend pl={4.5} plant={cropA.plant} />}
                <IconArrowsVertical stroke={1.5} />
                {cropB.plant.id === 0 ? PENDING_CROP_LEGEND : <CropLegend pl={4.5} plant={cropB.plant} />}
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
                {firstCrop.plant.id === 0 ? PENDING_CROP_LEGEND : <CropLegend pl={4.5} plant={firstCrop.plant} />}
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
        decimalScale={0}
        {...patternForm.getInputProps(path)}
        value={initialValue*100}
        onChange={(value) => {
          const float = typeof value === 'number' ? value : parseFloat(value);
          if (Number.isFinite(float)) {
            patternForm.setFieldValue(path, float/100);
          }
        }}
      />
    </Stack>
  );
}

/**
 * Placeholder plant used in the synthetic `CroppingPatternReadData` while a
 * pending crop has no plant picked. White fill at the marker layer makes the
 * "pending" state visually obvious.
 */
const PENDING_PLANT: PlantReadData = {
  id: 0,
  contentId: 0,
  contentStatus: 'proposed',
  acceptedTaxonName: '',
  acceptedFamilyName: '',
  mainPopularName: 'Pendente',
  colorHex: '#ffffff',
};

const PENDING_CROP_LEGEND = (
  <Group pl={4.5} justify="left" gap="xs">
    <IconCircle size={15} />
    <Text fz="sm">Cultivo pendente</Text>
  </Group>
)