import clsx from 'clsx';
import React, { useState } from 'react';
import { Container, keys, Paper, ScrollArea, Table, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { getScientificNameList, ScientificNameReadData } from "../../apis/catalog";
import { QueryLoader } from '../common/QueryLoader';
import classes from './PlantList.module.css';


export default function PlantList() {
  const nameListQueryParams = {
    queryKey: [],
    queryFn: getScientificNameList
  };
  const { data } = useQuery(nameListQueryParams);
  
  return (
    <QueryLoader {...nameListQueryParams}>
      {data ? 
      <ScientificNamesTable data={data}/> :
      <></>}
    </QueryLoader>
  );
}

function ScientificNamesTable({ data }: { data: ScientificNameReadData[] }) {

  interface RowData {
    scientificName: string,
    popularNames: string,
  }

  const initialRowsData: RowData[] = data.map((item: ScientificNameReadData) => {
    return {
      scientificName: item.name,
      popularNames: item.popularNames.join(", ")
    };
  }).sort((a, b) => {
    return a.scientificName.localeCompare(b.scientificName);
  });

  const [rowsData, setRowsData] = useState(initialRowsData);
  const [scrolled, setScrolled] = useState(false);
  const [search, setSearch] = useState('');

  function filterData(data: RowData[], search: string) {
    const query = search.toLowerCase().trim();
    return data.filter((item) =>
      keys(data[0]).some((key) => item[key].toLowerCase().includes(query))
    );
  }

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setSearch(value);
    setRowsData(filterData(initialRowsData, value));
    console.log(search);
    console.log(rowsData);
  };

  const rows = rowsData.map((row: RowData) => (
    <Table.Tr key={row.scientificName}>
      <Table.Td>{row.scientificName}</Table.Td>
      <Table.Td>{row.popularNames}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size={1200}>
      <TextInput
        placeholder="Busque por um nome"
        mb="md"
        leftSection={<IconSearch size={16} stroke={1.5} />}
        value={search}
        onChange={handleSearchChange}
      />
      <Paper withBorder mt={1}>
        <ScrollArea h={550} onScrollPositionChange={({ y }) => setScrolled(y !== 0)}>
          <Table highlightOnHover withRowBorders={false}>
            <Table.Thead className={clsx(classes.header, { [classes.scrolled]: scrolled })}>
              <Table.Tr>
                <Table.Th>Nome científico</Table.Th>
                <Table.Th>Nomes populares</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>
    </Container>
  )
}