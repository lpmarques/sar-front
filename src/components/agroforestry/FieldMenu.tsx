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

import { Button, Container, Fieldset, Group, NativeSelect, NativeSelectProps, NumberInput, ScrollArea, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";
import { IconCircleFilled, IconInfoCircle, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import booleanEqual from "@turf/boolean-equal";
import { createField, CroppingSummary, deleteField, FieldWriteRequestData, getCroppingPatternList, updateField } from "../../apis/agroforestry";
import { PlantReadData } from "../../apis/catalog";
import { showMutationError } from "../../apis/common";
import { useAuth } from '../../hooks/useAuth';
import { useProject } from "../../hooks/useProject";
import ConfirmingButton from "../common/ConfirmingButton";
import DeleteButton from "../common/DeleteButton";
import FieldView from "../common/FieldView";
import { showError, showSuccess } from "../common/notifications";

export default function FieldMenu({ inputsDisabled = false }: { inputsDisabled: boolean }) {
  const queryClient = useQueryClient();
  const {
    farm,
    fields,
    initialFieldValues,
    selectedFieldIndex,
    unselectField,
    replaceField,
    removeField,
    resetField
  } = useProject();

  const field = selectedFieldIndex !== null ? fields[selectedFieldIndex] : undefined;
  const initialField = selectedFieldIndex !== null ? initialFieldValues[selectedFieldIndex] : undefined;

  const fieldSubmit = useMutation({
    mutationFn: initialField ? updateField : createField,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ predicate: (query) => { return query.queryKey[0] === 'fieldList' } });
      unselectField();
    },
    onError: showMutationError
  });

  const fieldDelete = useMutation({
    mutationFn: deleteField,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ predicate: (query) => { return query.queryKey[0] === 'fieldList' } });
      removeField();
    },
    onError: showMutationError
  });

  const fieldForm = useForm<FieldWriteRequestData>({
    mode: 'controlled',
    initialValues: {
      name: field?.name ?? "",
      farmId: farm.id,
      polygon: field?.polygon!,
      cropping: field?.cropping ?? {
        patternId: 0,
        rowsAngleDeg: 0,
        rowsOffsetM: 0,
        cropsOffsetM: 0,
      },
      traitValues: field?.traitValues ?? [],
    },
    validate: {
      name: (value) => {
        if (!value.trim().length) return 'Campo obrigatório';
      },
    },
    onValuesChange: (values) => {
      replaceField({
        ...values,
        polygon: field!.polygon
      });
    },
    transformValues: (values) => ({
      ...values,
      name: values.name.trim(),
      cropping: values.cropping?.patternId ? values.cropping : null,
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
        polygon: field!.polygon,
      },
    });
  }

  const onUnsavedFieldClose = () => {
    resetField();
    unselectField();
  }

  const deleteButtonProps = initialField ? {
    modalTitle: "Deseja mesmo excluir essa área de cultivo?",
    modalContent: (
      <Text size="sm" mb={20}>
        Ao confirmar, você <strong>removerá</strong> o cadastro do 
        SAF <Text span fw={700}>{initialField.name}</Text>,
        junto com todos os dados vinculados a ele.
      </Text>
    ),
    onModalConfirm: () => fieldDelete.mutate(initialField.id),
  } : {
    modalTitle: "Deseja mesmo excluir essa área de cultivo?",
    modalContent: (
      <Text size="sm" mb={20}>
        Ao confirmar, você <strong>removerá</strong> a área desenhada.
      </Text>
    ),
    onModalConfirm: () => removeField(),
  };

  const fieldDeleteButton = 
    <Tooltip label="Excluir área de cultivo">
      <DeleteButton {...deleteButtonProps}/>
    </Tooltip>;

  const isFieldChanged = !initialField || fieldForm.isDirty() || !booleanEqual(fieldForm.values.polygon, field!.polygon);

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
        <Button onClick={unselectField} {...closeButtonStyle}>
          <IconX />
        </Button>
      }
    </Tooltip>;

  const submitButton = isFieldChanged ?
    <Button
      size="lg"
      onClick={handleSubmitButtonClick}
      loading={fieldSubmit.isPending}
      disabled={inputsDisabled}
    >
      Salvar SAF
    </Button> : undefined;

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
          <TextInput
            label="Nome do SAF"
            pb={10}
            disabled={inputsDisabled}
            {...fieldForm.getInputProps("name")}
          />
          <CroppingControls
            fieldForm={fieldForm}
            disabled={inputsDisabled}
          />
          {field!.cropping?.summary && field!.cropping?.patternId ?
          <CroppingSummaryDetails summary={field!.cropping.summary} /> : undefined}
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
  function CropLegend({ plant }: { plant: PlantReadData }) {
    return (
      <Group justify="left" gap="xs">
        <IconCircleFilled color={plant.colorHex} size={15} />
        {plant.acceptedTaxonName}
      </Group>
    )
  };

  const summaryTotals = (
    <Fieldset key="totals" legend="Total" fw={500} p={10} mb={10}>
      <Group gap="xs">
        <FieldView
          label="Quant."
          fz={14}
          legendProps={{fw: 500, c: "var(--mantine-color-gray-7)"}}
          >
          {summary.individualsCount} pés
        </FieldView>
        <FieldView
          label="Densidade"
          fz={14}
          legendProps={{fw: 500, c: "var(--mantine-color-gray-7)"}}
          >
          {summary.densityPerHa} pés/ha
        </FieldView>
      </Group>
    </Fieldset>
  );

  const summaryCrops = Object.keys(summary.crops).sort().map(
    (key) => (
      <Fieldset key={key} legend={<CropLegend plant={summary.crops[key].plant} />} fw={500} p={10} mb={10}>
        <Group gap="xs">
          <FieldView
            label="Quant."
            fz={14}
            legendProps={{fw: 500, c: "var(--mantine-color-gray-7)"}}
            >
            {summary.crops[key].metrics.individualsCount} pés
          </FieldView>
          <FieldView
            label="Densidade"
            fz={14}
            legendProps={{fw: 500, c: "var(--mantine-color-gray-7)"}}
            >
            {summary.crops[key].metrics.densityPerHa} pés/ha
          </FieldView>
        </Group>
      </Fieldset>
    )
  );
  
  return (
    <Fieldset fz="h3" legend="Resumo do cultivo">
      {summaryTotals}
      {summaryCrops}
    </Fieldset>
  );
}

interface CroppingControlsProps {
  fieldForm: UseFormReturnType<FieldWriteRequestData>,
  disabled: boolean,
}

function CroppingControls({ fieldForm, disabled }: CroppingControlsProps) {
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
        disabled={disabled}
        mb={5}
      />
      {fieldForm.getValues().cropping?.patternId ? <>
      <NumberInput
        key={fieldForm.key('cropping.rowsAngleDeg')}
        label={rowsAngleInputLabel}
        defaultValue={0}
        min={-180}
        max={180}
        step={5}
        mb={5}
        disabled={disabled}
        {...fieldForm.getInputProps('cropping.rowsAngleDeg')}
      />
      <Text fz="sm" fw={500}>Deslocamento (m)</Text>
      <Fieldset p={10}>
        <Group justify="space-evenly" gap="xs">
          <NumberInput
            key={fieldForm.key('cropping.rowsOffsetM')}
            label={rowsOffsetInputLabel}
            defaultValue={0}
            min={-100}
            max={100}
            allowedDecimalSeparators={['.',',']}
            decimalScale={2}
            step={0.5}
            w={offsetInputWidth}
            disabled={disabled}
            {...fieldForm.getInputProps('cropping.rowsOffsetM')}
          />
          <NumberInput
            key={fieldForm.key('cropping.cropsOffsetM')}
            label={cropsOffsetInputLabel}
            defaultValue={0}
            min={-100}
            max={100}
            allowDecimal={true}
            allowedDecimalSeparators={['.',',']}
            decimalScale={2}
            step={0.25}
            w={offsetInputWidth}        
            disabled={disabled}
            {...fieldForm.getInputProps('cropping.cropsOffsetM')}
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
    },{
      group: 'Seus padrões',
      items: userOptions
    },{
      group: 'Outros',
      items: otherOptions
    },
  ] : [];
  
  const changeValue = (path: string) => {
    return (e: React.ChangeEvent<HTMLSelectElement>) => fieldForm.setFieldValue(path, Number(e.target.value));
  };

  return (
    <NativeSelect
      key={fieldForm.key('cropping.patternId')}
      data={options}
      {...fieldForm.getInputProps('cropping.patternId')}
      onChange={changeValue('cropping.patternId')}
      {...selectProps}
    />
  )
}

// function PlantFitnessButton({ farm }: { farm: FarmReadData }) {
//   const openPlantFitnessModal = () => {
//     modals.open({
//       title: "Ranking de plantas para essa área",
//       size: "lg",
//       children: <PlantFitnessTable farm={farm} />,
//     });
//   };

//   return (
//     <Button color="teal" onClick={() => openPlantFitnessModal()}>
//       Ranking de plantas
//     </Button>
//   )
// }
