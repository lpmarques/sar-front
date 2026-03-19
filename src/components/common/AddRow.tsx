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

import { em, Group, Table } from "@mantine/core";
import ClickableRow, { ClickableRowProps } from "./ClickableRow";
import { IconCircleDashedPlus } from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";

interface AddRowProps extends Omit<ClickableRowProps, 'children'> {
  colSpan: number,
}

export default function AddRow({ colSpan, ...clickableRowProps }: AddRowProps) {
  const isMobile = useMediaQuery(`(max-width: ${em(500)})`);

  const iconsCount = isMobile ? Math.floor((colSpan-1)/3) || 1 : 1;
  const icons = [...Array(iconsCount)].map(() => (
    <IconCircleDashedPlus color="var(--mantine-color-gray-5)" size={35}/>
  ));

  return (
    <ClickableRow {...clickableRowProps}>
      <Table.Td colSpan={colSpan}>
        <Group justify="space-evenly" wrap="nowrap">
          {icons}
        </Group>
      </Table.Td>
    </ClickableRow>
  )
}