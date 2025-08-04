import clsx from 'clsx';
import React, { useState } from 'react';
import { Badge, Container, Paper, ScrollArea, Table, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { isArrayOfType } from "../../apis/common";
import { getPlantList, PlantReadData, TraitValueReadData } from "../../apis/catalog";
import { QueryLoader } from '../common/QueryLoader';
import { StickyHeaderTable, TraitValue } from '.';

export default function PlantList() {
  const plantListQueryOptions = {
    queryKey: [
      'with_scientific_names=true',
      'with_popular_names=true',
      'with_trait_values=true',
      'scientific_names_toxonomic_status=synonym',
      'trait_values_trait_keys=family_name,life_cycle,life_forms'
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
  scientificName: string,
  synonymScientificNames: string,
  popularNames: string,
  familyName: string,
}

interface RowData extends TaxonomicData {
  plantId: string,
  lifeCycle: TraitValueReadData | undefined,
  lifeForms: TraitValueReadData | undefined,
}

function plantToRowData(data: PlantReadData): RowData {
  let familyName = data.traitValues!.find((trait) => trait.traitKey == 'family_name');
  let lifeCycle = data.traitValues!.find((trait) => trait.traitKey == 'life_cycle');
  let lifeForms = data.traitValues!.find((trait) => trait.traitKey == 'life_forms');
  return {
    plantId: data.id.toString(),
    scientificName: data.acceptedScientificName,
    synonymScientificNames: data.scientificNames!.join(", "),
    popularNames: data.popularNames!.join(", "),
    familyName: familyName && typeof familyName.value === 'string' ? familyName.value : "",
    lifeCycle: lifeCycle,
    lifeForms: lifeForms,
  };
}

function PlantsTable({ data }: { data: PlantReadData[] }) {
  const defaultRowsData: RowData[] = data.map((item: PlantReadData) => plantToRowData(item)).sort((a, b) =>
    a.scientificName.localeCompare(b.scientificName)
  );

  const [rowsData, setRowsData] = useState(defaultRowsData);
  const [scrolled, setScrolled] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  
  const nameKeys = [
    'scientificName',
    'synonymScientificNames',
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

  const rows = rowsData.map((row: RowData) => {
    return (
      <Table.Tr key={row.scientificName} style={{cursor: 'pointer'}} onClick={() => handleRowClick(row)}>
        <Table.Td w={230}>{row.scientificName}</Table.Td>
        <Table.Td w={100}>{row.familyName}</Table.Td>
        <Table.Td w={500}>{row.popularNames}</Table.Td>
        <Table.Td w={150}>{row.lifeForms && <TraitValue data={row.lifeForms} />}</Table.Td>
        <Table.Td w={110}>{row.lifeCycle && <TraitValue data={row.lifeCycle} />}</Table.Td>
      </Table.Tr>
    )
  });

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
        <StickyHeaderTable header={header} rows={rows} scrollWidth={800} scrollHeight={550} tableProps={{highlightOnHover: true, highlightOnHoverColor: "#c5fac3"}} />
      </Paper>
    </Container>
  )
}