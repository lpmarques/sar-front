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

import { Polygon } from "geojson";
import { useState } from "react";
import { Badge, Button, Group, Stack, Table, Text, TextInput, Tooltip } from "@mantine/core";
import { useForm, UseFormReturnType } from "@mantine/form";
import { IconPencil, IconX } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createField, deleteField, FarmReadData, FieldReadData, FieldWriteRequestData, getFarmPlantFitnessList, SitePlantFitness, updateField } from "../../apis/agroforestry";
import { showMutationError } from "../../apis/common";
import DeleteButton from "../common/DeleteButton";
import FieldView from "../common/FieldView";
import { showError, showSuccess } from "../common/notifications";
import { modals } from "@mantine/modals";
import { StickyHeaderTable } from "../common/StickyHeaderTable";
import { QueryLoader } from "../common/QueryLoader";
import ClickableRow from "../common/ClickableRow";

interface FieldMenuProps {
  farm: FarmReadData,
  field?: FieldReadData,
  fieldPolygon: Polygon,
  onFieldClose: () => void,
  onFieldDelete: () => void,
}

export default function FieldMenu({ farm, field, fieldPolygon, onFieldClose, onFieldDelete }: FieldMenuProps) {
  const queryClient = useQueryClient();
  
  const fieldSubmit = useMutation({
    mutationFn: field ? updateField : createField,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.refetchQueries({ predicate: (query) => { return query.queryKey[0] === 'fieldList' } });
      onFieldClose();
    },
    onError: showMutationError
  });

  const fieldDelete = useMutation({
    mutationFn: deleteField,
    onSuccess: (data) => {
      showSuccess(data.msg);
      queryClient.invalidateQueries({ predicate: (query) => { return query.queryKey[0] === 'fieldList' } });
      onFieldDelete();
    },
    onError: showMutationError
  });

  const fieldForm = useForm<FieldWriteRequestData>({
    mode: 'controlled',
    initialValues: {
      name: field?.name ?? "",
      farmId: field?.farmId ?? farm.id,
      polygon: fieldPolygon,
      traitValues: field?.traitValues ?? [],
    },
    validate: {
      name: (value) => {
        if (!value.trim().length) return 'Campo obrigatório';
      },
    },
    transformValues: ({ name, ...otherValues }) => ({
      name: name.trim(),
      ...otherValues
    })
  });

  const handleSubmitButtonClick = () => {
    const fieldValidation = fieldForm.validate();

    if (fieldValidation.hasErrors)
      return showError("Há campos inválidos no formulário.", "Erro");

    fieldSubmit.mutate({
      ...(field && {id: field.id}),
      data: {
        farmId: fieldForm.getValues()['farmId'],
        name: fieldForm.getTransformedValues()['name'],
        polygon: fieldForm.getValues()['polygon'],
        traitValues: fieldForm.getValues()['traitValues'],
      },
    });
  }

  const fieldDeleteButton = (    
    <Tooltip label="Excluir área">
      {field ?
      <DeleteButton
        modalTitle="Deseja mesmo excluir essa área?"
        modalContent={
          <Text size="sm" mb={20}>
            Ao confirmar, você <strong>removerá</strong> o cadastro da 
            área <Text span fw={700}>{field.name}</Text>,
            junto com todos os dados vinculados a ela.
          </Text>
        }
        onModalConfirm={() => fieldDelete.mutate(field.id)}
      /> : 
      <DeleteButton
        modalTitle="Deseja mesmo excluir essa área?"
        modalContent={
          <Text size="sm" mb={20}>
            Ao confirmar, você <strong>removerá</strong> a área desenhada.
          </Text>
        }
        onModalConfirm={onFieldDelete}
      />}
    </Tooltip>
  );

  const fieldCloseButton = field &&
    <Tooltip label="Fechar área">
      <Button variant="outline" size="compact-md" color="var(--mantine-color-gray-6)" onClick={onFieldClose}>
        <IconX />
      </Button>  
    </Tooltip>;

  const submitButton = (!field || fieldForm.isDirty()) && // TODO: triggar atualização da área tb quando o polígono for alterado
    <Button onClick={handleSubmitButtonClick} loading={fieldSubmit.isPending}>
      {field ? "Atualizar área" : "Cadastrar área"}
    </Button>;

  const headerHeight = "50px";

  return (
    <>
    <Group justify="space-between" align="baseline" style={{height: headerHeight}}>
      {fieldDeleteButton}
      {fieldCloseButton}
    </Group>
    <Stack justify="space-between" style={{height: `calc(100% - ${headerHeight})`}}>
      <Stack align="stretch">
        <EditableFieldView
          editing={!field}
          form={fieldForm}
          fieldName="name"
          fieldLabel="Nome da área"
        />
        {field &&
        <PlantFitnessButton farm={farm} />}
      </Stack>
      {submitButton}
    </Stack>
    </>
  )
}

interface EditableFieldViewProps {
  editing: boolean,
  form: UseFormReturnType<FieldWriteRequestData, (values: FieldWriteRequestData) => FieldWriteRequestData>,
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
