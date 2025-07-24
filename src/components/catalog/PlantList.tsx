import clsx from 'clsx';
import React, { useState } from 'react';
import { Badge, Container, Paper, ScrollArea, Table, Text, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { isArrayOfType } from "../../apis/common";
import { getPlantList, PlantListItemData } from "../../apis/catalog";
import { QueryLoader } from '../common/QueryLoader';
import classes from './PlantList.module.css';

export default function PlantList() {
  const plantListQueryParams = {
    queryKey: [],
    queryFn: getPlantList
  };
  const { data } = useQuery(plantListQueryParams);
  
  return (
    <QueryLoader {...plantListQueryParams}>
      {data ? 
      <PlantsTable data={data}/> :
      <></>}
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
  lifeCycle: string,
  lifeForms: string[],
}

function plantToRowData(data: PlantListItemData): RowData {
  let familyName = data.traitValues.filter((trait) => trait.traitKey == 'family_name');
  let lifeCycle = data.traitValues.filter((trait) => trait.traitKey == 'life_cycle');
  let lifeForms = data.traitValues.filter((trait) => trait.traitKey == 'life_forms');
  return {
    plantId: data.id.toString(),
    scientificName: data.acceptedScientificName,
    synonymScientificNames: data.synonymScientificNames.join(", "),
    popularNames: data.popularNames.join(", "),
    familyName: familyName.length > 0 && typeof familyName[0].value === 'string' ? familyName[0].value : "",
    lifeCycle: lifeCycle.length > 0 && typeof lifeCycle[0].value === 'string' ? lifeCycle[0].value : "",
    lifeForms: lifeForms.length > 0 && isArrayOfType(lifeForms[0].value, 'string') ? lifeForms[0].value as string[] : [],
  };
}

function PlantsTable({ data }: { data: PlantListItemData[] }) {

  const defaultRowsData: RowData[] = data.map((item: PlantListItemData) => plantToRowData(item)).sort((a, b) => {
    return a.scientificName.localeCompare(b.scientificName);
  });

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
  )

  const rows = rowsData.map((row: RowData) => {
    // const lifeForms = row.lifeForms.map((form) => (
    //   <Badge color="green" size="sm" variant="light">{form}</Badge>
    // ))

    return (
      <Table.Tr key={row.scientificName} style={{cursor: 'pointer'}} onClick={() => handleRowClick(row)}>
        <Table.Td w={250}>{row.scientificName}</Table.Td>
        <Table.Td>{row.familyName}</Table.Td>
        <Table.Td>{row.popularNames}</Table.Td>
        <Table.Td w={150}>{row.lifeForms}</Table.Td>
        <Table.Td w={110}>{row.lifeCycle}</Table.Td>
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
        <ScrollArea h={550} onScrollPositionChange={({ y }) => setScrolled(y !== 0)}>
          <Table highlightOnHover striped highlightOnHoverColor="#c5fac3" stripedColor="#f0f2f2" withRowBorders={false}>
            <Table.Thead className={clsx(classes.header, { [classes.scrolled]: scrolled })}>
              {header}
            </Table.Thead>
            <Table.Tbody>
              {rows}
              <Table.Tr>
                <Table.Td colSpan={Object.keys(data[0]).length}>
                  <Text c="dimmed" fw={500} ta="center">
                    {rows.length} resultado(s) encontrado(s)
                  </Text>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>
    </Container>
  )
}