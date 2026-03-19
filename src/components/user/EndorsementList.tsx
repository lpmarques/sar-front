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

import { Table, Text } from '@mantine/core';
import { IconThumbUpFilled } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { getEndorsements, EndorsementReadData } from '../../apis/core';
import { QueryLoader } from '../common/QueryLoader';
import { useLanguage } from '../../hooks/useLanguage';
import { UserName } from '../user';

type EndorsementListProps = {
  contentId: number,
}

export default function EndorsementList({ contentId }: EndorsementListProps) {
  const endorsementsQueryOptions = {
    queryKey: ['endorsements', contentId.toString()],
    queryFn: getEndorsements,
  };
  const { data } = useQuery(endorsementsQueryOptions);

  return (
    <QueryLoader {...endorsementsQueryOptions}>
      {data &&
      <EndorsementsTable data={data} />}
    </QueryLoader>
  )
}

function EndorsementsTable({ data }: { data: EndorsementReadData[] }) {
  const { lang } = useLanguage();

  const sortedValues = data.sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );

  let rows = sortedValues.map((item: EndorsementReadData) => (
    <Table.Tr key={item.id}>
      <Table.Td>
        <IconThumbUpFilled />
      </Table.Td>
      <Table.Td>
        <UserName user={item.endorser!}/>
      </Table.Td>
      <Table.Td fz="md">{new Date(item.createdAt).toLocaleString(lang)}</Table.Td>
    </Table.Tr>
  ));

  if (rows.length === 0) {
    rows.push(
      <Table.Tr key={0}>
        <Table.Td colSpan={3}>
          <Text c="dimmed" fw={500} ta="center">
            Nenhum até o momento
          </Text>
        </Table.Td>
      </Table.Tr>
    )
  }

  return (
    <Table.ScrollContainer minWidth={200} maxHeight={220}>
      <Table withRowBorders>
        <Table.Tbody>
          {rows}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
