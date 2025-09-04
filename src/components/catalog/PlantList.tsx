import React, { useState } from 'react';
import { Container, Paper, Table, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { getPlantList, getTaxonName, PlantReadData, TraitValueReadData } from "../../apis/catalog";
import { QueryLoader } from '../common/QueryLoader';
import { StickyHeaderTable, TraitValueDisplay } from '.';

export default function PlantList() {
  const plantListQueryOptions = {
    queryKey: [
      'plantList',
      'with_taxa=true',
      'with_popular_names=true',
      'with_trait_values=true',
      'taxa_toxonomic_status=synonym',
      'trait_values_trait_slugs=life_cycle,life_forms',
    ],
    queryFn: getPlantList
  };
  const { data } = useQuery(plantListQueryOptions);
  
  return (
    <QueryLoader {...plantListQueryOptions}>
      <PlantsTable data={data!}/>
    </QueryLoader>
  );
}

interface TaxonomicData {
  acceptedName: string,
  synonymNames: string,
  popularNames: string,
  familyName: string,
}

interface RowData extends TaxonomicData {
  plantId: string,
  lifeCycle: TraitValueReadData | undefined,
  lifeForms: TraitValueReadData | undefined,
}

function plantToRowData(data: PlantReadData): RowData {
  const synonymNames = data.taxa!.map(item => getTaxonName(item));
  const lifeCycle = data.traitValues!.find((trait) => trait.traitSlug == 'life_cycle');
  const lifeForms = data.traitValues!.find((trait) => trait.traitSlug == 'life_forms');

  return {
    plantId: data.id.toString(),
    familyName: data.acceptedFamilyName,
    acceptedName: data.acceptedTaxonName,
    synonymNames: synonymNames.join(", "),
    popularNames: data.popularNames!.join(", "),
    lifeCycle: lifeCycle,
    lifeForms: lifeForms,
  };
}

function PlantsTable({ data }: { data: PlantReadData[] }) {
  const defaultRowsData: RowData[] = data.map((item: PlantReadData) => plantToRowData(item)).sort((a, b) =>
    a.acceptedName.localeCompare(b.acceptedName)
  );

  const [rowsData, setRowsData] = useState(defaultRowsData);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  
  const nameKeys = [
    'acceptedName',
    'synonymNames',
    'popularNames',
    'familyName',
  ] as (keyof TaxonomicData)[];

  function filterRowsByName(data: RowData[], search: string) {
    const query = search.toLowerCase().trim();
    return data.filter(
      (item) => nameKeys.some((key) => item[key].toLowerCase().includes(query))
    );
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.currentTarget;
    setSearch(value);
    setRowsData(filterRowsByName(defaultRowsData, value));
  };

  const handleRowClick = (row: RowData) => {
    navigate(row.plantId);
  }

  const header = (
    <Table.Tr>
      <Table.Th>Nome científico</Table.Th>
      <Table.Th>Família</Table.Th>
      <Table.Th>Nomes populares</Table.Th>
      <Table.Th>Formas de vida</Table.Th>
      <Table.Th>Ciclo de vida</Table.Th>
    </Table.Tr>
  );

  const rows = rowsData.map((row: RowData) => (
    <Table.Tr key={row.acceptedName} style={{cursor: 'pointer'}} onClick={() => handleRowClick(row)}>
      <Table.Td w={230}>{row.acceptedName}</Table.Td>
      <Table.Td w={100}>{row.familyName}</Table.Td>
      <Table.Td w={500}>{row.popularNames}</Table.Td>
      <Table.Td w={150}>{row.lifeForms && <TraitValueDisplay data={row.lifeForms} />}</Table.Td>
      <Table.Td w={110}>{row.lifeCycle && <TraitValueDisplay data={row.lifeCycle} />}</Table.Td>
    </Table.Tr>
  ));

  rows.push(
    <Table.Tr key={0}>
      <Table.Td colSpan={Object.keys(data[0]).length}>
        <Text c="dimmed" fw={500} ta="center">
          {rows.length} resultado(s) encontrado(s)
        </Text>
      </Table.Td>
    </Table.Tr>
  )

  return (
    <Container size={1200}>
      <TextInput
        placeholder="Busque um nome"
        mb="md"
        leftSection={<IconSearch size={16} stroke={1.5} />}
        value={search}
        onChange={handleSearchChange}
      />
      <Paper withBorder>
        <StickyHeaderTable
          header={header}
          rows={rows}
          scrollWidth={800}
          scrollHeight={550}
          striped
          stripedColor="#f0f2f2"
          highlightOnHover
          highlightOnHoverColor="#bef7ce"
          withRowBorders={false}
        />
      </Paper>
    </Container>
  )
}