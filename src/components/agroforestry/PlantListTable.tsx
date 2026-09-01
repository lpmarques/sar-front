/*
Simulador Agroflorestal Regenera (SAR)
Copyright (C) 2026  Lucas Marques and Regenera Mata Atlântica

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { useMemo, useState } from "react";
import {
  ActionIcon,
  Paper,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconExternalLink, IconSearch } from "@tabler/icons-react";
import { PlantReadData } from "../../apis/catalog";
import { useProject } from "../../hooks/useProject";
import ClickableRow from "../common/ClickableRow";
import { StickyHeaderTable } from "../common/StickyHeaderTable";
import { NativityBadge } from ".";
import { SitePlantFitness } from "../../apis/agroforestry";

interface PlantListTableProps {
  plants: PlantReadData[];
  onSelect: (plantId: number) => void;
}

interface RowData {
  plant: PlantReadData;
  scores?: SitePlantFitness;
}

/**
 * Pickable list of plants, modelled on `catalog/PlantList.tsx`.
 *
 * Rows are ordered by `fitnessScore` (biggest → smaller) when running inside a
 * `ProjectProvider`; otherwise by `mainPopularName`. The rightmost cell mirrors
 * the catalog-link button used in `CropInputPanel`.
 */
export default function PlantListTable({ plants, onSelect }: PlantListTableProps) {
  const project = useProject();
  const plantsFitnessMap = project?.plantsFitnessMap;

  const defaultRowsData = useMemo<RowData[]>(() => {
    const rows = plants.map((plant) => ({
      plant,
      scores: plantsFitnessMap?.[plant.acceptedTaxonName],
    }));

    rows.sort((a, b) => {
      if (a.scores && b.scores) {
        return (b.scores.fitnessScore + b.scores.nativityScore)
          - (a.scores.fitnessScore + a.scores.nativityScore);
      }
      return a.plant.mainPopularName.localeCompare(b.plant.mainPopularName);
    });

    return rows;
  }, [plants, plantsFitnessMap]);

  const [rowsData, setRowsData] = useState(defaultRowsData);
  const [search, setSearch] = useState('');

  const filterRows = (query: string): RowData[] => {
    const trimmed = query.toLowerCase().trim();
    if (!trimmed) return defaultRowsData;
    return defaultRowsData.filter(({ plant }) =>
      plant.acceptedTaxonName.toLowerCase().includes(trimmed)
      || plant.mainPopularName.toLowerCase().includes(trimmed)
      || plant.acceptedFamilyName.toLowerCase().includes(trimmed)
    );
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.currentTarget;
    setSearch(value);
    setRowsData(filterRows(value));
  };

  const handleRowClick = (plantId: number) => onSelect(plantId);

  const openPlantPage = (e: React.MouseEvent, plantId: number) => {
    e.stopPropagation();
    window.open(`/plants/${plantId}`, '_blank');
  };

  const showFitnessColumn = !!plantsFitnessMap;

  const header = (
    <Table.Tr>
      <Table.Th>Nome científico</Table.Th>
      <Table.Th>Nome popular</Table.Th>
      {showFitnessColumn && <Table.Th>Relação com o local</Table.Th>}
      <Table.Th w={50}></Table.Th>
    </Table.Tr>
  );

  const rows = rowsData.map(({ plant }) => (
    <ClickableRow
      key={plant.id}
      onClick={() => handleRowClick(plant.id)}
      style={{ '--hover-color': '#bef7ce' }}
    >
      <Table.Td fs="italic">{plant.acceptedTaxonName}</Table.Td>
      <Table.Td>{plant.mainPopularName}</Table.Td>
      {showFitnessColumn && (
      <Table.Td>
        {plantsFitnessMap![plant.acceptedTaxonName] &&
        <NativityBadge plantFitness={plantsFitnessMap![plant.acceptedTaxonName]} />}
      </Table.Td>)}
      <Table.Td>
        <ActionIcon
          variant="subtle"
          size="sm"
          onClick={(e) => openPlantPage(e, plant.id)}
          aria-label="Abrir no Catálogo de Plantas"
        >
          <IconExternalLink size={14} />
        </ActionIcon>
      </Table.Td>
    </ClickableRow>
  ));

  rows.push(
    <Table.Tr key="summary">
      <Table.Td colSpan={showFitnessColumn ? 4 : 3}>
        <Text c="dimmed" fw={500} ta="center">
          {rowsData.length > 0
            ? `${rowsData.length} resultado(s) encontrado(s)`
            : 'Nenhum resultado encontrado'}
        </Text>
      </Table.Td>
    </Table.Tr>,
  );

  return (
    <>
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
          scrollWidth={600}
          scrollHeight={450}
          striped
          stripedColor="#f0f2f2"
          withRowBorders={false}
        >
          {rows}
        </StickyHeaderTable>
      </Paper>
    </>
  );
}