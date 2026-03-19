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

import { useEffect } from 'react';
import { Alert, List, NativeSelect, Table, Text, TextInput } from '@mantine/core';
import { FormErrors, isNotEmpty, useForm } from '@mantine/form';
import { useQuery } from '@tanstack/react-query';
import { getPlantTaxonList, TaxonReadData, TaxonWriteRequestData } from '../../apis/catalog';
import { QueryOptions } from '../../apis/common';
import { useLanguage } from '../../hooks/useLanguage';
import { capitalize, undefinedIfEmpty } from '../../utils/common';
import { BuildWriteRequestDataProps, ContentDisplayRowProps, ContentForm, ContentFormRowProps } from './SectionConfigs';
import { IconInfoCircle } from '@tabler/icons-react';

export function TaxonSectionInfo() {
  return (
    <Alert variant="light" color="blue" title="Taxonomia" icon={<IconInfoCircle />}>
      <Text fz="md" pb={10}>Classificação taxonômica (científica) da planta.</Text>
      <Text fz="md" pb={10}>Cada planta (espécie ou variedade) pode ter mais de um nome científico, respeitada a quantidade máxima por status taxonômico:</Text>
      <List>
        <List.Item>NOME ACEITO: um e apenas um</List.Item>
        <List.Item>SINÔNIMO: um ou mais</List.Item>
      </List>
    </Alert>
  )
}

export function buildTaxonListQueryOptions(plantId: number): QueryOptions<TaxonReadData[]> {
  return {
    queryKey: [
      'plantTaxonList',
      String(plantId),
      'status=accepted,proposed',
      'with_user_endorsement_info=true',
    ],
    queryFn: getPlantTaxonList,
  } as QueryOptions<TaxonReadData[]>;
}

export type TaxonForm = ContentForm<TaxonWriteRequestData>;

export const taxonFormKeys = [
  'family',
  'species',
  'subspecies',
  'variety',
  'taxonomicStatus',
] as (keyof TaxonForm)[];

export function validateTaxonFormsDiff(
  a: TaxonForm,
  b: TaxonForm,
  errMsg: string = "Item duplicado"
): FormErrors | undefined {

  const matchErrors = taxonFormKeys.reduce((matchErrors: FormErrors, key) => {
    if (a[key] === b[key])
      matchErrors[key as string] = errMsg;

    return matchErrors;
  }, {});

  if (Object.keys(matchErrors).length === taxonFormKeys.length)
    return matchErrors;

  if (a['taxonomicStatus'] === 'accepted' && 'taxonomicStatus' in matchErrors)
    return { 'taxonomicStatus': 'Já há outro nome aceito na proposta' };
}

export function validateTaxonFormToReadDataDiff(
  formValues: TaxonForm,
  readData: TaxonReadData,
  errMsg: string
): FormErrors | undefined {
  const matchErrors =  {
    ...(formValues.family === readData.family && { family: errMsg }),
    ...(formValues.species === readData.species && { species: errMsg }),
    ...(formValues.subspecies === undefinedIfEmpty(readData.subspecies) && { subspecies: errMsg }),
    ...(formValues.variety === undefinedIfEmpty(readData.variety) && { variety: errMsg }),
    ...(formValues.taxonomicStatus === readData.taxonomicStatus && { taxonomicStatus: errMsg }),
  };
  
  if (Object.keys(matchErrors).length === taxonFormKeys.length)
    return matchErrors;
}

export function buildTaxonWriteRequestData({
  formValues,
  plantId,
  sourceId,
  contentProposerComment
}: BuildWriteRequestDataProps<TaxonWriteRequestData>): TaxonWriteRequestData {
  return {
    ...formValues,
    plantId: plantId,
    sourceId: sourceId,
    contentProposerComment: contentProposerComment,
  }
}

export function TaxonHeader() {
  const font = {
    fz: "h6",
    fw: 550,
  }

  return (
    <>
    <Table.Th {...font} w={80}>Status taxonômico</Table.Th>
    <Table.Th {...font} w={100}>Família</Table.Th>
    <Table.Th {...font} w={150}>Espécie</Table.Th>
    <Table.Th {...font} w={50}>Subespécie</Table.Th>
    <Table.Th {...font} w={50}>Variedade</Table.Th>
    </>
  )
}

export function TaxonRow({ data, ...tableTdProps }: ContentDisplayRowProps<TaxonReadData>) {
  const { lang } = useLanguage();
  const statusTranslation: { [key: string]: string } = { // TODO: create taxonomic_statuses table and replace this
    "accepted": "nome aceito",
    "synonym": "sinônimo"
  };

  const status = lang === "pt-BR" ? statusTranslation[data.taxonomicStatus] : data.taxonomicStatus;

  return (
    <>
    <Table.Td {...tableTdProps}>{status.toUpperCase()}</Table.Td>
    <Table.Td {...tableTdProps}>{data.family}</Table.Td>
    <Table.Td {...tableTdProps}>{data.species}</Table.Td>
    <Table.Td {...tableTdProps}>{data.subspecies}</Table.Td>
    <Table.Td {...tableTdProps}>{data.variety}</Table.Td>
    </>
  )
}

export function useTaxonForm({ initialValues }: { initialValues?: { [key in keyof TaxonForm]?: string } } = {}) {
  const defaultInitial = {
    family: '',
    species: '',
    subspecies: '',
    variety: '',
    taxonomicStatus: '',
  };

  return useForm<TaxonForm>({
    initialValues: {
      ...defaultInitial,
      ...initialValues
    },
    validate: {
      taxonomicStatus: isNotEmpty('Campo obrigatório'),
      family: (value) => {
        if (!value.trim().length) return 'Campo obrigatório';
        if (!/^[A-Z][a-z]+$/.test(value)) return 'Formato inválido';
      },
      species: (value) => {
        if (!value.trim().length) return 'Campo obrigatório';
        if (!/^[A-Z][a-z]+\s(x\s)?[a-z]+$/.test(value)) return 'Formato inválido';
      },
      subspecies: (value) => {
        if (value && !/^[a-z]{2,}$/.test(value)) return 'Formato inválido';
      },
      variety: (value) => {
        if (value && !/^[a-z]{2,}$/.test(value)) return 'Formato inválido';
      },
    },
    transformValues: (values) => ({
      family: capitalize(values.family),
      species: capitalize(values.species),
      subspecies: undefinedIfEmpty(values.subspecies?.trim().toLowerCase()),
      variety: undefinedIfEmpty(values.variety?.trim().toLowerCase()),
      taxonomicStatus: values.taxonomicStatus,
    })
  });
}

export function TaxonFormRow({ forms, setForms, itemsQueryOptions }: ContentFormRowProps<TaxonReadData, TaxonWriteRequestData>) {
  const { data } = useQuery(itemsQueryOptions);
  const acceptedName = data?.find(item => item.contentStatus === "accepted" && item.taxonomicStatus === "accepted");

  const form = useTaxonForm({
    initialValues: {
      family: acceptedName?.family ?? '',
      species: '',
      subspecies: '',
      variety: '',
      taxonomicStatus: 'synonym',
    }
  });

  useEffect(() => {
    setForms([...forms, form]);
  }, []);

  const statusOptions = [ // TODO: create taxonomic_statuses table and replace this
    {
      value: "accepted",
      label: "NOME ACEITO"
    },
    {
      value: "synonym",
      label: "SINÔNIMO"
    }
  ];

  return (
    <>
    <Table.Td>
      <NativeSelect
        key={form.key('taxonomicStatus')}
        data={statusOptions}
        {...form.getInputProps('taxonomicStatus')}
        />
    </Table.Td>
    <Table.Td>
      <TextInput 
        key={form.key('family')}
        {...form.getInputProps('family')}
        />
    </Table.Td>
    <Table.Td>
      <TextInput 
        key={form.key('species')}
        {...form.getInputProps('species')}
        />
    </Table.Td>
    <Table.Td>
      <TextInput 
        key={form.key('subspecies')}
        {...form.getInputProps('subspecies')}
        />
    </Table.Td>
    <Table.Td>
      <TextInput 
        key={form.key('variety')}
        {...form.getInputProps('variety')}
        />
    </Table.Td>
    </>
  )
}
