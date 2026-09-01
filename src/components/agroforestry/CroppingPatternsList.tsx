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

import { ActionIcon, Button, Center, CloseButton, Group, Table, Tooltip } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { IconArrowsMaximize, IconPlus } from "@tabler/icons-react";
import { Fragment } from "react";
import { CroppingPatternReadData, getCroppingPatternList } from "../../apis/agroforestry";
import { useAuth } from "../../hooks/useAuth";
import { StickyHeaderTable } from "../common/StickyHeaderTable";
import { UserAvatar } from "../user";
import ClickableRow from "../common/ClickableRow";
import { QueryLoader } from "../common/QueryLoader";
import AddRow from "../common/AddRow";

interface CroppingPatternsListProps {
  selectedPatternId?: number,
  onSelect?: (patternId: number) => void,
  onUnselect?: () => void,
  onPreview: (patternId: number) => void,
  onCreate: () => void,
}

export default function CroppingPatternsList({
  selectedPatternId,
  onSelect,
  onUnselect,
  onPreview,
  onCreate,
}: CroppingPatternsListProps) {
  const { user } = useAuth();

  const userPatternsQueryOptions = {
    queryKey: [
      'croppingPatternList',
      `author_id=${user!.id}`,
    ],
    queryFn: getCroppingPatternList,
  };
  const publicPatternsQueryOptions = {
    queryKey: [
      'croppingPatternList',
      'is_public=true',
    ],
    queryFn: getCroppingPatternList,
  };

  const userPatterns = useQuery(userPatternsQueryOptions);
  const publicPatterns = useQuery(publicPatternsQueryOptions);

  if (userPatterns.isLoading)
    return (
      <Center>
        <QueryLoader {...userPatternsQueryOptions}/>
      </Center>
    );

  if (publicPatterns.isLoading)
    return (
      <Center>
        <QueryLoader {...publicPatternsQueryOptions} />
      </Center>
    );

  const patterns = [...userPatterns.data!, ...publicPatterns.data!.filter(pattern => pattern.author.id !== user!.id)];

  const header = (
    <Table.Tr>
      <Table.Th>Nome</Table.Th>
      <Table.Th>Publicado por</Table.Th>
      <Table.Th>Diversidade de espécies</Table.Th>
      <Table.Th w={60}></Table.Th>
    </Table.Tr>
  );

  const newPatternButton = (
    <Group justify="flex-end" pb="xs">
      <Button
        size="xs"
        leftSection={<IconPlus size={14} />}
        onClick={onCreate}
      >
        Novo padrão
      </Button>
    </Group>
  );

  const handleUnselect = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation();
    onUnselect?.();
  };

  const handlePreview = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, pattern: CroppingPatternReadData) => {
    e.stopPropagation();
    onPreview(pattern.id);
  };

  const selectionColor = 'var(--mantine-color-blue-light)';

  const Row = onSelect ? ClickableRow : Table.Tr;

  const rows = patterns.map((pattern) => {
    const isSelected = pattern.id === selectedPatternId;
    const backgroundColor = isSelected ? selectionColor : undefined;

    return <Row
      key={pattern.id}
      onClick={() => onSelect?.(pattern.id)}
      style={{'backgroundColor': backgroundColor, '--hover-color': selectionColor}}
    >
      <Table.Td>{pattern.name}</Table.Td>
      <Table.Td>
        <UserAvatar size="md" user={pattern.author}/>
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
          <Tooltip label="Ver detalhes">
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
    </Row>
  });
  
  rows.push(
    <Tooltip key={0} withArrow position="top" label="Clique para criar um novo padrão.">
      <AddRow colSpan={5} onClick={onCreate} style={{'--hover-color': selectionColor}}/>
    </Tooltip>
  );

  return (
    <Fragment>
      {newPatternButton}
      <StickyHeaderTable
        header={header}
        scrollWidth={600}
        scrollHeight={500}
      >
        {rows}
      </StickyHeaderTable>
    </Fragment>
  );
}

function distinctPlantCount(pattern: CroppingPatternReadData): number {
  const ids = new Set<number>();
  for (const row of pattern.rows)
    for (const crop of row.crops)
      ids.add(crop.plant.id);

  return ids.size;
}
