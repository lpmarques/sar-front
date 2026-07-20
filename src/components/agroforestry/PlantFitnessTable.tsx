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

import { Table } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { FarmReadData, getFarmPlantFitnessList, SitePlantFitness } from "../../apis/agroforestry";
import ClickableRow from "../common/ClickableRow";
import { QueryLoader } from "../common/QueryLoader";
import { StickyHeaderTable } from "../common/StickyHeaderTable";
import { NativityBadge } from ".";

export default function PlantFitnessTable({ farm }: { farm: FarmReadData }) {
  const plantFitnessesQueryOptions = {
    queryKey: ['farmPlantFitnessList', farm.id.toString()],
    queryFn: getFarmPlantFitnessList,
  }

  const plantFitnesses = useQuery(plantFitnessesQueryOptions);
  const plants = plantFitnesses.data ?? [];

  const header = (
    <Table.Tr>
      <Table.Th>Nome científico</Table.Th>
      <Table.Th w={100}></Table.Th>
      <Table.Th>Pontuação</Table.Th>
      <Table.Th>Por aptidão</Table.Th>
      <Table.Th>Por naturalidade</Table.Th>
    </Table.Tr>
  );

  const rows = plants.map((fitness: SitePlantFitness) => (
    <ClickableRow
      key={fitness.acceptedTaxonName}
      onClick={() => handleRowClick(fitness.plantId)}
      style={{'--hover-color': '#bef7ce'}}
    >
      <Table.Td>{fitness.acceptedTaxonName}</Table.Td>
      <Table.Td>
        <NativityBadge plantFitness={fitness} />
      </Table.Td>
      <Table.Td>{fitness.fitnessScore + fitness.nativityScore}</Table.Td>
      <Table.Td>{fitness.fitnessScore}</Table.Td>
      <Table.Td>{fitness.nativityScore}</Table.Td>
      <Table.Td></Table.Td>
    </ClickableRow>
  ));

  const handleRowClick = (plantId: number) => {
    window.open(`/plants/${plantId}?edit=false`, '_blank');
  }

  return (
    <QueryLoader {...plantFitnessesQueryOptions}>
      <StickyHeaderTable
        header={header}
        rows={rows}
        scrollWidth={600}
        scrollHeight={550} 
      />
    </QueryLoader>
  )
}
