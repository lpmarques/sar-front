import { useEffect } from 'react';
import { NativeSelect, Table, TextInput } from '@mantine/core';
import { FormErrors, isNotEmpty, useForm } from '@mantine/form';
import { useQuery } from '@tanstack/react-query';
import { getPlantTaxonList, TaxonReadData, TaxonWriteRequestData } from '../../apis/catalog';
import { QueryOptions } from '../../apis/common';
import { useLanguage } from '../../hooks/useLanguage';
import { capitalize, undefinedIfEmpty } from '../../utils/common';
import { BuildWriteRequestDataProps, ContentDisplayRowProps, ContentForm, ContentFormRowProps } from './SectionConfigs';

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

export const taxonFormUniqueKey = [
  'family',
  'species',
  'subspecies',
  'variety',
  'taxonomicStatus',
] as (keyof ContentForm<TaxonWriteRequestData>)[];

export function validateTaxonFormToReadDataDiff(
  formValues: ContentForm<TaxonWriteRequestData>,
  readData: TaxonReadData,
  errMsg: string
): FormErrors {
  return {
    ...(formValues.family === readData.family && { family: errMsg }),
    ...(formValues.species === readData.species && { species: errMsg }),
    ...(formValues.subspecies === undefinedIfEmpty(readData.subspecies) && { subspecies: errMsg }),
    ...(formValues.variety === undefinedIfEmpty(readData.variety) && { variety: errMsg }),
    ...(formValues.taxonomicStatus === readData.taxonomicStatus && { taxonomicStatus: errMsg }),
  };
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
    <Table.Th {...font} w={170}>Espécie</Table.Th>
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

export function TaxonFormRow({ forms, setForms, contentsQueryOptions }: ContentFormRowProps<TaxonReadData, TaxonWriteRequestData>) {
  const { data } = useQuery(contentsQueryOptions);
  const acceptedName = data?.find(item => item.contentStatus === "accepted" && item.taxonomicStatus === "accepted");

  const form = useForm<ContentForm<TaxonWriteRequestData>>({
    initialValues: {
      family: acceptedName?.family ?? '',
      species: '',
      subspecies: '',
      variety: '',
      taxonomicStatus: 'synonym',
    },
    validate: {
      taxonomicStatus: isNotEmpty('Campo obrigatório'),
      family: (value) => {
        if (!value.trim().length) return 'Campo obrigatório';
        if (!/^[A-Z][a-z]+$/.test(value)) return 'Formato inválido';
      },
      species: (value) => {
        if (!value.trim().length) return 'Campo obrigatório';
        if (!/^[A-Z][a-z]+\s[a-z]{2,}$/.test(value)) return 'Formato inválido';
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
