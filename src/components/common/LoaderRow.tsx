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

import { Loader, Table } from "@mantine/core";

interface LoaderRowProps {
  colSpan: number,
}

export default function LoaderRow({ colSpan }: LoaderRowProps) {
  return (
    <Table.Tr>
      <Table.Td colSpan={colSpan} align="center">
        <Loader/>
      </Table.Td>
    </Table.Tr>
  )
}