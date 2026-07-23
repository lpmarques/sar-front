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

import { useState } from 'react';
import { Container, Paper, Table, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { getPlantList, getTaxonName, PlantReadData, TraitValueReadData } from "../../apis/catalog";
import { QueryLoader } from '../common/QueryLoader';
import { StickyHeaderTable } from '../common/StickyHeaderTable';
import { TraitValueDisplay } from '.';
import ClickableRow from '../common/ClickableRow';
import AddRow from '../common/AddRow';
import { useAuth } from '../../hooks/useAuth';
import { showError } from '../common/notifications';

export default function PlantList() {
  const plantsQueryOptions = {
    queryKey: [
      'plantList',
      'status=accepted,proposed',
      'with_taxa=true',
      'with_popular_names=true',
      'with_trait_values=true',
      'taxa_taxonomic_status=synonym',
      'trait_values_trait_slugs=life_cycle,life_forms',
    ],
    queryFn: getPlantList
  };
  const plants = useQuery(plantsQueryOptions);
  
  return (
    <QueryLoader {...plantsQueryOptions}>
      {plants.data &&
      <PlantsTable data={plants.data}/>}
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
  const defaultRowsData = data.map((item) => plantToRowData(item)).sort((a, b) =>
    a.acceptedName.localeCompare(b.acceptedName)
  );

  const [rowsData, setRowsData] = useState(defaultRowsData);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  
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
  
  const handleAddRowClick = () => {
    if (!user) {
      showError("É preciso estar logado para executar essa ação.", null);
      return navigate('/login');
    }

    navigate('new');
  };

  const header = (
    <Table.Tr>
      <Table.Th>Nome científico</Table.Th>
      <Table.Th>Nomes populares</Table.Th>
      <Table.Th>Família</Table.Th>
      <Table.Th>Formas de vida</Table.Th>
      <Table.Th visibleFrom='sm'>Ciclo de vida</Table.Th>
    </Table.Tr>
  );

  const rows = rowsData.map((row: RowData) => (
    <ClickableRow 
      key={row.acceptedName} 
      onClick={() => handleRowClick(row)} 
      style={{'--hover-color': '#bef7ce'}}
    >
      <Table.Td w={175}>{row.acceptedName}</Table.Td>
      <Table.Td w={250}>{row.popularNames}</Table.Td>
      <Table.Td w={100}>{row.familyName}</Table.Td>
      <Table.Td w={150}>{row.lifeForms && <TraitValueDisplay data={row.lifeForms} />}</Table.Td>
      <Table.Td w={110} visibleFrom='sm'>{row.lifeCycle && <TraitValueDisplay data={row.lifeCycle} />}</Table.Td>
    </ClickableRow>
  ));

  rows.push(
    <Tooltip key={0} withArrow position="top" label="Clique para cadastrar uma nova planta.">
      <AddRow colSpan={5} onClick={() => handleAddRowClick()} style={{'--hover-color': '#bef7ce'}}/>
    </Tooltip>,
    <Table.Tr key={-1}>
      <Table.Td colSpan={5}>
        <Text c="dimmed" fw={500} ta="center">
          {rows.length > 0 ? `${rows.length} resultado(s) encontrado(s)` : "Nenhum resultado encontrado"}
        </Text>
      </Table.Td>
    </Table.Tr>,
  );

  return (
    <Container size={1200}>
      <Title fz="h3" mb={15}>Lista de Plantas</Title>
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
          scrollWidth={600}
          scrollHeight={450}
          striped
          stripedColor="#f0f2f2"
          withRowBorders={false}
        />
      </Paper>
    </Container>
  )
}