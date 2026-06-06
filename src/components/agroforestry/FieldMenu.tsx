/*
Simulador Agroflorestal Regenera (SAR)
Copyright (C) 2026  Lucas Marques and Regenera Mata Atlântica

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

You should have received a copy of the GNU General Public License
along with this program. If not, see <https://www.gnu.org/licenses>.
*/

import { useState } from "react";
import { Badge, Button, Container, Fieldset, Group, NativeSelect, NativeSelectProps, NumberInput, ScrollArea, Stack, Table, Text, TextInput, Title, Tooltip } from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";
import { IconCircleFilled, IconInfoCircle, IconPencil, IconX } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import booleanEqual from "@turf/boolean-equal";
import { createField, CroppingSummary, deleteField, FarmReadData, FieldReadData, FieldWriteRequestData, getCroppingPatternList, getFarmPlantFitnessList, SitePlantFitness, updateField } from "../../apis/agroforestry";
import { showMutationError } from "../../apis/common";
import DeleteButton from "../common/DeleteButton";
import FieldView from "../common/FieldView";
import { showError, showSuccess } from "../common/notifications";
import { StickyHeaderTable } from "../common/StickyHeaderTable";
import { QueryLoader } from "../common/QueryLoader";
import ClickableRow from "../common/ClickableRow";
import ConfirmingButton from "../common/ConfirmingButton";
import { FieldGeomData } from "./ProjectDashboard";
import { useAuth } from '../../hooks/useAuth';
import { PlantReadData } from "../../apis/catalog";

interface FieldMenuProps {
  farm: FarmReadData,
  initialField?: FieldReadData,
  fieldGeom: FieldGeomData,
  onFieldEdited: (field: FieldGeomData) => void,
  onFieldClosed: () => void,
  onFieldDeleted: () => void,
  onFieldReset: () => void,
}

export default function FieldMenu({ farm, initialField, fieldGeom, onFieldEdited, onFieldClosed, onFieldDeleted, onFieldReset }: FieldMenuProps) {
  const queryClient = useQueryClient();
  
  const fieldSubmit = useMutation({
    mutationFn: initialField ? updateField : createField,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ predicate: (query) => { return query.queryKey[0] === 'fieldList' } });
      onFieldClosed();
    },
    onError: showMutationError
  });

  const fieldDelete = useMutation({
    mutationFn: deleteField,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ predicate: (query) => { return query.queryKey[0] === 'fieldList' } });
      onFieldDeleted();
    },
    onError: showMutationError
  });

  const fieldForm = useForm<FieldWriteRequestData>({
    mode: 'controlled',
    initialValues: {
      name: initialField?.name ?? "",
      farmId: initialField?.farmId ?? farm.id,
      polygon: initialField?.polygon,
      croppingPatternId: initialField?.croppingPatternId,
      rowsAngleDeg: initialField?.rowsAngleDeg ?? 0,
      rowsOffsetM: initialField?.rowsOffsetM ?? 0,
      cropsOffsetM: initialField?.cropsOffsetM ?? 0,
      traitValues: initialField?.traitValues ?? [],
    },
    validate: {
      name: (value) => {
        if (!value.trim().length) return 'Campo obrigatório';
      },
    },
    transformValues: (values) => ({
      ...values,
      name: values.name.trim(),
      croppingPatternId: values.croppingPatternId ? values.croppingPatternId : null,
      rowsAngleDeg: values.croppingPatternId ? values.rowsAngleDeg : null,
      rowsOffsetM: values.croppingPatternId ? values.rowsOffsetM : null,
      cropsOffsetM: values.croppingPatternId ? values.cropsOffsetM : null,
    })
  });

  const handleSubmitButtonClick = () => {
    const fieldValidation = fieldForm.validate();

    if (fieldValidation.hasErrors)
      return showError("Há campos inválidos no formulário.", "Erro");

    const values = fieldForm.getTransformedValues();

    fieldSubmit.mutate({
      ...(initialField && {id: initialField.id}),
      data: {
        ...values,
        polygon: fieldGeom.polygon,
      },
    });
  }

  const onUnsavedFieldClose = () => {
    onFieldReset();
    onFieldClosed();
  }

  const fieldDeleteButton = 
    <Tooltip label="Excluir área de cultivo">
      {initialField ?
      <DeleteButton
        modalTitle="Deseja mesmo excluir essa área de cultivo?"
        modalContent={
          <Text size="sm" mb={20}>
            Ao confirmar, você <strong>removerá</strong> o cadastro do 
            SAF <Text span fw={700}>{initialField.name}</Text>,
            junto com todos os dados vinculados a ele.
          </Text>
        }
        onModalConfirm={() => fieldDelete.mutate(initialField.id)}
      /> : 
      <DeleteButton
        modalTitle="Deseja mesmo excluir essa área de cultivo?"
        modalContent={
          <Text size="sm" mb={20}>
            Ao confirmar, você <strong>removerá</strong> a área desenhada.
          </Text>
        }
        onModalConfirm={onFieldDeleted}
      />}
    </Tooltip>;

  const isFieldChanged = !initialField || fieldForm.isDirty() || !booleanEqual(initialField.polygon, fieldGeom.polygon);

  const closeButtonStyle = {
    variant: "outline",
    size: "compact-md",
    color: "var(--mantine-color-gray-6)",
  };

  const fieldCloseButton = initialField &&
    <Tooltip label="Fechar área de cultivo">
      {isFieldChanged ?
        <ConfirmingButton
          modalTitle="Deseja descartar as mudanças?"
          modalContent="Há mudanças não salvas nessa área de cultivo. Se fechar agora, elas serão descartadas."
          modalLabels={{ confirm: 'Descartar mudanças', cancel: 'Cancelar' }}
          modalConfirmProps={{ color: 'red' }}
          onModalConfirm={onUnsavedFieldClose}
          {...closeButtonStyle}
        >
          <IconX />
        </ConfirmingButton> :
        <Button onClick={onFieldClosed} {...closeButtonStyle}>
          <IconX />
        </Button>
      }
    </Tooltip>;

  const submitButton = isFieldChanged &&
    <Button size="lg" onClick={handleSubmitButtonClick} loading={fieldSubmit.isPending}>
      Salvar SAF
    </Button>;

  const headerHeight = "50px";

  return (
    <Container p={0} style={{ height: '600px' }}>
    <Group justify="space-between" align="baseline" style={{height: headerHeight}}>
      {fieldDeleteButton}
      {fieldCloseButton}
    </Group>
    <Stack justify="space-between" style={{height: `calc(100% - ${headerHeight})`}}>
      <ScrollArea>
        <Stack justify="initial">
          <EditableFieldView
            editing={!initialField}
            form={fieldForm}
            fieldName="name"
            fieldLabel="Nome do SAF"
          />
          <CroppingControls 
            fieldGeom={fieldGeom}
            fieldForm={fieldForm}
            onFieldEdited={onFieldEdited}
          />
          {fieldGeom.croppingSummary &&
          <CroppingSummaryDetails summary={fieldGeom.croppingSummary} />}
          {/* {initialField &&
          <PlantFitnessButton farm={farm} />} */}
        </Stack>
      </ScrollArea>
      {submitButton}
    </Stack>
    </Container>
  )
}

function CroppingSummaryDetails({ summary }: { summary: CroppingSummary }) {
  const CropLegend = ({ plant }: { plant: PlantReadData }) => (
    <Group justify="left" gap="xs">
      <IconCircleFilled color={plant.colorHex} size={15} />
      {plant.acceptedTaxonName}
    </Group>
  );
  
  const cropSummaries = Object.keys(summary).sort().map(
    (key) => (
      <Fieldset key={key} legend={<CropLegend plant={summary[key].plant} />} fw={500} p={10} mb={10}>
        <Group gap="xs">
          <FieldView
            label="Quant."
            fz={14}
            legendProps={{fw: 500, c: "var(--mantine-color-gray-7)"}}
            >
            {summary[key].metrics.individualsCount} pés
          </FieldView>
          <FieldView
            label="Densidade"
            fz={14}
            legendProps={{fw: 500, c: "var(--mantine-color-gray-7)"}}
            >
            {summary[key].metrics.densityPerHa} pés/ha
          </FieldView>
        </Group>
      </Fieldset>
    )
  )
  
  return (
    <Fieldset fz="h3" legend="Resumo do cultivo">
      {cropSummaries}
    </Fieldset>
  );
}

interface EditableFieldViewProps {
  editing: boolean,
  form: UseFormReturnType<FieldWriteRequestData>,
  fieldName: 'name',
  fieldLabel: string,
}

function EditableFieldView({ editing, form, fieldName, fieldLabel }: EditableFieldViewProps) {
  const [editMode, setEditMode] = useState<boolean>(editing);

  const handleEditButtonClick = () => {
    setEditMode((editMode) => !editMode);
  };
  
  return (
    <>
    {editMode ?
    <TextInput
      label={fieldLabel}
      pb={10}
      {...form.getInputProps(fieldName)}
    /> :
    <Group>
      <FieldView label={fieldLabel}>
        {form.getValues()[fieldName]}
      </FieldView>
      <Button variant="default" size="compact-xs" color="dimmed" onClick={() => handleEditButtonClick()}>
        <IconPencil size={20} />
      </Button>
    </Group>}
    </>
  )
}

interface CroppingControlsProps {
  fieldForm: UseFormReturnType<FieldWriteRequestData>,
  fieldGeom: FieldGeomData,
  onFieldEdited: (field: FieldGeomData) => void,
}

function CroppingControls({ fieldForm, fieldGeom, onFieldEdited }: CroppingControlsProps) {

  fieldForm.watch('croppingPatternId', ({ value }) => {
    const values = fieldForm.getValues();

    onFieldEdited({
      ...fieldGeom,
      croppingPatternId: value ? value : null,
      rowsAngleDeg: value ? values['rowsAngleDeg'] : null,
      rowsOffsetM: value ? values['rowsOffsetM'] : null,
      cropsOffsetM: value ? values['cropsOffsetM'] : null,
      croppingSummary: value ? fieldGeom['croppingSummary'] : undefined,
    });
  });

  fieldForm.watch('rowsAngleDeg', ({ value }) => {
    onFieldEdited({
      ...fieldGeom,
      rowsAngleDeg: value,
    });
  });

  fieldForm.watch('rowsOffsetM', ({ value }) => {
    onFieldEdited({
      ...fieldGeom,
      rowsOffsetM: value,
    });
  });

  fieldForm.watch('cropsOffsetM', ({ value }) => {
    onFieldEdited({
      ...fieldGeom,
      cropsOffsetM: value,
    });
  });

  const offsetInputWidth = 110;

  const rowsAngleInputLabel =
    <Group>
      Ângulo (graus)
      <Tooltip label="Rotaciona as linhas a partir do eixo Norte-Sul (0°)">
        <IconInfoCircle size={18} />
      </Tooltip>
    </Group>;

  const rowsOffsetInputLabel =
    <Group justify="space-between" w={offsetInputWidth}>
      Das linhas
      <Tooltip label="Move as linhas perpendicularmente">
        <IconInfoCircle size={18} />
      </Tooltip>
    </Group>;

  const cropsOffsetInputLabel =
    <Group justify="space-between" w={offsetInputWidth}>
      Das plantas
      <Tooltip label="Move as plantas ao longo das linhas">
        <IconInfoCircle size={18} />
      </Tooltip>
    </Group>;

  return (
    <Fieldset legend="Configuração do Cultivo">
      <CroppingPatternSelect 
        label="Padrão de cultivo"
        fieldForm={fieldForm}
        mb={5}
      />
      {fieldForm.getValues()['croppingPatternId'] ? <>
      <NumberInput
        key={fieldForm.key('rowsAngleDeg')}
        label={rowsAngleInputLabel}
        min={-180}
        max={180}
        step={5}
        mb={5}
        {...fieldForm.getInputProps('rowsAngleDeg')}
      />
      <Text fz="sm" fw={500}>Deslocamento (m)</Text>
      <Fieldset p={10}>
        <Group justify="space-evenly" gap="xs">
          <NumberInput
            key={fieldForm.key('rowsOffsetM')}
            label={rowsOffsetInputLabel}
            min={-100}
            max={100}
            allowedDecimalSeparators={['.',',']}
            decimalScale={2}
            step={0.5}
            w={offsetInputWidth}
            {...fieldForm.getInputProps('rowsOffsetM')}
          />
          <NumberInput
            key={fieldForm.key('cropsOffsetM')}
            label={cropsOffsetInputLabel}
            min={-100}
            max={100}
            allowDecimal={true}
            allowedDecimalSeparators={['.',',']}
            decimalScale={2}
            step={0.25}
            w={offsetInputWidth}
            {...fieldForm.getInputProps('cropsOffsetM')}
          />
        </Group>
      </Fieldset>
      </> : <></>}
    </Fieldset>
  );
}

interface CroppingPatternSelectProps extends NativeSelectProps {
  fieldForm: UseFormReturnType<FieldWriteRequestData>,
}

function CroppingPatternSelect({ fieldForm, ...selectProps }: CroppingPatternSelectProps) {
  const { user } = useAuth();

  const publicPatternsQueryOptions = {
    queryKey: [
      'croppingPatternList',
      'with_rows=false',
      'is_public=true',
    ],
    queryFn: getCroppingPatternList,
  };
  const userPatternsQueryOptions = {
    queryKey: [
      'croppingPatternList',
      'with_rows=false',
      `author_id=${user!.id}`,
    ],
    queryFn: getCroppingPatternList,
  };

  const userPatterns = useQuery(userPatternsQueryOptions);
  const publicPatterns = useQuery(publicPatternsQueryOptions);

  const userOptions = userPatterns.data?.map(
    pattern => ({
      value: pattern.id.toString(),
      label: pattern.name
    })
  );

  const otherOptions = publicPatterns.data?.reduce(
    (others: { value: string, label: string }[], pattern) => {
      if (pattern.author.id !== user!.id)
        others.push({
            value: pattern.id.toString(),
            label: `${pattern.name} - ${pattern.author.firstName} ${pattern.author.lastName}`
        });

      return others;
    }, []
  );

  const options = userOptions && otherOptions ? [
    {
      value: '0',
      label: ''
    },
    {
      group: 'Seus padrões',
      items: userOptions
    },
    {
      group: 'De outros autores',
      items: otherOptions
    },
  ] : [];
  
  const changeValue = (path: string) => {
    return (e: React.ChangeEvent<HTMLSelectElement>) => fieldForm.setFieldValue(path, Number(e.target.value));
  };

  return (
    <NativeSelect
      key={fieldForm.key('croppingPatternId')}
      data={options}
      {...fieldForm.getInputProps('croppingPatternId')}
      onChange={changeValue('croppingPatternId')}
      {...selectProps}
      />
  )
}

function PlantFitnessButton({ farm }: { farm: FarmReadData }) {
  const openPlantFitnessModal = () => {
    modals.open({
      title: "Ranking de plantas para essa área",
      size: "lg",
      children: <PlantFitnessTable farm={farm} />,
    });
  };

  return (
    <Button color="teal" onClick={() => openPlantFitnessModal()}>
      Ranking de plantas
    </Button>
  )
}

function PlantFitnessTable({ farm }: { farm: FarmReadData }) {
  const plantFitnessesQueryOptions = {
    queryKey: ['farmPlantFitnessList', farm.id.toString()],
    queryFn: getFarmPlantFitnessList,
  }

  const plantFitnesses = useQuery(plantFitnessesQueryOptions);
  const plants = plantFitnesses.data ?? [];

  const header = (
    <Table.Tr>
      <Table.Th>Nome científico</Table.Th>
      <Table.Th w={100}></Table.Th>
      <Table.Th>Pontuação</Table.Th>
      <Table.Th>Por aptidão</Table.Th>
      <Table.Th>Por naturalidade</Table.Th>
    </Table.Tr>
  );

  const rows = plants.map((fitness: SitePlantFitness) => (
    <ClickableRow
      key={fitness.acceptedTaxonName}
      onClick={() => handleRowClick(fitness.plantId)}
      style={{'--hover-color': '#bef7ce'}}
    >
      <Table.Td>{fitness.acceptedTaxonName}</Table.Td>
      <Table.Td><NativityBadge plantFitness={fitness} /></Table.Td>
      <Table.Td>{fitness.fitnessScore + fitness.nativityScore}</Table.Td>
      <Table.Td>{fitness.fitnessScore}</Table.Td>
      <Table.Td>{fitness.nativityScore}</Table.Td>
      <Table.Td></Table.Td>
    </ClickableRow>
  ));

  const handleRowClick = (plantId: number) => {
    window.open(`/plants/${plantId}?edit=false`, '_blank');
  }

  return (
    <QueryLoader {...plantFitnessesQueryOptions}>
      <StickyHeaderTable
        header={header}
        rows={rows}
        scrollWidth={600}
        scrollHeight={550} 
      />
    </QueryLoader>
  )
}

function NativityBadge({ plantFitness }: { plantFitness: SitePlantFitness }) {
  if (plantFitness.isNative)
    return <Badge variant="light" color="green">NATIVA</Badge>
  if (plantFitness.isInvasive)
    return <Badge variant="light" color="red">INVASORA</Badge>
}
