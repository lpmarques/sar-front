import { useEffect } from 'react';
import { Alert, Loader, NativeSelect, Table, TableTd, Text } from '@mantine/core';
import { FormErrors, useForm } from '@mantine/form';
import { IconInfoCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { getPlantNaturalOccurrenceRegionList, NaturalOccurrenceRegionReadData, NaturalOccurrenceRegionWriteRequestData } from '../../apis/catalog';
import { QueryOptions } from '../../apis/common';
import { BuildWriteRequestDataProps, ContentDisplayRowProps, ContentForm, ContentFormRowProps } from './SectionConfigs';
import { BiomeData, CountryData, getBiomeList, getCountryList, getStateList, getVegetationTypeList, StateData, VegetationTypeData } from '../../apis/geography';
import { sortValueFirst } from '../../utils/common';
import { QueryLoader } from '../common/QueryLoader';

export function NaturalOccurrenceRegionSectionInfo() {
  return (
    <Alert variant="light" color="blue" title="Regiões de Ocorrência Natural" icon={<IconInfoCircle />}>
      <Text fz="md" pb={10}>Regiões nas quais a planta é nativa.</Text>
      <Text fz="md" pb={10}>Aqui, cada região é definida pela combinação de quatro recortes territoriais: país, estado, bioma e tipo de vegetação (fitofisionomia).</Text>
    </Alert>
  )
}

export function buildNaturalOccurrenceRegionListQueryOptions(plantId: number) {
  return {
    queryKey: [
      'plantNaturalOccurrenceRegionList',
      String(plantId),
      'status=accepted,proposed',
      'with_user_endorsement_info=true',
    ],
    queryFn: getPlantNaturalOccurrenceRegionList,
  } as QueryOptions<NaturalOccurrenceRegionReadData[]>
}

export function sortNaturalOccurrenceRegions(a: NaturalOccurrenceRegionReadData, b: NaturalOccurrenceRegionReadData) {
  return sortValueFirst(a.country.name, b.country.name, "Brasil") ||
    sortValueFirst((a.biome?.name ?? ""), (b.biome?.name ?? ""), "Mata Atlântica") ||
    a.country.name.localeCompare(b.country.name) ||
    (a.biome?.name ?? "").localeCompare((b.biome?.name ?? "")) ||
    (a.state?.name ?? "").localeCompare((b.state?.name ?? "")) ||
    (a.vegetationType?.name ?? "").localeCompare((b.vegetationType?.name ?? ""));
}

export const naturalOccurrenceRegionFormKeys = [
  'countryId',
  'stateId',
  'biomeId',
  'vegetationTypeId',
] as (keyof ContentForm<NaturalOccurrenceRegionWriteRequestData>)[];

export function validateNaturalOccurrenceRegionFormToReadDataDiff(
  formValues: ContentForm<NaturalOccurrenceRegionWriteRequestData>,
  readData: NaturalOccurrenceRegionReadData,
  errMsg: string
): FormErrors | undefined {
  const matchErrors =  {
    ...(formValues.countryId === readData.country.id && { countryId: errMsg }),
    ...(formValues.stateId === readData.state?.id && { stateId: errMsg }),
    ...(formValues.biomeId === readData.biome?.id && { biomeId: errMsg }),
    ...(formValues.vegetationTypeId === readData.vegetationType?.id && { vegetationTypeId: errMsg }),
  };

  if (Object.keys(matchErrors).length === naturalOccurrenceRegionFormKeys.length)
    return matchErrors;
}

export function buildNaturalOccurrenceRegionWriteRequestData({
  formValues,
  plantId,
  sourceId,
  contentProposerComment
}: BuildWriteRequestDataProps<NaturalOccurrenceRegionWriteRequestData>): NaturalOccurrenceRegionWriteRequestData {
  return {
    ...formValues,
    plantId: plantId,
    sourceId: sourceId,
    contentProposerComment: contentProposerComment,
  }
}

export function NaturalOccurrenceRegionHeader() {
  const font = {
    fz: "h6",
    fw: 550,
  }
  
  return (
    <>
    <Table.Th {...font} w={100}>País</Table.Th>
    <Table.Th {...font} w={125}>Bioma</Table.Th>
    <Table.Th {...font} w={140}>Estado</Table.Th>
    <Table.Th {...font} w={215}>Tipo de Vegetação</Table.Th>
    </>
  );
}

export function NaturalOccurrenceRegionRow({ data, ...tableTdProps }: ContentDisplayRowProps<NaturalOccurrenceRegionReadData>) {
  return (
    <>
    <Table.Td {...tableTdProps}>{data.country.name}</Table.Td>
    <Table.Td {...tableTdProps}>{data.biome?.name ?? ""}</Table.Td>
    <Table.Td {...tableTdProps}>{data.state?.name ?? ""}</Table.Td>
    <Table.Td {...tableTdProps}>{data.vegetationType?.name ?? ""}</Table.Td>
    </>
  )
}

function FormRowPlaceholder() {
  return (
    <TableTd colSpan={4}>
      <Loader />
    </TableTd>
  )
}

export function NaturalOccurrenceRegionFormRow(props: ContentFormRowProps<NaturalOccurrenceRegionReadData, NaturalOccurrenceRegionWriteRequestData>) {
  const countriesQueryOptions = {
    queryKey: ['countryList'],
    queryFn: getCountryList
  };
  const countries = useQuery(countriesQueryOptions);

  return (
    <>
      {countries.data ?
      <FormRowBody countries={countries.data} {...props} /> :
      <QueryLoader Placeholder={FormRowPlaceholder} {...countriesQueryOptions}></QueryLoader> }
    </>
  )
}

interface FormRowBodyProps extends ContentFormRowProps<NaturalOccurrenceRegionReadData, NaturalOccurrenceRegionWriteRequestData> {
  countries: CountryData[],
}

function FormRowBody({ forms, setForms, countries }: FormRowBodyProps) {

  const lastRowValues = forms.length > 0 ? forms[forms.length-1].getValues() : undefined;
  const brazilId = countries.find(country => country.name === "Brasil")?.id;

  const form = useForm<ContentForm<NaturalOccurrenceRegionWriteRequestData>>({
    mode: 'controlled',
    initialValues: {
      countryId: lastRowValues?.countryId ?? brazilId ?? 0,
      biomeId: lastRowValues?.biomeId ?? 0,
      stateId: lastRowValues?.stateId ?? 0,
      vegetationTypeId: 0,
    },
    validate: {
      countryId: (value) => {
        if (!value) return 'Campo obrigatório';
      },
      biomeId: (value, values) => {
        if (!value && values.countryId === brazilId) return 'Campo obrigatório';
      },
      stateId: (value, values) => {
        if (!value && values.countryId === brazilId) return 'Campo obrigatório';
      },
      vegetationTypeId: (value, values) => {
        if (!value && values.countryId === brazilId) return 'Campo obrigatório';
      },
    },
    transformValues: (values) => ({
      countryId: values.countryId,
      stateId: values.stateId ? values.stateId : undefined,
      biomeId: values.biomeId ? values.biomeId : undefined,
      vegetationTypeId: values.vegetationTypeId ? values.vegetationTypeId : undefined,
    })
  });
  
  useEffect(() => {
    setForms([...forms, form]);
  }, []);

  form.watch('countryId', () => {
    form.setValues({
      biomeId: undefined,
      stateId: undefined,
      vegetationTypeId: undefined,
    });
  });
  
  form.watch('biomeId', () => {
    form.setValues({
      stateId: undefined,
      vegetationTypeId: undefined,
    });
  });
  
  form.watch('stateId', () => {
    form.setValues({
      vegetationTypeId: undefined,
    });
  });
  
  const selectedCountryId = form.getValues().countryId;
  const selectedStateId = form.getValues().stateId;
  const selectedBiomeId = form.getValues().biomeId;

  const stateFilterParams = selectedStateId ? [`state_id=${selectedStateId}`] : [];
  const biomeFilterParams = selectedBiomeId ? [`biome_id=${selectedBiomeId}`] : [];

  const biomesQueryOptions = {
    queryKey: [
      'biomeList',
      selectedCountryId?.toString(),
    ],
    queryFn: getBiomeList,
    enabled: Boolean(selectedCountryId),
  };
  const statesQueryOptions = {
    queryKey: [
      'stateList',
      selectedCountryId?.toString(),
      ...biomeFilterParams,
    ],
    queryFn: getStateList,
    enabled: Boolean(selectedBiomeId),
  };
  const vegetationTypesQueryOptions = {
    queryKey: [
      'vegetationTypeList',
      selectedCountryId?.toString(),
      ...stateFilterParams,
      ...biomeFilterParams,
    ],
    queryFn: getVegetationTypeList,
    enabled: Boolean(selectedStateId),
  };

  const biomes = useQuery(biomesQueryOptions);
  const states = useQuery(statesQueryOptions);
  const vegetationTypes = useQuery(vegetationTypesQueryOptions);

  const geoDataToOptions = (data: CountryData[] | StateData[] | BiomeData[] | VegetationTypeData[] | undefined) => {
    const defaultOpt = [{value: String(0), label: ""}];
    const options = data ? data.map(
      item => ({
        value: item.id.toString(),
        label: item.name
      })
    ).sort((a, b) => a.label.localeCompare(b.label)) : [];
    
    return [...defaultOpt, ...options];
  };

  const countryOptions = geoDataToOptions(countries).sort((a, b) => 
    sortValueFirst(a.value, b.value, String(0)) ||
    sortValueFirst(a.value, b.value, String(brazilId))
  );
  const biomeOptions = geoDataToOptions(biomes.data);
  const stateOptions = geoDataToOptions(states.data);
  const vegetationTypeOptions = geoDataToOptions(vegetationTypes.data);
  
  const changeValue = (path: string) => {
    return (e: React.ChangeEvent<HTMLSelectElement>) => form.setFieldValue(path, Number(e.target.value));
  };

  return (
    <>
    <Table.Td>
      <NativeSelect
        key={form.key('countryId')}
        data={countryOptions}
        {...form.getInputProps('countryId')}
        onChange={changeValue('countryId')}
        />
    </Table.Td>
    <Table.Td>
      <NativeSelect
        key={form.key('biomeId')}
        data={biomeOptions}
        {...form.getInputProps('biomeId')}
        onChange={changeValue('biomeId')}
        />
    </Table.Td>
    <Table.Td>
      <NativeSelect
        key={form.key('stateId')}
        data={stateOptions}
        {...form.getInputProps('stateId')}
        onChange={changeValue('stateId')}
        />
    </Table.Td>
    <Table.Td>
      <NativeSelect
        key={form.key('vegetationTypeId')}
        data={vegetationTypeOptions}
        {...form.getInputProps('vegetationTypeId')}
        onChange={changeValue('vegetationTypeId')}
        />
    </Table.Td>
    </>
  )
}
