import { useEffect } from 'react';
import unidecode from 'unidecode-plus';
import { Table, TextInput } from '@mantine/core';
import { getPlantPopularNameList, PopularNameReadData, PopularNameWriteRequestData } from '../../apis/catalog';
import { BuildWriteRequestDataProps, ContentDisplayRowProps, ContentForm, ContentFormRowProps } from './SectionConfigs';
import { FormErrors, useForm } from '@mantine/form';
import { QueryOptions } from '../../apis/common';

export function buildPopularNameListQueryOptions(plantId: number): QueryOptions<PopularNameReadData[]> {
  return {
    queryKey: [
      'plantPopularNameList',
      String(plantId),
      'status=accepted,proposed',
      'with_user_endorsement_info=true',
    ],
    queryFn: getPlantPopularNameList,
  } as QueryOptions<PopularNameReadData[]>;
}

export const popularNameFormUniqueKey = [
  'name',
] as (keyof ContentForm<PopularNameWriteRequestData>)[];

export function validatePopularNameFormToReadDataDiff(
  formValues: ContentForm<PopularNameWriteRequestData>,
  readData: PopularNameReadData,
  errMsg: string
): FormErrors {
  return {
    ...(formValues.name === readData.name && { name: errMsg }),
  };
}

export function buildPopularNameWriteRequestData({
  formValues,
  plantId,
  sourceId,
  contentProposerComment
}: BuildWriteRequestDataProps<PopularNameWriteRequestData>): PopularNameWriteRequestData {
  return {
    ...formValues,
    plantId: plantId,
    sourceId: sourceId,
    contentProposerComment: contentProposerComment,
  }
}

export function PopularNameHeader() {
  const font = {
    fz: "h6",
    fw: 550,
  }
  
  return (
    <Table.Th {...font} w={250}>Nome</Table.Th>
  );
}

export function PopularNameRow({ data, ...tableTdProps }: ContentDisplayRowProps<PopularNameReadData>) {
  return (
    <Table.Td {...tableTdProps}>{data.name}</Table.Td>
  )
}

export function PopularNameFormRow({ forms, setForms }: ContentFormRowProps<PopularNameReadData, PopularNameWriteRequestData>) {

  const form = useForm<ContentForm<PopularNameWriteRequestData>>({
    initialValues: {
      name: '',
    },
    validate: {
      name: (value) => {
        if (!value.trim().length) return 'Campo obrigatório';
        if (!/^[-a-z]+$/.test(unidecode(value))) return 'Formato inválido';
      },
    },
    transformValues: (values) => ({
      name: values.name.trim().toLowerCase().replace(/\s+/g, '-'),
    })
  });

  useEffect(() => {
    setForms([...forms, form]);
  }, []);

  return (
    <Table.Td>
      <TextInput
        key={form.key('name')}
        {...form.getInputProps('name')}
        />
    </Table.Td>
  )
}
