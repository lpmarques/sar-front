import { useEffect } from 'react';
import { Alert, Table, Text, TextInput } from '@mantine/core';
import { getPlantPopularNameList, PopularNameReadData, PopularNameWriteRequestData } from '../../apis/catalog';
import { BuildWriteRequestDataProps, ContentDisplayRowProps, ContentForm, ContentFormRowProps } from './SectionConfigs';
import { FormErrors, useForm } from '@mantine/form';
import { QueryOptions } from '../../apis/common';
import { unaccent } from '../../utils/common';
import { IconInfoCircle } from '@tabler/icons-react';

export function PopularNameSectionInfo() {
  return (
    <Alert variant="light" color="blue" title="Nomes populares" icon={<IconInfoCircle />}>
      <Text fz="md" pb={10}>Classificação popular da planta.</Text>
      <Text fz="md" pb={10}>Uma mesma planta (espécie ou variedade) pode ter diversos nomes populares.</Text>
    </Alert>
  )
}

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

export type PopularNameForm = ContentForm<PopularNameWriteRequestData>; 

export const popularNameFormKeys = [
  'name',
] as (keyof PopularNameForm)[];

export function validatePopularNameFormToReadDataDiff(
  formValues: PopularNameForm,
  readData: PopularNameReadData,
  errMsg: string
): FormErrors | undefined {
  const matchErrors = {
    ...(formValues.name === readData.name && { name: errMsg }),
  };

  if (Object.keys(matchErrors).length === popularNameFormKeys.length)
    return matchErrors;
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
    <Table.Th {...font} w={200}>Nome</Table.Th>
  );
}

export function PopularNameRow({ data, ...tableTdProps }: ContentDisplayRowProps<PopularNameReadData>) {
  return (
    <Table.Td {...tableTdProps}>{data.name}</Table.Td>
  )
}

export function usePopularNameForm({ initialValues }: { initialValues?: { [key in keyof PopularNameForm]?: string } } = {}) {
  const defaultInitial = {
    name: '',
  };

  return useForm<PopularNameForm>({
    initialValues: {
      ...defaultInitial,
      ...initialValues,
    },
    validate: {
      name: (value) => {
        if (!value.trim().length) return 'Campo obrigatório';
        if (!/^[-a-z]+$/.test(unaccent(value))) return 'Formato inválido';
      },
    },
    transformValues: (values) => ({
      name: values.name.trim().toLowerCase().replace(/\s+/g, '-'),
    })
  });
}

export function PopularNameFormRow({ forms, setForms }: ContentFormRowProps<PopularNameReadData, PopularNameWriteRequestData>) {

  const form = usePopularNameForm();

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
