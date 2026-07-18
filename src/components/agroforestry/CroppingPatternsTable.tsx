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

import { ActionIcon, Center, CloseButton, Group, Table, Tooltip } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { IconArrowsMaximize } from "@tabler/icons-react";
import { CroppingPatternReadData, getCroppingPatternList } from "../../apis/agroforestry";
import { useAuth } from "../../hooks/useAuth";
import { StickyHeaderTable } from "../common/StickyHeaderTable";
import { UserAvatar } from "../user";
import ClickableRow from "../common/ClickableRow";
import { QueryLoader } from "../common/QueryLoader";

interface CroppingPatternsTableProps {
  selectedPatternId?: number,
  onSelect: (patternId: number) => void,
  onUnselect: () => void,
  onPreview: (pattern: CroppingPatternReadData) => void,
}

export default function CroppingPatternsTable({ selectedPatternId, onSelect, onUnselect, onPreview }: CroppingPatternsTableProps) {
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

  if (userPatterns.isLoading) {
    return (
      <Center>
        <QueryLoader  {...userPatternsQueryOptions}/>
      </Center>
    );
  }

  if (publicPatterns.isLoading) {
    return (
      <Center>
        <QueryLoader {...publicPatternsQueryOptions} />
      </Center>
    );
  }

  const patterns = [...userPatterns.data!, ...publicPatterns.data!.filter(pattern => pattern.author.id !== user!.id)]

  const header = (
    <Table.Tr>
      <Table.Th>Nome</Table.Th>
      <Table.Th>Publicado por</Table.Th>
      <Table.Th>Diversidade de espécies</Table.Th>
      <Table.Th w={60}></Table.Th>
    </Table.Tr>
  );

  const handleUnselect = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    onUnselect();
  };

  const handlePreview = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, pattern: CroppingPatternReadData) => {
    e.stopPropagation();
    onPreview(pattern);
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
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          {isSelected &&
          <Tooltip label="Desmarcar">
            <CloseButton
              size="sm"
              onClick={handleUnselect}
            />
          </Tooltip>
          }
          <Tooltip label="Pré-visualizar padrão">
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={(e) => handlePreview(e, pattern)}
            >
              <IconArrowsMaximize size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
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
