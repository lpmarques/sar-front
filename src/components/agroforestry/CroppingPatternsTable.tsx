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

import { Button, Center, CloseButton, Loader, Table, Tooltip } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { CroppingPatternReadData, getCroppingPatternList } from "../../apis/agroforestry";
import { useAuth } from "../../hooks/useAuth";
import { StickyHeaderTable } from "../common/StickyHeaderTable";
import { UserAvatar } from "../user";
import ClickableRow from "../common/ClickableRow";

interface CroppingPatternsTableProps {
  selectedPatternId?: number,
  onSelect: (patternId: number) => void,
  onUnselect: () => void,
}

export default function CroppingPatternsTable({ selectedPatternId, onSelect, onUnselect }: CroppingPatternsTableProps) {
  const { user } = useAuth();

  const userPatternsQueryOptions = {
    queryKey: [
      'croppingPatternList',
      'with_rows=true',
      `author_id=${user!.id}`,
    ],
    queryFn: getCroppingPatternList,
  };
  const publicPatternsQueryOptions = {
    queryKey: [
      'croppingPatternList',
      'with_rows=true',
      'is_public=true',
    ],
    queryFn: getCroppingPatternList,
  };

  const userPatterns = useQuery(userPatternsQueryOptions);
  const publicPatterns = useQuery(publicPatternsQueryOptions);

  if (userPatterns.isLoading || publicPatterns.isLoading) {
    return (
      <Center>
        <Loader />
      </Center>
    );
  }

  const patterns = [...userPatterns.data!, ...publicPatterns.data!.filter(pattern => pattern.author.id !== user!.id)]

  const header = (
    <Table.Tr>
      <Table.Th>Nome</Table.Th>
      <Table.Th>Autor</Table.Th>
      <Table.Th>Diversidade de espécies</Table.Th>
      {/* <Table.Th w={140}></Table.Th> */}
    </Table.Tr>
  );

  const handleUnselect = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    onUnselect();
  };

  const selectionColor = 'var(--mantine-color-blue-light)';
  
  const rows = patterns.map((pattern) => {
    const isSelected = pattern.id === selectedPatternId;
    const backgroundColor = isSelected ? selectionColor : undefined;
    
    return <ClickableRow
      key={pattern.id}
      onClick={() => onSelect(pattern.id)}
      style={{'backgroundColor': backgroundColor, '--hover-color': selectionColor}} 
    >
      <Table.Td>{pattern.name}</Table.Td>
      <Table.Td>
        <UserAvatar size="md" user={user!}/>
      </Table.Td>
      <Table.Td>{distinctPlantCount(pattern)}</Table.Td>
      <Table.Td>
        {isSelected &&
        <Tooltip label="Desmarcar">
          <CloseButton
            size="sm"
            onClick={handleUnselect}
          />
        </Tooltip>
        }
      </Table.Td>
    </ClickableRow>
  });

  return (
    <StickyHeaderTable
      header={header}
      rows={rows}
      scrollWidth={600}
      scrollHeight={500}
    />
  );
}

function distinctPlantCount(pattern: CroppingPatternReadData): number {
  const ids = new Set<number>();
  for (const row of pattern.rows)
    for (const crop of row.crops)
      ids.add(crop.plant.id);

  return ids.size;
}

function mergePatterns(
  userPatterns: CroppingPatternReadData[],
  publicPatterns: CroppingPatternReadData[],
  userId: number
): CroppingPatternReadData[] {
  const otherPatterns = publicPatterns.filter(pattern => pattern.author.id !== userId);

  return [...userPatterns, ...otherPatterns];
}
